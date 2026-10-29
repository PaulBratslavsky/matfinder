/** A knowledge entry as the gym chat reads it. `general`: it has no gym, so it applies to every gym. */
export type KnowledgeEntry = { question: string; answer: string; category: string; general: boolean };

export const KNOWLEDGE_CATEGORIES = ['visiting', 'schedule', 'pricing', 'kids', 'gear', 'facilities', 'policies', 'competition', 'other'] as const;

/** One entry per gym (or `*`, every gym) and question, matched case-insensitively: the unique draft key. */
export const knowledgeKey = (schoolDocumentId: string | null, question: string) =>
  `${schoolDocumentId ?? '*'}|${question.trim().normalize('NFKC').toLowerCase()}`;

/** Words that name no topic. */
const STOPWORDS = new Set(
  (
    'a about an and any are at be by can could did do does for from get gym has have hello hi how i if in is it its me my need of on or ' +
    'please should so thank thanks that the there these this those to want was we what when where which who why will with would you your'
  ).split(' '),
);

const normalize = (text: string) => text.normalize('NFKC').toLowerCase();
/**
 * Plural and "-ing" endings don't count. Terms are matched as substrings, so a cut stem still finds the word:
 * "classes" → "class", "times" → "tim" (finds "time"), "kids" → "kid", "parking" → "park", "training" → "train".
 */
const stem = (word: string) => {
  if (word.length >= 6 && word.endsWith('ing')) return word.slice(0, -3);
  if (word.length >= 5 && word.endsWith('es')) return word.slice(0, -2);
  if (word.length >= 4 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
};

/** The words of a question worth searching for: letters and digits, no stop words, no single characters. */
export function searchTerms(query: string): string[] {
  const terms = new Set<string>();
  for (const word of normalize(query).match(/[\p{L}\p{N}]+/gu) ?? []) {
    if (word.length < 2 || STOPWORDS.has(word)) continue;
    terms.add(stem(word));
  }
  return [...terms];
}

/** How well an entry answers: each term counts once, 3 in the question, 1 in the answer. */
export function scoreEntry(entry: KnowledgeEntry, terms: string[]): number {
  const question = normalize(entry.question);
  const answer = normalize(entry.answer);
  return terms.reduce((score, term) => score + (question.includes(term) ? 3 : answer.includes(term) ? 1 : 0), 0);
}

/**
 * The entries in the order they should fill the prompt: the gym's own before the general ones, and within each, the
 * best match for the question first (ties keep their order). With no searchable words, the order is unchanged.
 */
export function rankKnowledge(entries: KnowledgeEntry[], query: string): KnowledgeEntry[] {
  const terms = searchTerms(query);
  return entries
    .map((entry, index) => ({ entry, index, score: terms.length ? scoreEntry(entry, terms) : 0 }))
    .sort((a, b) => Number(a.entry.general) - Number(b.entry.general) || b.score - a.score || a.index - b.index)
    .map(({ entry }) => entry);
}
