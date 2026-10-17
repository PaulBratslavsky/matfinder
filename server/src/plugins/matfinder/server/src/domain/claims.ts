/**
 * The claim states and what may happen next. Pure, so the rules are unit-tested apart from Strapi.
 *
 *   pending → contacted → accepted | rejected
 *   pending → accepted | rejected
 *   accepted → withdrawn (an admin removes the owner)
 */
export type ClaimStatus = 'pending' | 'contacted' | 'accepted' | 'rejected' | 'withdrawn';
export type ClaimAction = 'contacted' | 'accept' | 'reject' | 'remove-owner';

export const OPEN: ClaimStatus[] = ['pending', 'contacted'];
export const isOpen = (s: ClaimStatus) => OPEN.includes(s);

/** At most this many open claims per user (stops someone claiming the whole directory). */
export const MAX_OPEN_PER_USER = 5;

const NEXT: Record<ClaimAction, { from: ClaimStatus[]; to: ClaimStatus }> = {
  contacted: { from: ['pending'], to: 'contacted' },
  accept: { from: ['pending', 'contacted'], to: 'accepted' },
  reject: { from: ['pending', 'contacted'], to: 'rejected' },
  'remove-owner': { from: ['accepted'], to: 'withdrawn' },
};

/** The status after `action`, or null when it can't happen from `status`. */
export function nextStatus(status: ClaimStatus, action: ClaimAction): ClaimStatus | null {
  const rule = NEXT[action];
  return rule.from.includes(status) ? rule.to : null;
}

export const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  manager: 'Manager',
  head_instructor: 'Head instructor',
  staff: 'Staff',
};
