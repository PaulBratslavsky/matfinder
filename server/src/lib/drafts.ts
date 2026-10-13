import type { Core, UID } from '@strapi/strapi';
import { sameJson } from './equal';

/** How a draft-and-publish document relates to its published version. */
export type DraftStatus = 'published' | 'unpublished-changes' | 'never-published';

const SYSTEM_FIELDS = new Set(['id', 'documentId', 'createdAt', 'updatedAt', 'publishedAt', 'locale', 'createdBy', 'updatedBy', 'localizations']);

type Row = { documentId: string; updatedAt: string | Date; [key: string]: any };

/** A draft saved after its published version was created has unpublished changes (the admin's rule too). */
export function draftStatus(draft: Pick<Row, 'updatedAt'>, published?: Pick<Row, 'updatedAt'> | null): DraftStatus {
  if (!published) return 'never-published';
  return new Date(draft.updatedAt).getTime() > new Date(published.updatedAt).getTime() ? 'unpublished-changes' : 'published';
}

function stripIds(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripIds);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value).filter(([k]) => k !== 'id').map(([k, v]) => [k, stripIds(v)]));
  }
  return value;
}

/** A comparable form of one attribute's value: components without ids, relations as documentIds, media as ids. */
function normalize(value: unknown, attribute: { type: string }): unknown {
  if (value === undefined || value === null || value === '') return null;
  const list = (v: unknown) => (Array.isArray(v) ? v : [v]);
  switch (attribute.type) {
    case 'component':
    case 'dynamiczone':
      return stripIds(value);
    case 'relation':
      return list(value).map((v: any) => v?.documentId ?? v);
    case 'media':
      return list(value).map((v: any) => v?.id ?? v);
    default:
      return value;
  }
}

const isEmpty = (v: unknown) =>
  v === null || (Array.isArray(v) && v.length === 0) || (typeof v === 'object' && v !== null && Object.keys(v).length === 0);

/**
 * Top-level attributes that differ between a draft and its published version (both loaded with `populate: '*'`).
 * For a never-published draft, every attribute that has a value.
 */
export function changedFields(attributes: Record<string, { type: string }>, draft: Row, published?: Row | null): string[] {
  return Object.entries(attributes)
    .filter(([name]) => !SYSTEM_FIELDS.has(name))
    .filter(([name, attribute]) => {
      const d = normalize(draft[name], attribute);
      if (!published) return !isEmpty(d);
      return !sameJson(d, normalize(published[name], attribute));
    })
    .map(([name]) => name);
}

export type PendingDraft = { slug: string; name: string; status: DraftStatus; updatedAt: string; changedFields: string[] };

/** Never-published documents and documents with unpublished changes, newest first. */
export async function pendingDrafts(strapi: Core.Strapi, uid: UID.ContentType, limit: number): Promise<PendingDraft[]> {
  const docs = strapi.documents(uid) as any;
  const all = async (status: 'draft' | 'published', fields: string[]) => {
    const rows: Row[] = [];
    for (let start = 0; ; start += 500) {
      const page: Row[] = await docs.findMany({ status, fields, limit: 500, start });
      rows.push(...page);
      if (page.length < 500) return rows;
    }
  };
  const published = new Map((await all('published', ['updatedAt'])).map((r) => [r.documentId, r]));
  const candidates = (await all('draft', ['slug', 'name', 'updatedAt']))
    .map((draft) => ({ draft, status: draftStatus(draft, published.get(draft.documentId)) }))
    .filter(({ status }) => status !== 'published')
    .sort((a, b) => new Date(b.draft.updatedAt).getTime() - new Date(a.draft.updatedAt).getTime())
    .slice(0, limit);

  const attributes = strapi.getModel(uid).attributes as Record<string, { type: string }>;
  const result: PendingDraft[] = [];
  for (const { draft, status } of candidates) {
    const full = await docs.findOne({ documentId: draft.documentId, status: 'draft', populate: '*' });
    const pub = status === 'never-published' ? null : await docs.findOne({ documentId: draft.documentId, status: 'published', populate: '*' });
    result.push({
      slug: draft.slug,
      name: draft.name,
      status,
      updatedAt: new Date(draft.updatedAt).toISOString(),
      changedFields: changedFields(attributes, full, pub),
    });
  }
  return result;
}
