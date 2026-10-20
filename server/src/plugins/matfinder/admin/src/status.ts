/** A gym's publish status, as the Gyms table and widget show it. */
export type GymStatus = 'published' | 'unpublished-changes' | 'never-published';

/** Labeled and colored like the Content Manager's own status column, where each gym opens. */
export const STATUS_LABELS: Record<GymStatus, { label: string; variant: 'success' | 'alternative' | 'secondary' }> = {
  published: { label: 'Published', variant: 'success' },
  'unpublished-changes': { label: 'Modified', variant: 'alternative' },
  'never-published': { label: 'Draft', variant: 'secondary' },
};

export const isGymStatus = (value: unknown): value is GymStatus => typeof value === 'string' && Object.hasOwn(STATUS_LABELS, value);

/** `2026-09-15` or an ISO timestamp → `Sep 15, 2026`; empty for null. */
export function formatDay(value: string | null | undefined): string {
  if (!value) return '';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00Z`) : new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/** The Content Manager edit view for one gym. */
export const editGymPath = (documentId: string) => `/content-manager/collection-types/api::school.school/${documentId}`;

/** The Content Manager's "create a gym" view. */
export const createGymPath = '/content-manager/collection-types/api::school.school/create';
