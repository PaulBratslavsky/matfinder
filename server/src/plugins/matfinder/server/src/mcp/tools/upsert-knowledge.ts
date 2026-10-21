import { KNOWLEDGE_CATEGORIES } from '../../domain/knowledge';
import { liveOutput, slug, z } from '../schemas';
import type { ToolDef } from '../types';

export const upsertKnowledge: ToolDef = {
  name: 'upsert_knowledge',
  title: 'Add or update gym knowledge',
  description:
    "Add or update one entry of a gym's knowledge base: a question people ask and its answer, which the gym chat (\"Ask about this gym\" in the MatFinder app) uses. Use it for facts on the gym's own pages that its MatFinder listing doesn't hold, such as parking, what to bring to a first class, visitor rules, kids' ages or gi requirements. Don't repeat what upsert_school and set_school_schedule store (address, contact, prices, amenities, schedule). It goes live right away, so write only facts from sourceUrls, in plain text. Without id, an entry with the same gym and question is updated (so asking twice doesn't duplicate it); with id, that entry is updated. schoolSlug null means it applies to every gym: use that only for answers true of BJJ gyms in general.",
  write: true,
  input: z.object({
    id: z.string().max(64).optional().describe("An entry's id from a previous result, to update that entry"),
    schoolSlug: slug.nullable().describe('The gym it is about (find it with find_schools), or null for every gym'),
    question: z.string().trim().min(3).max(200).describe('The question as people would ask it, e.g. "Is there parking?"'),
    answer: z.string().trim().min(1).max(2000).describe('The answer in plain text, only facts from the source pages'),
    category: z.enum(KNOWLEDGE_CATEGORIES),
    sourceUrls: z.array(z.string().url().max(500)).min(1).max(10).describe('The pages the answer comes from'),
  }),
  output: z.object({ id: z.string(), created: z.boolean(), schoolSlug: z.string().nullable(), question: z.string(), ...liveOutput }),
  shrinkHint: 'The result is unexpectedly large.',
  run: (strapi, args) => strapi.plugin('matfinder').service('knowledge').upsert({ ...args, source: 'agent' }),
};
