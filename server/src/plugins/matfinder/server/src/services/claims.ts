import type { Core } from '@strapi/strapi';
import { MAX_OPEN_PER_USER, OPEN, nextStatus, type ClaimAction, type ClaimStatus } from '../domain/claims';
import { fail, ok, type ServiceResult } from '../domain/result';

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
      return ok({ status: 'pending' as ClaimStatus });
    },

    /** The user's latest claim on a gym, for the app ("Your claim is being reviewed"). */
    async mine(user: ClaimUser, schoolSlug: string) {
      const latest = await claims().findFirst({ filters: { schoolSlug, userId: user.documentId }, sort: 'createdAt:desc', fields: ['status', 'createdAt'] });
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

    /** Moves a claim along (see domain/claims.ts). Accepting closes the gym's other open claims. */
    async act(documentId: string, action: ClaimAction, opts: { note?: string; admin?: any }): Promise<ServiceResult<{ status: ClaimStatus }>> {
      const claim = await claims().findOne({ documentId, fields: ['status', 'schoolDocumentId', 'adminNote'] });
      if (!claim) return fail(404, 'NOT_FOUND', 'No claim with that id.');
      const to = nextStatus(claim.status, action);
      if (!to) return fail(409, 'INVALID_STATE', `A ${claim.status} claim can't be ${action === 'contacted' ? 'marked contacted' : `${action}ed`}.`);
      // Rejecting a claim or removing an owner needs a reason, for the record.
      if ((action === 'reject' || action === 'remove-owner') && !opts.note?.trim()) {
        return fail(422, 'VALIDATION_ERROR', action === 'reject' ? 'Say why the claim is rejected.' : 'Say why the owner is removed.');
      }

      const now = new Date().toISOString();
      const note = opts.note?.trim();
      return strapi.db.transaction(async () => {
        if (action === 'accept') {
          const other = await acceptedFor(claim.schoolDocumentId);
          if (other && other.documentId !== documentId) return fail(409, 'ALREADY_CLAIMED', 'This gym already has an accepted claim. Remove that owner first.');
          const rivals = await claims().findMany({
            filters: { schoolDocumentId: claim.schoolDocumentId, status: { $in: OPEN }, documentId: { $ne: documentId } },
            fields: ['status'],
          });
          for (const r of rivals) {
            await claims().update({ documentId: r.documentId, data: { status: 'rejected', decidedAt: now, adminNote: 'Another claim was accepted.', handledBy: adminName(opts.admin) } });
          }
        }
        await claims().update({
          documentId,
          data: {
            status: to,
            handledBy: adminName(opts.admin),
            ...(action === 'contacted' ? { contactedAt: now } : { decidedAt: now }),
            ...(note ? { adminNote: claim.adminNote ? `${claim.adminNote}\n${note}` : note } : {}),
          },
        });
        return ok({ status: to });
      });
    },

    /** documentIds of gyms with an accepted claim: the public `claimed` flag. */
    async claimedSchoolIds(): Promise<Set<string>> {
      const rows = await claims().findMany({ filters: { status: 'accepted' }, fields: ['schoolDocumentId'], limit: 10000 });
      return new Set(rows.map((r: any) => r.schoolDocumentId));
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
  };
};
