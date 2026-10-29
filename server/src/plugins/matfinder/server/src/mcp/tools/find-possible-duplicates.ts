import { slug, str, urlText, z } from '../schemas';
import type { ToolDef } from '../types';

export const lookupInput = {
  citySlug: slug.describe('City slug, e.g. las-vegas (list_reference_data lists them)'),
  name: z.string().min(1).max(120).describe("The gym's name as the web page gives it"),
  address: str.optional().describe('Street address; geocoded for the distance check when no coordinates are sent'),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  phone: str.optional(),
  website: urlText.optional(),
  instagram: urlText.optional().describe('@handle or instagram.com URL'),
};

export const candidate = z.object({
  documentId: z.string(),
  slug: z.string(),
  name: z.string(),
  reasons: z.array(z.string()).describe('Why it might be the same gym: similar name, same phone, same website, same Instagram, N m away'),
});

export const findPossibleDuplicates: ToolDef = {
  name: 'find_possible_duplicates',
  title: 'Find possible duplicates',
  description:
    "Check whether a gym you found on the web is already listed, before adding it. Matches on a similar name in the same city, the same phone, website or Instagram, or being within 150 m. Send everything you know. An empty list means no likely duplicate; otherwise compare with get_school_draft before deciding.",
  write: false,
  input: z.object(lookupInput),
  output: z.object({ candidates: z.array(candidate), distanceChecked: z.boolean().describe('False when the address could not be located') }),
  shrinkHint: 'Too many candidates: send a more specific name or the address.',
  run: (strapi, args) => strapi.plugin('matfinder').service('discovery').findPossibleDuplicates(args),
};
