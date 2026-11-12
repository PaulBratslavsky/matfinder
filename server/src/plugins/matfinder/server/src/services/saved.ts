import type { Core } from '@strapi/strapi';
import { isUniqueViolation } from '../domain/errors';
import { fail, ok, type ServiceResult } from '../domain/result';

const SAVED = 'plugin::matfinder.saved-gym';
const SCHOOL = 'api::school.school';
export const MAX_SAVED_PER_USER = 200;

const docs = (strapi: Core.Strapi, uid: string) => strapi.documents(uid as any) as any;

/** Gyms a signed-in user saved: the app's "Saved gyms" list and the bookmark on a gym page. */
export default ({ strapi }: { strapi: Core.Strapi }) => {
  const saved = () => docs(strapi, SAVED);
  const published = (slug: string) => docs(strapi, SCHOOL).findFirst({ status: 'published', filters: { slug }, fields: ['slug'] });

  return {
    async list(user: { documentId: string }) {
      const rows = await saved().findMany({ filters: { userId: user.documentId }, fields: ['schoolDocumentId'], sort: 'createdAt:desc', limit: MAX_SAVED_PER_USER });
      const ids = rows.map((r: any) => r.schoolDocumentId);
      if (!ids.length) return { items: [] };
      const schools = await docs(strapi, SCHOOL).findMany({
        status: 'published',
        filters: { documentId: { $in: ids } },
        fields: ['slug', 'name', 'neighborhood'],
        populate: { city: { fields: ['slug', 'name'] } },
        limit: ids.length,
      });
      const byId = new Map(schools.map((s: any) => [s.documentId, s]));
      return {
        items: ids
          .map((id: string) => byId.get(id))
          .filter(Boolean)
          .map((s: any) => ({ slug: s.slug, name: s.name, neighborhood: s.neighborhood ?? null, city: s.city ? { slug: s.city.slug, name: s.city.name } : null })),
      };
    },

    async save(user: { documentId: string }, slug: string): Promise<ServiceResult<{ saved: true }>> {
      const school = await published(slug);
      if (!school) return fail(404, 'NOT_FOUND', 'No published gym with that slug.');
      if (await saved().findFirst({ filters: { userId: user.documentId, schoolDocumentId: school.documentId } })) return ok({ saved: true as const });
      if ((await saved().count({ filters: { userId: user.documentId } })) >= MAX_SAVED_PER_USER) {
        return fail(429, 'TOO_MANY_SAVED', `You can save at most ${MAX_SAVED_PER_USER} gyms.`);
      }
      try {
        await saved().create({ data: { userId: user.documentId, schoolDocumentId: school.documentId } });
      } catch (e) {
        if (!isUniqueViolation(e)) throw e; // a double tap: already saved
      }
      return ok({ saved: true as const });
    },

    async remove(user: { documentId: string }, slug: string): Promise<ServiceResult<{ saved: false }>> {
      const school = await docs(strapi, SCHOOL).findFirst({ status: 'draft', filters: { slug }, fields: ['slug'] });
      if (school) await strapi.db.query(SAVED as any).deleteMany({ where: { userId: user.documentId, schoolDocumentId: school.documentId } });
      return ok({ saved: false as const });
    },

    /** The user deleted their account (auth.ts beforeDelete, S13): all their saved gyms go. */
    async forgetUser(userDocumentId: string): Promise<{ deleted: number }> {
      const { count } = await strapi.db.query(SAVED as any).deleteMany({ where: { userId: userDocumentId } });
      return { deleted: count };
    },
  };
};
