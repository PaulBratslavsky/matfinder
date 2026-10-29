import type { Core, UID } from '@strapi/strapi';
import { draftStatus, type DraftStatus } from './drafts';
import { sameJson } from './equal';
import { isUniqueViolation, ToolError } from './errors';
import { slugifyWithFallback } from './slugify';

export type UpsertResult = { documentId: string; slug: string; created: boolean; changedFields: string[]; status: DraftStatus; previousStatus?: DraftStatus };

/** Draft status of one document, from its draft and published rows. */
export async function statusOf(strapi: Core.Strapi, uid: UID.ContentType, documentId: string): Promise<DraftStatus> {
  const docs = strapi.documents(uid) as any;
  const draft = await docs.findOne({ documentId, status: 'draft', fields: ['updatedAt'] });
  const published = await docs.findOne({ documentId, status: 'published', fields: ['updatedAt'] });
  return draftStatus(draft, published);
}

/**
 * Create or partially update a DRAFT of a type with only scalar fields (instructor, affiliation), keyed by slug.
 * Only the provided `fields` are written. Create, catch, refetch: if a concurrent create wins the slug, the retry
 * finds that document by slug and updates it instead.
 */
export async function upsertScalarDraft(
  strapi: Core.Strapi,
  opts: {
    uid: UID.ContentType;
    type: string;
    fields: string[];
    requiredOnCreate: string[];
    /** Per-field normalization matching what the Document Service middlewares store, applied before comparing. */
    normalize?: Record<string, (value: unknown) => unknown>;
  },
  input: Record<string, unknown> & { slug?: string; name?: string },
): Promise<UpsertResult> {
  const docs = strapi.documents(opts.uid) as any;

  const once = async (): Promise<UpsertResult> => {
    const slug = input.slug ?? (input.name ? slugifyWithFallback(input.name, opts.type) : undefined);
    if (!slug) throw new ToolError('VALIDATION_ERROR', `send the slug of an existing ${opts.type}, or a name to create one`, { path: ['name'] });
    const existing = await docs.findFirst({ filters: { slug }, status: 'draft' });
    if (!existing) {
      for (const field of opts.requiredOnCreate) {
        if (input[field] === undefined || input[field] === null || input[field] === '') {
          throw new ToolError('VALIDATION_ERROR', `required to create ${/^[aeiou]/.test(opts.type) ? 'an' : 'a'} ${opts.type}`, { path: [field] });
        }
      }
    }
    const data: Record<string, unknown> = {};
    for (const field of opts.fields) {
      if (input[field] === undefined) continue;
      const value = opts.normalize?.[field] ? opts.normalize[field](input[field]) : input[field];
      if (!sameJson(value, existing?.[field])) data[field] = value;
    }
    const changedFields = Object.keys(data);
    const previousStatus = existing ? await statusOf(strapi, opts.uid, existing.documentId) : undefined;
    const doc = existing
      ? changedFields.length
        ? await docs.update({ documentId: existing.documentId, data })
        : existing
      : await docs.create({ data: { ...data, slug } });
    return { documentId: doc.documentId, slug: doc.slug, created: !existing, changedFields, status: await statusOf(strapi, opts.uid, doc.documentId), previousStatus };
  };

  const run = () => strapi.db.transaction(once);
  try {
    return await run();
  } catch (e) {
    if (isUniqueViolation(e)) return run();
    throw e;
  }
}
