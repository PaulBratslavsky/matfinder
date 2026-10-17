import { draftStatus, str, z } from '../schemas';
import type { ToolDef } from '../types';
import { lookupInput } from './find-possible-duplicates';

export const addGymFromWeb: ToolDef = {
  name: 'add_gym_from_web',
  title: 'Add a gym found on the web',
  description:
    "Add a BJJ gym you found on the web as a DRAFT, with the pages you found it on (sourceUrls). A person reviews and publishes it in the Strapi admin. Only send facts that appear on those pages; leave out anything you'd have to guess. It checks for duplicates first and returns DUPLICATE_SUSPECTED with the candidates if the gym looks already listed; if you're sure it's a different gym, call again with confirmNotDuplicate: true. Then add the weekly schedule with set_school_schedule and pricing or coaches with upsert_school / upsert_instructor, if the pages give them.",
  write: true,
  input: z.object({
    ...lookupInput,
    address: str.describe('Street address, as written on the source page'),
    sourceUrls: z.array(z.string().url().max(500)).min(1).max(10).describe('The pages the facts come from (website, Google Maps, Instagram…)'),
    email: z.string().email().max(255).optional(),
    shortDescription: z.string().max(280).optional().describe("One or two sentences in your own words, from the gym's own description"),
    confirmNotDuplicate: z.boolean().default(false).describe('Set only after checking that the suspected duplicates are different gyms'),
  }),
  output: z.object({ documentId: z.string(), slug: z.string(), status: draftStatus, sourceUrls: z.array(z.string()) }),
  shrinkHint: 'The result is unexpectedly large; send fewer sourceUrls.',
  run: (strapi, args) => strapi.plugin('matfinder').service('discovery').addGymFromWeb(args),
};
