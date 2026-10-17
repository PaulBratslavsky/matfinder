import { z } from '../schemas';

/** MCP prompts take string arguments only. */
export const findNewGymsArgs = z.object({
  city: z.string().describe('City slug, e.g. las-vegas'),
  area: z.string().optional().describe('Optional neighborhood or ZIP to focus on'),
});

/** The search-and-add loop for an agent with web search: find gyms, skip duplicates, add drafts with sources. */
export function findNewGymsText({ city, area }: { city: string; area?: string }): string {
  const where = area ? `${area} in ${city}` : city;
  return [
    `Find Brazilian Jiu-Jitsu gyms in ${where} that MatFinder doesn't list yet, and add them as drafts for review.`,
    '',
    '1. Call list_reference_data to see the cities, teams and coaches that already exist.',
    `2. Search the web for BJJ gyms in ${where}: their own websites, Google Maps listings, Instagram and team (affiliation) directories.`,
    '3. For each gym you find:',
    '   a. Call find_possible_duplicates with its name, address, phone, website and Instagram. If a candidate is the same gym, skip it (or, if you have newer facts, update that listing with upsert_school).',
    '   b. Otherwise call add_gym_from_web with the facts from the pages and their URLs as sourceUrls. Never invent a fact; leave a field out if no page states it.',
    '   c. If a page shows the weekly class schedule, call set_school_schedule with the complete week. Add pricing (drop-in, visitors welcome, free trial) with upsert_school when a page states it.',
    '4. Finish with list_pending_drafts and a short report: which gyms you added (with their source pages), which you skipped as duplicates, and anything you were unsure about.',
    '',
    'Everything you add stays a draft until a person publishes it in the Strapi admin.',
  ].join('\n');
}
