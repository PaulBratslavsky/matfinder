import { date, slug, str, upsertOutput, urlText, z } from '../schemas';
import { schoolService, type ToolDef } from '../types';

export const upsertSchool: ToolDef = {
  name: 'upsert_school',
  title: 'Create or update a school',
  description:
    'Create or partially update a BJJ school listing. The change is published right away (status in the result; notPublishedBecause says why if it could not be, e.g. no location). Only send the fields you want to change; pricing, contact and amenities are merged field by field. Call find_schools first to check whether the school already exists. Without a slug it always creates a new school (if the name is taken, the slug gets the city added); with an unknown slug it creates one with that slug. Creating needs name, citySlug and address. Send the street address and the server geocodes it; only send latitude/longitude if you have exact coordinates. descriptionText is plain text, paragraphs separated by blank lines. headInstructorSlugs replaces the whole ordered list (create instructors with upsert_instructor first). Use set_school_schedule for the weekly schedule. lastVerifiedAt ("Schedule verified" in the app) is set only by a person in the admin; this tool never changes it.',
  write: true,
  publishes: 'api::school.school',
  input: z.object({
    slug: slug.optional().describe('The school to update; omit to create'),
    name: z.string().min(1).max(120).optional(),
    citySlug: str.optional(),
    shortDescription: z.string().max(280).nullable().optional(),
    descriptionText: z.string().max(20000).nullable().optional(),
    address: str.optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    neighborhood: str.nullable().optional(),
    postalCode: str.nullable().optional(),
    affiliationSlug: str.nullable().optional().describe('null removes the affiliation'),
    headInstructorSlugs: z.array(slug).max(20).optional(),
    pricing: z
      .object({
        visitorsWelcome: z.boolean().nullable().describe('null: the pages do not say'),
        dropInFee: z.number().min(0).nullable(),
        dropInNotes: str.nullable(),
        freeTrial: z.boolean(),
        freeTrialNotes: str.nullable(),
        monthlyMin: z.number().min(0).nullable(),
        monthlyMax: z.number().min(0).nullable(),
        currency: z.enum(['USD']),
      })
      .partial()
      .optional(),
    contact: z
      .object({ phone: str.nullable(), email: z.string().email().max(255).nullable(), website: urlText.nullable(), instagram: urlText.nullable() })
      .partial()
      .optional(),
    amenities: z
      .object({
        showers: z.boolean(),
        changingRooms: z.boolean(),
        parking: z.boolean(),
        giRental: z.boolean(),
        proShop: z.boolean(),
        kidsArea: z.boolean(),
        airConditioning: z.boolean(),
      })
      .partial()
      .optional(),
    notice: z.string().max(140).nullable().optional().describe("A short notice shown on the gym's listing, e.g. 'Closed Nov 27 for Thanksgiving'. Only from the gym's own pages or posts. null or an empty string removes it"),
    noticeUntil: date.nullable().optional().describe('YYYY-MM-DD: the last day the notice applies. Omit or null to show it until it is removed'),
  }),
  output: upsertOutput,
  shrinkHint: 'The result is too large.',
  run: (strapi, args) => {
    const input = { ...args, lastVerifiedAt: undefined };
    return input.slug ? schoolService(strapi).upsertDraft(input) : schoolService(strapi).createDraft(input);
  },
};
