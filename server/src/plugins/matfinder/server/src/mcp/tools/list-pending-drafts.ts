import { draftStatus, z } from '../schemas';
import { schoolService, type ToolDef } from '../types';

export const listPendingDrafts: ToolDef = {
  name: 'list_pending_drafts',
  title: 'List pending drafts',
  description:
    "List what isn't live: schools, instructors and affiliations that were never published or have unpublished changes (edits made in the admin, or agent writes that could not be published), newest first, each with the fields that differ from the published version.",
  write: false,
  input: z.object({
    type: z.enum(['school', 'instructor', 'affiliation']).optional(),
    limit: z.number().int().min(1).max(100).default(25),
  }),
  output: z.object({
    items: z.array(
      z.object({
        type: z.enum(['school', 'instructor', 'affiliation']),
        slug: z.string(),
        name: z.string(),
        status: draftStatus,
        updatedAt: z.string(),
        changedFields: z.array(z.string()),
      }),
    ),
  }),
  shrinkHint: 'Too many drafts: lower limit or filter by type.',
  run: async (strapi, args) => ({ items: await schoolService(strapi).listPendingDrafts(args) }),
};
