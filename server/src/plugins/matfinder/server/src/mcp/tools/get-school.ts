import { beltRank, draftStatus, ref, sessionOut, slug, z } from '../schemas';
import { schoolService, type ToolDef } from '../types';

// Not `get_school`: Strapi's content manager registers its own generic `get_<type>` tools, and Strapi refuses to
// start when two tools share a name.
export const getSchool: ToolDef = {
  name: 'get_school_draft',
  title: 'Get school draft',
  description:
    'Read one school listing by slug: the DRAFT version (what upsert_school and set_school_schedule change), with relations as names and slugs, the weekly schedule as HH:mm, the description as plain text cut to excerptChars, and its publish status. Use it before editing a listing.',
  write: false,
  input: z.object({ slug, excerptChars: z.number().int().min(0).max(20000).default(600) }),
  output: z.object({
    documentId: z.string(),
    slug: z.string(),
    name: z.string(),
    status: draftStatus,
    shortDescription: z.string().nullable(),
    descriptionText: z.string(),
    descriptionTruncated: z.boolean(),
    city: ref.nullable(),
    location: z.object({ address: z.string(), latitude: z.number(), longitude: z.number() }).nullable(),
    neighborhood: z.string().nullable(),
    postalCode: z.string().nullable(),
    affiliation: ref.nullable(),
    headInstructors: z.array(ref.extend({ beltRank })),
    pricing: z.record(z.string(), z.any()).nullable(),
    contact: z.record(z.string(), z.any()).nullable(),
    amenities: z.record(z.string(), z.any()).nullable(),
    schedule: z.array(sessionOut),
    lastVerifiedAt: z.string().nullable(),
    notice: z.string().nullable(),
    noticeUntil: z.string().nullable(),
    updatedAt: z.string(),
  }),
  shrinkHint: 'The school is too large to return: lower excerptChars.',
  run: (strapi, args) => schoolService(strapi).getDraft(args.slug, args.excerptChars),
};
