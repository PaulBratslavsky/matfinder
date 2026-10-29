import type { Core } from '@strapi/strapi';
import { MAX_OPEN_PER_USER, OPEN, nextStatus, type ClaimAction, type ClaimStatus } from '../domain/claims';
import { fail, ok, type ServiceResult } from '../domain/result';
import { isUniqueViolation } from '../domain/errors';

const CLAIM = 'plugin::matfinder.claim';
const SCHOOL = 'api::school.school';

export type ClaimRole = 'owner' | 'manager' | 'head_instructor' | 'staff';
export type ClaimUser = { documentId: string; name?: string | null; email?: string | null };
export type NewClaim = { schoolSlug: string; role: ClaimRole; phone: string; message?: string; name?: string };

/** What the admin sees for one claim. */
const ADMIN_FIELDS = [
  'schoolDocumentId',
  'schoolSlug',
  'schoolName',
  'name',
  'email',
  'phone',
  'role',
  'message',
  'status',
  'adminNote',
  'handledBy',
  'contactedAt',
  'decidedAt',
  'createdAt',
] as const;

const docs = (strapi: Core.Strapi, uid: string) => strapi.documents(uid as any) as any;
const adminName = (admin?: { firstname?: string | null; lastname?: string | null; email?: string | null }) =>
  [admin?.firstname, admin?.lastname].filter(Boolean).join(' ') || admin?.email || 'an admin';

/** Thrown inside act()'s transaction when the claim changed after it was read, so every write rolls back. */
class ClaimChanged extends Error {}

/**
 * Gym owners' claims: made in the app by a signed-in owner, then reviewed by hand in the admin (contact them, accept or
 * reject). An accepted claim marks the gym as claimed; the owner's details never leave the admin.
 */
export default ({ strapi }: { strapi: Core.Strapi }) => {
  const claims = () => docs(strapi, CLAIM);

  async function acceptedFor(schoolDocumentId: string) {
    return claims().findFirst({ filters: { schoolDocumentId, status: 'accepted' }, fields: ['name'] });
  }

  return {
    /** A signed-in user asks to claim a published gym. */
    async create(user: ClaimUser, input: NewClaim): Promise<ServiceResult<{ status: ClaimStatus }>> {
      const school = await docs(strapi, SCHOOL).findFirst({ status: 'published', filters: { slug: input.schoolSlug }, fields: ['slug', 'name'] });
      if (!school) return fail(404, 'NOT_FOUND', 'No published gym with that slug.');
      if (await acceptedFor(school.documentId)) return fail(409, 'ALREADY_CLAIMED', 'This gym has already been claimed by its owner.');
      const mine = await claims().findFirst({ filters: { schoolDocumentId: school.documentId, userId: user.documentId, status: { $in: OPEN } } });
      if (mine) return fail(409, 'CLAIM_OPEN', 'You already have a claim for this gym waiting for review.');
      const open = await claims().count({ filters: { userId: user.documentId, status: { $in: OPEN } } });
      if (open >= MAX_OPEN_PER_USER) return fail(429, 'TOO_MANY_CLAIMS', `You can have at most ${MAX_OPEN_PER_USER} claims waiting for review.`);
      if (!user.email) return fail(422, 'VALIDATION_ERROR', 'Your account has no email address.');

      try {
        await claims().create({
          data: {
            schoolDocumentId: school.documentId,
            schoolSlug: school.slug,
            schoolName: school.name,
            userId: user.documentId,
            name: input.name?.trim() || user.name || user.email,
            email: user.email,
            phone: input.phone.trim(),
            role: input.role,
            message: input.message?.trim() || null,
            status: 'pending',
          },
        });
      } catch (e) {
        // Two taps at once: the open-claim index (matfinder_claims_open_uq) lets only one through.
        if (isUniqueViolation(e)) return fail(409, 'CLAIM_OPEN', 'You already have a claim for this gym waiting for review.');
        throw e;
      }
      return ok({ status: 'pending' as ClaimStatus });
    },

    /** The user's latest claim on a gym, for the app ("Your claim is being reviewed"). Keyed by the gym's
     *  documentId, so the claim still shows after the gym's slug changes (B-12). */
    async mine(user: ClaimUser, schoolSlug: string) {
      const school = await docs(strapi, SCHOOL).findFirst({ status: 'published', filters: { slug: schoolSlug }, fields: ['slug'] });
      if (!school) return { status: null, createdAt: null };
      const latest = await claims().findFirst({
        filters: { schoolDocumentId: school.documentId, userId: user.documentId },
        sort: 'createdAt:desc',
        fields: ['status', 'createdAt'],
      });
      return { status: (latest?.status as ClaimStatus) ?? null, createdAt: latest?.createdAt ?? null };
    },

    /** The admin board, newest first. */
    async list(status?: ClaimStatus) {
      const items = await claims().findMany({
        filters: status ? { status } : {},
        fields: [...ADMIN_FIELDS],
        sort: 'createdAt:desc',
        limit: 500,
      });
      return { items: items.map(({ id, ...rest }: any) => rest) };
    },

    /** Counts and the newest open claims, for the widget and the tab badge. */
    async summary() {
      const [pending, contacted, claimed, newest] = await Promise.all([
        claims().count({ filters: { status: 'pending' } }),
        claims().count({ filters: { status: 'contacted' } }),
        claims().count({ filters: { status: 'accepted' } }),
        claims().findMany({ filters: { status: { $in: OPEN } }, fields: ['schoolName', 'name', 'role', 'status', 'createdAt'], sort: 'createdAt:desc', limit: 5 }),
      ]);
      return { pending, contacted, claimed, newest: newest.map(({ id, ...rest }: any) => rest) };
    },

    /**
     * Moves a claim along (see domain/claims.ts). Accepting closes the gym's other open claims. The claim is read
     * inside the transaction and written only if its status is still the one read; otherwise everything rolls back
     * (409 INVALID_STATE). A second accept on the same gym hits matfinder_claims_accepted_uq (409 ALREADY_CLAIMED).
     */
    async act(documentId: string, action: ClaimAction, opts: { note?: string; admin?: any }): Promise<ServiceResult<{ status: ClaimStatus }>> {
      const now = new Date().toISOString();
      const note = opts.note?.trim();
      const handledBy = adminName(opts.admin);
      try {
        return await strapi.db.transaction(async () => {
          const claim = await claims().findOne({ documentId, fields: ['status', 'schoolDocumentId', 'adminNote'] });
          if (!claim) return fail(404, 'NOT_FOUND', 'No claim with that id.');
          const to = nextStatus(claim.status, action);
          if (!to) return fail(409, 'INVALID_STATE', `A ${claim.status} claim can't be ${action === 'contacted' ? 'marked contacted' : `${action}ed`}.`);
          // Rejecting a claim or removing an owner needs a reason, for the record.
          if ((action === 'reject' || action === 'remove-owner') && !note) {
            return fail(422, 'VALIDATION_ERROR', action === 'reject' ? 'Say why the claim is rejected.' : 'Say why the owner is removed.');
          }

          if (action === 'accept') {
            const other = await acceptedFor(claim.schoolDocumentId);
            if (other && other.documentId !== documentId) return fail(409, 'ALREADY_CLAIMED', 'This gym already has an accepted claim. Remove that owner first.');
            const rivals = await claims().findMany({
              filters: { schoolDocumentId: claim.schoolDocumentId, status: { $in: OPEN }, documentId: { $ne: documentId } },
              fields: ['status'],
            });
            for (const r of rivals) {
              await claims().update({ documentId: r.documentId, data: { status: 'rejected', decidedAt: now, adminNote: 'Another claim was accepted.', handledBy } });
            }
          }
          // Conditional write: only if the status is still the one read above.
          const { count } = await strapi.db.query(CLAIM as any).updateMany({
            where: { documentId, status: claim.status },
            data: {
              status: to,
              handledBy,
              ...(action === 'contacted' ? { contactedAt: now } : { decidedAt: now }),
              ...(note ? { adminNote: claim.adminNote ? `${claim.adminNote}\n${note}` : note } : {}),
              updatedAt: now,
            },
          });
          if (count === 0) throw new ClaimChanged();
          return ok({ status: to });
        });
      } catch (e) {
        if (e instanceof ClaimChanged) return fail(409, 'INVALID_STATE', 'Someone else just changed this claim. Reload and try again.');
        if (isUniqueViolation(e)) return fail(409, 'ALREADY_CLAIMED', 'This gym already has an accepted claim. Remove that owner first.');
        // Postgres: two admins accepting rival claims at once can lock each other's rows; one transaction is
        // aborted as a deadlock (40P01). Nothing was written, so it's the same answer as ClaimChanged.
        if ((e as { code?: string } | null)?.code === '40P01') return fail(409, 'INVALID_STATE', 'Someone else just changed this claim. Reload and try again.');
        throw e;
      }
    },

    /** Of these gyms, the ones with an accepted claim: the public `claimed` flag. At most one accepted claim per
     *  gym (matfinder_claims_accepted_uq), so each chunk needs at most chunk.length rows. */
    async claimedAmong(schoolDocumentIds: string[]): Promise<Set<string>> {
      const out = new Set<string>();
      const ids = Array.from(new Set(schoolDocumentIds));
      for (let i = 0; i < ids.length; i += 500) {
        const chunk = ids.slice(i, i + 500);
        const rows = await claims().findMany({
          filters: { schoolDocumentId: { $in: chunk }, status: 'accepted' },
          fields: ['schoolDocumentId'],
          limit: chunk.length,
        });
        for (const r of rows) out.add(r.schoolDocumentId);
      }
      return out;
    },

    /** Per gym, for the admin Gyms table: the owner (if accepted) and how many claims are open. */
    async byGym(schoolDocumentIds: string[]): Promise<Record<string, { owner: string | null; ownerClaim: string | null; open: number }>> {
      if (!schoolDocumentIds.length) return {};
      const rows = await claims().findMany({
        filters: { schoolDocumentId: { $in: schoolDocumentIds }, status: { $in: [...OPEN, 'accepted'] } },
        fields: ['schoolDocumentId', 'status', 'name'],
        limit: 10000,
      });
      const out: Record<string, { owner: string | null; ownerClaim: string | null; open: number }> = {};
      for (const r of rows) {
        const g = (out[r.schoolDocumentId] ??= { owner: null, ownerClaim: null, open: 0 });
        if (r.status === 'accepted') {
          g.owner = r.name;
          g.ownerClaim = r.documentId;
        } else g.open += 1;
      }
      return out;
    },

    /**
     * Run before matfinder_claims_open_uq is created (bootstrap): of several open claims by one person on one gym,
     * keep the newest and close the rest as rejected, with a note. Returns how many it closed. Safe on every boot.
     * Two accepted claims on one gym are NOT fixed here: a person decides, so the index fails and B-7's rule applies.
     */
    async closeDuplicateOpenClaims(): Promise<number> {
      const rows = await strapi.db.query(CLAIM as any).findMany({
        where: { status: { $in: OPEN } },
        select: ['id', 'schoolDocumentId', 'userId', 'adminNote'],
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });
      const seen = new Set<string>();
      const now = new Date().toISOString();
      const note = 'Closed automatically: the same person has a newer open claim for this gym.';
      let closed = 0;
      for (const r of rows) {
        const key = `${r.schoolDocumentId}|${r.userId}`;
        if (!seen.has(key)) {
          seen.add(key);
          continue;
        }
        await strapi.db.query(CLAIM as any).update({
          where: { id: r.id },
          data: { status: 'rejected', decidedAt: now, handledBy: 'MatFinder (automatic)', adminNote: r.adminNote ? `${r.adminNote}\n${note}` : note, updatedAt: now },
        });
        closed += 1;
      }
      if (closed) strapi.log.warn(`[matfinder] closed ${closed} duplicate open claim(s) before adding matfinder_claims_open_uq`);
      return closed;
    },
  };
};
