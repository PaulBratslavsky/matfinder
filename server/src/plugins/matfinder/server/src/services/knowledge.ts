import type { Core } from '@strapi/strapi';
import { knowledgeKey, type KNOWLEDGE_CATEGORIES } from '../domain/knowledge';
import { isUniqueViolation, ToolError } from '../domain/errors';
import type { DraftStatus } from '../domain/status';
import type { AfterWrite } from './publishing';

export const KNOWLEDGE_UID = 'plugin::matfinder.knowledge';

export type KnowledgeInput = {
  /** An entry's documentId: update it. Without it, the entry with the same gym and question is updated, or one is made. */
  id?: string;
  /** The gym it's about, or null for every gym. */
  schoolSlug: string | null;
  question: string;
  answer: string;
  category: (typeof KNOWLEDGE_CATEGORIES)[number];
  source: 'admin' | 'owner' | 'agent' | 'question';
  sourceUrls?: string[];
};

export type KnowledgeResult = { id: string; created: boolean; schoolSlug: string | null; question: string } & AfterWrite;

const docs = (strapi: Core.Strapi, uid: string) => strapi.documents(uid as any) as any;

/** The gym knowledge base (plan 09): written by agents through MCP, and by admins in the Content Manager. */
export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /** Creates or updates one entry's draft, then publishes it like every agent write (publishing.afterWriteDocument). */
  async upsert(input: KnowledgeInput): Promise<KnowledgeResult> {
    let school: { documentId: string } | null = null;
    if (input.schoolSlug) {
      school = await docs(strapi, 'api::school.school').findFirst({ status: 'draft', filters: { slug: input.schoolSlug }, fields: ['slug'] });
      if (!school) throw new ToolError('NOT_FOUND', `No gym with slug ${input.schoolSlug}. Find it with find_schools.`, { schoolSlug: input.schoolSlug });
    }

    const question = input.question.trim();
    const key = knowledgeKey(school?.documentId ?? null, question);
    const entries = docs(strapi, KNOWLEDGE_UID);
    const byKey = () => entries.findFirst({ status: 'draft', filters: { dedupeKey: key }, fields: ['question'] });

    let existing: { documentId: string; question: string } | null = null;
    if (input.id) {
      existing = await entries.findOne({ documentId: input.id, status: 'draft', fields: ['question'] });
      if (!existing) throw new ToolError('NOT_FOUND', `No knowledge entry with id ${input.id}.`, { id: input.id });
    } else {
      existing =
        (await byKey()) ??
        // The same gym and question, whatever its key: entries without a key yet (seeded, made in the admin, older),
        // and entries whose question an admin renamed after the key was written. Saving below re-keys the row.
        (await entries.findFirst({
          status: 'draft',
          filters: { question: { $eqi: question }, school: school ? { documentId: school.documentId } : { id: { $null: true } } },
          fields: ['question'],
        }));
    }

    const data = {
      question,
      answer: input.answer.trim(),
      category: input.category,
      school: school ? { set: [school.documentId] } : { set: [] },
      source: input.source,
      sourceUrls: input.sourceUrls?.length ? input.sourceUrls : null,
      dedupeKey: key,
    };
    const save = (target: { documentId: string } | null) =>
      target ? entries.update({ documentId: target.documentId, status: 'draft', data }) : entries.create({ data });

    const publishing = strapi.plugin('matfinder').service('publishing');
    let target = existing;
    let previousStatus: DraftStatus | undefined = target ? await publishing.statusOf(KNOWLEDGE_UID, target.documentId) : undefined;
    let saved;
    try {
      saved = await save(target);
    } catch (e) {
      if (!isUniqueViolation(e)) throw e;
      // Another entry holds this key: a parallel create won (update it), or an admin renamed that entry's question
      // after the key was written (a stale key: release it, then retry the same write).
      const holder = await byKey();
      if (!holder) throw e;
      if (holder.question.trim().normalize('NFKC').toLowerCase() === question.normalize('NFKC').toLowerCase()) {
        target = holder;
        previousStatus = await publishing.statusOf(KNOWLEDGE_UID, holder.documentId);
      } else {
        await strapi.db.query(KNOWLEDGE_UID as any).updateMany({ where: { documentId: holder.documentId, publishedAt: { $null: true } }, data: { dedupeKey: null } });
      }
      saved = await save(target);
    }
    const live = (await publishing.afterWriteDocument(KNOWLEDGE_UID, saved.documentId, previousStatus)) as AfterWrite;
    return { id: saved.documentId, created: !target, schoolSlug: input.schoolSlug, question, ...live };
  },
});
