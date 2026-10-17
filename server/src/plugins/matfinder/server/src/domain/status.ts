/** How a draft-and-publish document relates to its published version (the app's rule in server/src/lib/drafts.ts). */
export type DraftStatus = 'published' | 'unpublished-changes' | 'never-published';

/** A draft saved after its published version was created has unpublished changes (the admin's rule too). */
export function draftStatus(draft: { updatedAt: string | Date }, published?: { updatedAt: string | Date } | null): DraftStatus {
  if (!published) return 'never-published';
  return new Date(draft.updatedAt).getTime() > new Date(published.updatedAt).getTime() ? 'unpublished-changes' : 'published';
}
