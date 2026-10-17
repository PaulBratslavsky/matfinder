import type { ClaimRole, ClaimStatus } from './api/claims';

export const CLAIM_ROLES: { value: ClaimRole; label: string }[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'manager', label: 'Manager' },
  { value: 'head_instructor', label: 'Head instructor' },
  { value: 'staff', label: 'Staff' },
];

/** A phone number a person can call back: 7–15 digits, with spaces, dashes, dots, parentheses or a leading +. */
export function phoneProblem(phone: string): string | null {
  const v = phone.trim();
  if (!v) return 'Add a phone number so we can call you to confirm.';
  if (!/^[0-9+().\-\s]+$/.test(v)) return 'Use digits, spaces and + ( ) - only.';
  const digits = v.replace(/\D/g, '').length;
  if (digits < 7 || digits > 15) return 'That doesn’t look like a full phone number.';
  return null;
}

/** An open claim: sent and waiting for a call, or the admin has been in touch. */
export const isClaimOpen = (status: ClaimStatus | null | undefined) => status === 'pending' || status === 'contacted';

/** What to tell the owner when the server refuses a claim (ApiError.code). */
export function claimErrorMessage(code: string | undefined, fallback: string): string {
  switch (code) {
    case 'ALREADY_CLAIMED':
      return 'This gym has already been claimed by its owner. If that’s wrong, contact us.';
    case 'CLAIM_OPEN':
      return 'You already have a claim for this gym waiting for review.';
    case 'TOO_MANY_CLAIMS':
      return 'You have several claims waiting for review. We’ll get to them first.';
    default:
      return fallback;
  }
}
