import type { Core } from '@strapi/strapi';
import { isUniqueViolation } from '../domain/errors';
import { MAX_OPEN_REPORTS_PER_USER, type ReportKind, type ReportStatus } from '../domain/reports';
import { fail, ok, type ServiceResult } from '../domain/result';

const REPORT = 'plugin::matfinder.report';
const SCHOOL = 'api::school.school';
const ADMIN_FIELDS = ['schoolDocumentId', 'schoolSlug', 'schoolName', 'kind', 'message', 'status', 'adminNote', 'resolvedBy', 'resolvedAt', 'createdAt'] as const;

export type ReportUser = { documentId: string };
export type NewReport = { schoolSlug: string; kind: ReportKind; message?: string };

const docs = (strapi: Core.Strapi, uid: string) => strapi.documents(uid as any) as any;
const adminName = (admin?: { firstname?: string | null; lastname?: string | null; email?: string | null }) =>
  [admin?.firstname, admin?.lastname].filter(Boolean).join(' ') || admin?.email || 'an admin';

/** "Something's wrong with this gym": made in the app by a signed-in user, resolved by hand in the admin. */
export default ({ strapi }: { strapi: Core.Strapi }) => {
  const reports = () => docs(strapi, REPORT);
  const REPORT_OPEN = fail(409, 'REPORT_OPEN', 'You already reported a problem with this gym. We’ll look at it soon.');

  return {
    async create(user: ReportUser, input: NewReport): Promise<ServiceResult<{ status: ReportStatus }>> {
      const school = await docs(strapi, SCHOOL).findFirst({ status: 'published', filters: { slug: input.schoolSlug }, fields: ['slug', 'name'] });
      if (!school) return fail(404, 'NOT_FOUND', 'No published gym with that slug.');
      if (await reports().findFirst({ filters: { schoolDocumentId: school.documentId, userId: user.documentId, status: 'open' } })) return REPORT_OPEN;
      const open = await reports().count({ filters: { userId: user.documentId, status: 'open' } });
      if (open >= MAX_OPEN_REPORTS_PER_USER) return fail(429, 'TOO_MANY_REPORTS', `You can have at most ${MAX_OPEN_REPORTS_PER_USER} open reports.`);
      try {
        await reports().create({
          data: {
            schoolDocumentId: school.documentId,
            schoolSlug: school.slug,
            schoolName: school.name,
            userId: user.documentId,
            kind: input.kind,
            message: input.message?.trim() || null,
            status: 'open',
          },
        });
      } catch (e) {
        // The partial unique index (server/src/lib/indexes.ts) catches a double tap the check above missed.
        if (isUniqueViolation(e)) return REPORT_OPEN;
        throw e;
      }
      return ok({ status: 'open' as ReportStatus });
    },

    /** The admin board, newest first. */
    async list(status?: ReportStatus) {
      const items = await reports().findMany({ filters: status ? { status } : {}, fields: [...ADMIN_FIELDS], sort: 'createdAt:desc', limit: 500 });
      return { items: items.map(({ id, ...rest }: any) => rest) };
    },

    /** Open count, for the tab badge (in the plugin's /summary). */
    async summary() {
      return { open: await reports().count({ filters: { status: 'open' } }) };
    },

    /** open → resolved, once: the conditional update refuses a report another admin resolved first. */
    async resolve(documentId: string, opts: { note?: string; admin?: any }): Promise<ServiceResult<{ status: ReportStatus }>> {
      const report = await reports().findOne({ documentId, fields: ['status'] });
      if (!report) return fail(404, 'NOT_FOUND', 'No report with that id.');
      const note = opts.note?.trim();
      const { count } = await strapi.db.query(REPORT as any).updateMany({
        where: { documentId, status: 'open' },
        // The query engine doesn't set updatedAt itself (unlike the Document Service), so it's set here, as in S3.
        data: { status: 'resolved', resolvedAt: new Date(), updatedAt: new Date(), resolvedBy: adminName(opts.admin), ...(note ? { adminNote: note } : {}) },
      });
      if (!count) return fail(409, 'INVALID_STATE', 'This report is already resolved.');
      return ok({ status: 'resolved' as ReportStatus });
    },

    /**
     * The user deleted their account (auth.ts beforeDelete, S13): their open reports are deleted, and resolved ones
     * are kept for the curator's history with the reporter unlinked. Query engine, so the placeholder skips
     * validation.
     */
    async forgetUser(userDocumentId: string): Promise<{ deleted: number; unlinked: number }> {
      const q = strapi.db.query(REPORT as any);
      const { count: deleted } = await q.deleteMany({ where: { userId: userDocumentId, status: 'open' } });
      const { count: unlinked } = await q.updateMany({ where: { userId: userDocumentId }, data: { userId: 'deleted-account', updatedAt: new Date() } });
      return { deleted, unlinked };
    },
  };
};
