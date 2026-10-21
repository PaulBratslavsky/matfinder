import type { Core } from '@strapi/strapi';
import { draftStatus, type DraftStatus } from '../domain/status';

const docs = (strapi: Core.Strapi, uid: string) => strapi.documents(uid as any) as any;

/** Where a document stands after an agent write. */
export type AfterWrite = { status: DraftStatus; notPublishedBecause?: string };

/**
 * Agent writes go live: after each MCP write the document's draft is published, unless the plugin's `autoPublish`
 * config (MATFINDER_AUTO_PUBLISH) is off, in which case they stay drafts for a person to review.
 */
export default ({ strapi }: { strapi: Core.Strapi }) => {
  async function statusOf(uid: string, documentId: string): Promise<DraftStatus> {
    const draft = await docs(strapi, uid).findOne({ documentId, status: 'draft', fields: ['updatedAt'] });
    const published = await docs(strapi, uid).findOne({ documentId, status: 'published', fields: ['updatedAt'] });
    return draftStatus(draft, published);
  }

  const autoPublish = () => (strapi.plugin('matfinder').config('autoPublish', true) as boolean) !== false;

  /** Publishes a document's draft when it differs from the live version, and reports where it stands. */
  async function afterWriteDocument(uid: string, documentId: string): Promise<AfterWrite> {
    const status = await statusOf(uid, documentId);
    if (status === 'published' || !autoPublish()) return { status };
    try {
      await docs(strapi, uid).publish({ documentId });
    } catch (e) {
      if ((e as { name?: string })?.name !== 'ValidationError') throw e;
      return { status, notPublishedBecause: (e as Error).message };
    }
    return { status: await statusOf(uid, documentId) };
  }

  return {
    autoPublish,

    /**
     * Publishes the draft of `slug` when it differs from the live version, and reports where it stands. A draft that
     * can't be published (a gym without a location, say) stays a draft, with the reason as notPublishedBecause.
     */
    async afterWrite(uid: string, slug: string): Promise<AfterWrite> {
      const draft = await docs(strapi, uid).findFirst({ status: 'draft', filters: { slug }, fields: ['slug'] });
      if (!draft) throw new Error(`[matfinder] no ${uid} draft with slug ${slug} after a write`);
      return afterWriteDocument(uid, draft.documentId);
    },

    /** afterWrite for a document without a slug (a knowledge entry), by its documentId. */
    afterWriteDocument,
  };
};
