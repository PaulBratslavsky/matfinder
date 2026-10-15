import { apiGet, apiPost } from './client';

export type ClaimRole = 'owner' | 'manager' | 'head_instructor' | 'staff';
export type ClaimStatus = 'pending' | 'contacted' | 'accepted' | 'rejected' | 'withdrawn';
export type NewClaim = { schoolSlug: string; role: ClaimRole; phone: string; message?: string; name?: string };

/** Ask to claim a gym (MatFinder plugin, account only). Throws ApiError with code ALREADY_CLAIMED, CLAIM_OPEN… */
export function createClaim(claim: NewClaim): Promise<{ status: ClaimStatus }> {
  return apiPost('/api/matfinder/claims', claim);
}

/** The signed-in user's latest claim on a gym, or `status: null`. */
export function getMyClaim(schoolSlug: string): Promise<{ status: ClaimStatus | null; createdAt: string | null }> {
  return apiGet('/api/matfinder/claims/mine', { school: schoolSlug });
}
