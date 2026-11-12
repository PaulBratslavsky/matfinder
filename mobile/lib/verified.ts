export const STALE_DAYS = 90;

/** `2026-09-15` → `Sep 15, 2026` (a plain date: no time zone shift). */
export function formatDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/** "Schedule verified Sep 15, 2026", with "(may be out of date)" after 90 days, or "Schedule not verified yet". */
export function verifiedLine(lastVerifiedAt: string | null, today: string | null): { text: string; stale: boolean } {
  if (!lastVerifiedAt) return { text: 'Schedule not verified yet', stale: false };
  const stale = !!today && (Date.parse(today) - Date.parse(lastVerifiedAt)) / 86_400_000 > STALE_DAYS;
  return { text: `Schedule verified ${formatDate(lastVerifiedAt)}${stale ? ' (may be out of date)' : ''}`, stale };
}

export const sourceLine = (addedFromWeb: boolean) =>
  addedFromWeb ? "Added by MatFinder's AI agent from the gym's web pages" : 'Added by the MatFinder team';
