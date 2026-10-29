import { liveOutput, str, z } from '../schemas';
import type { ToolDef } from '../types';
import { lookupInput } from './find-possible-duplicates';

export const addGymFromWeb: ToolDef = {
  name: 'add_gym_from_web',
  title: 'Add a gym found on the web',
  description:
    "Add a BJJ gym you found on the web, with the pages you found it on (sourceUrls). It goes live in the app right away, with no review, so only send facts that appear on those pages and leave out anything you'd have to guess. The result's status is published once it's live; notPublishedBecause says why if it isn't (e.g. the address could not be located: fix it with upsert_school). It always creates a new listing and never changes an existing one. If the name is already taken (in any city), the slug gets the city added, e.g. gracie-barra-henderson. It checks for duplicates first (in this city by name, phone, website, Instagram or distance; in other cities by phone, website, Instagram or distance) and returns DUPLICATE_SUSPECTED with the candidates. If you're sure it's a different gym, call again with confirmNotDuplicate: true. To update an existing gym, use upsert_school with its slug. Then add the weekly schedule with set_school_schedule and pricing or coaches with upsert_school / upsert_instructor, if the pages give them.",
  write: true,
  publishes: 'api::school.school',
  input: z.object({
    ...lookupInput,
    address: str.describe('Street address, as written on the source page'),
    sourceUrls: z.array(z.string().url().max(500)).min(1).max(10).describe('The pages the facts come from (website, Google Maps, Instagram…)'),
    email: z.string().email().max(255).optional(),
    shortDescription: z.string().max(280).optional().describe("One or two sentences in your own words, from the gym's own description"),
    confirmNotDuplicate: z.boolean().default(false).describe('Set only after checking that the suspected duplicates are different gyms'),
  }),
  output: z.object({ documentId: z.string(), slug: z.string(), sourceUrls: z.array(z.string()), ...liveOutput }),
  shrinkHint: 'The result is unexpectedly large; send fewer sourceUrls.',
  run: (strapi, args) => strapi.plugin('matfinder').service('discovery').addGymFromWeb(args),
};
