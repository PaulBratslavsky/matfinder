import type { Core } from '@strapi/strapi';
import { draftStatus, type DraftStatus } from '../domain/status';

const docs = (strapi: Core.Strapi, uid: string) => strapi.documents(uid as any) as any;

/** Where a document stands after an agent write. */
export type AfterWrite = { status: DraftStatus; notPublishedBecause?: string };

/** The reason given when a write lands on a draft that already had unpublished changes. */
export const EARLIER_CHANGES =
  "The draft already had unpublished changes before this write (usually a person's edits in the admin), so nothing was published. A person reviews and publishes it in the admin.";
/** The reason given when a write lands on a never-published draft the agent didn't add. */
export const NEVER_PUBLISHED =
  "This draft has never been published and wasn't added by the agent, so a person reviews and publishes it in the admin.";
const SCHOOL_UID = 'api::school.school';

/**
 * Agent writes go live: after each MCP write the document's draft is published, unless the plugin's `autoPublish`
 * config (MATFINDER_AUTO_PUBLISH) is off, in which case they stay drafts for a person to review. Except over a draft
 * that already had unpublished changes before the write.
 */
export default ({ strapi }: { strapi: Core.Strapi }) => {
  async function statusOf(uid: string, documentId: string): Promise<DraftStatus> {
    const draft = await docs(strapi, uid).findOne({ documentId, status: 'draft', fields: ['updatedAt'] });
    const published = await docs(strapi, uid).findOne({ documentId, status: 'published', fields: ['updatedAt'] });
    return draftStatus(draft, published);
  }

  /** True for a school the agent added (origin web-agent). Only schools have an origin. */
  async function addedByAgent(uid: string, documentId: string): Promise<boolean> {
    if (uid !== SCHOOL_UID) return false;
    const draft = await docs(strapi, uid).findOne({ documentId, status: 'draft', fields: ['origin'] });
    return draft?.origin === 'web-agent';
  }

  const autoPublish = () => (strapi.plugin('matfinder').config('autoPublish', true) as boolean) !== false;

  /**
   * Publishes a document's draft when it differs from the live version, and reports where it stands. Not when the
   * draft already had unpublished changes before this write (`previousStatus`): those are someone else's, so they
   * stay a draft for a person to review.
   */
  async function afterWriteDocument(uid: string, documentId: string, previousStatus?: DraftStatus): Promise<AfterWrite> {
    const status = await statusOf(uid, documentId);
    if (status === 'published' || !autoPublish()) return { status };
    if (previousStatus === 'unpublished-changes') return { status, notPublishedBecause: EARLIER_CHANGES };
    if (previousStatus === 'never-published' && !(await addedByAgent(uid, documentId))) {
      return { status, notPublishedBecause: NEVER_PUBLISHED };
    }
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
    statusOf,

    /**
     * Publishes the draft of `slug` when it differs from the live version, and reports where it stands. A draft that
     * can't be published (a gym without a location, say) stays a draft, with the reason as notPublishedBecause.
     */
    async afterWrite(uid: string, slug: string, previousStatus?: DraftStatus): Promise<AfterWrite> {
      const draft = await docs(strapi, uid).findFirst({ status: 'draft', filters: { slug }, fields: ['slug'] });
      if (!draft) throw new Error(`[matfinder] no ${uid} draft with slug ${slug} after a write`);
      return afterWriteDocument(uid, draft.documentId, previousStatus);
    },

    /** afterWrite for a document without a slug (a knowledge entry), by its documentId. */
    afterWriteDocument,
  };
};
