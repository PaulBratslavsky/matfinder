import { z } from '../schemas';

/** MCP prompts take string arguments only. */
export const findNewGymsArgs = z.object({
  city: z.string().describe('City slug, e.g. las-vegas'),
  area: z.string().optional().describe('Optional neighborhood or ZIP to focus on'),
});

/** The search-and-add loop for an agent with web search: find gyms, skip duplicates, add the rest with their sources. */
export function findNewGymsText({ city, area }: { city: string; area?: string }): string {
  const where = area ? `${area} in ${city}` : city;
  return [
    `Find Brazilian Jiu-Jitsu gyms in ${where} that MatFinder doesn't list yet, and add them to the directory.`,
    '',
    '1. Call list_reference_data to see the cities, teams and coaches that already exist.',
    `2. Search the web for BJJ gyms in ${where}: their own websites, Google Maps listings, Instagram and team (affiliation) directories.`,
    '3. For each gym you find:',
    '   a. Call find_possible_duplicates with its name, address, phone, website and Instagram. If a candidate is the same gym, skip it (or, if you have newer facts, update that listing with upsert_school).',
    '   b. Otherwise call add_gym_from_web with the facts from the pages and their URLs as sourceUrls. Never invent a fact; leave a field out if no page states it.',
    '   c. If a page shows the weekly class schedule, call set_school_schedule with the complete week. Add pricing (drop-in, visitors welcome, free trial) with upsert_school when a page states it; leave visitorsWelcome out unless a page says it.',
    '   d. Check each result: status published means it is live. If notPublishedBecause is set (an address that could not be located, say), fix it with upsert_school.',
    '4. Finish with a short report: which gyms you added (with their source pages), which you skipped as duplicates, and anything you were unsure about.',
    '',
    'What you add goes live in the app right away, with no review: only add a real BJJ gym that its own pages confirm, and only facts those pages state.',
  ].join('\n');
}
