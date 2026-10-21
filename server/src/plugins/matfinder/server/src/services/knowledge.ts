import type { Core } from '@strapi/strapi';
import type { KNOWLEDGE_CATEGORIES } from '../domain/knowledge';
import { ToolError } from '../domain/errors';
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
    let existing: { documentId: string } | null = null;
    if (input.id) {
      existing = await docs(strapi, KNOWLEDGE_UID).findOne({ documentId: input.id, status: 'draft', fields: ['question'] });
      if (!existing) throw new ToolError('NOT_FOUND', `No knowledge entry with id ${input.id}.`, { id: input.id });
    } else {
      existing = await docs(strapi, KNOWLEDGE_UID).findFirst({
        status: 'draft',
        filters: { question: { $eqi: question }, school: school ? { documentId: school.documentId } : { id: { $null: true } } },
        fields: ['question'],
      });
    }

    const data = {
      question,
      answer: input.answer.trim(),
      category: input.category,
      school: school ? { set: [school.documentId] } : { set: [] },
      source: input.source,
      sourceUrls: input.sourceUrls?.length ? input.sourceUrls : null,
    };
    const saved = existing
      ? await docs(strapi, KNOWLEDGE_UID).update({ documentId: existing.documentId, status: 'draft', data })
      : await docs(strapi, KNOWLEDGE_UID).create({ data });
    const live = (await strapi.plugin('matfinder').service('publishing').afterWriteDocument(KNOWLEDGE_UID, saved.documentId)) as AfterWrite;
    return { id: saved.documentId, created: !existing, schoolSlug: input.schoolSlug, question, ...live };
  },
});
