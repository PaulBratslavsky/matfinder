import { rankKnowledge, type KnowledgeEntry } from '../domain/knowledge';
import { GYM_CHAT_LIMITS } from './limits';

/**
 * What the gym chat reads about a gym: the published page as the app shows it (the school service's `getBySlug`), never
 * sources, origin, claimants or drafts. Only the fields used here are typed.
 */
export type PublicGym = {
  name: string;
  shortDescription?: string | null;
  description?: unknown;
  city?: { name: string; timezone?: string | null } | null;
  location?: { address?: string | null } | null;
  neighborhood?: string | null;
  postalCode?: string | null;
  affiliation?: { name: string; website?: string | null } | null;
  headInstructors?: { name: string; beltRank?: string | null; degree?: number | null; bio?: string | null }[];
  pricing?: {
    visitorsWelcome?: boolean | null;
    dropInFee?: number | null;
    dropInNotes?: string | null;
    freeTrial?: boolean | null;
    freeTrialNotes?: string | null;
    monthlyMin?: number | null;
    monthlyMax?: number | null;
  } | null;
  contact?: { phone?: string | null; email?: string | null; website?: string | null; instagram?: string | null } | null;
  amenities?: Record<string, boolean | null | undefined> | null;
  schedule?: { day: string; start: string; end: string; classType: string; style: string; notes?: string | null }[];
  lastVerifiedAt?: string | null;
  notice?: string | null;
};

const DAYS: Record<string, string> = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
const CLASS_TYPES: Record<string, string> = {
  fundamentals: 'Fundamentals',
  all_levels: 'All levels',
  advanced: 'Advanced',
  open_mat: 'Open mat',
  competition: 'Competition',
  kids: 'Kids',
  womens: "Women's",
};
const STYLES: Record<string, string> = { gi: 'gi', nogi: 'no-gi', both: 'gi and no-gi' };
const BELTS: Record<string, string> = { red_black: 'red and black', red_white: 'red and white' };
const AMENITIES: Record<string, string> = {
  showers: 'showers',
  changingRooms: 'changing rooms',
  parking: 'parking',
  giRental: 'gi rental',
  proShop: 'pro shop',
  kidsArea: "kids' area",
  airConditioning: 'air conditioning',
};

/**
 * Strapi `blocks` rich text → plain paragraphs, like the app's lib/blocks.ts (the plugin's build can't import app
 * TypeScript, only its JSON).
 */
function blocksToText(blocks: unknown): string {
  const nodeText = (node: any): string =>
    !node || typeof node !== 'object' ? '' : typeof node.text === 'string' ? node.text : Array.isArray(node.children) ? node.children.map(nodeText).join('') : '';
  return Array.isArray(blocks) ? blocks.map(nodeText).map((t) => t.trim()).filter(Boolean).join('\n\n') : '';
}

/** Data goes inside tags, so a `<` in it is written as `&lt;`: a gym description can't close a tag or open one. */
const data = (text: string | null | undefined) => (text ?? '').replace(/</g, '&lt;').trim();
const money = (n: number | null | undefined) => (typeof n === 'number' ? `$${Number.isInteger(n) ? n : n.toFixed(2)}` : null);
const ordinal = (n: number) => `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`;
const yesNo = (v: boolean | null | undefined) => (v === true ? 'yes' : v === false ? 'no' : 'not listed');

/** `2026-09-15` → `September 15, 2026`. */
function longDate(value: string): string {
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/** The gym's page as compact text, every value wrapped as data. */
export function gymText(gym: PublicGym): string {
  const lines: string[] = [`Name: ${data(gym.name)}`];
  if (gym.shortDescription) lines.push(`Summary: ${data(gym.shortDescription)}`);
  const description = blocksToText(gym.description);
  if (description) lines.push(`Description:\n${data(description)}`);
  if (gym.affiliation) lines.push(`Team: ${data(gym.affiliation.name)}${gym.affiliation.website ? ` (${data(gym.affiliation.website)})` : ''}`);

  const where = [gym.location?.address, gym.neighborhood && `neighborhood ${gym.neighborhood}`, gym.postalCode && `ZIP ${gym.postalCode}`, gym.city?.name]
    .filter(Boolean)
    .map((x) => data(x as string));
  if (where.length) lines.push(`Address: ${where.join(', ')}`);

  const c = gym.contact;
  const contact = [c?.phone && `phone ${c.phone}`, c?.email && `email ${c.email}`, c?.website && `website ${c.website}`, c?.instagram && `Instagram @${c.instagram.replace(/^@/, '')}`]
    .filter(Boolean)
    .map((x) => data(x as string));
  lines.push(`Contact: ${contact.length ? contact.join(', ') : 'not listed'}`);

  const p = gym.pricing;
  if (p) {
    const prices = [
      `visitors welcome: ${yesNo(p.visitorsWelcome)}`,
      money(p.dropInFee) ? `drop-in ${money(p.dropInFee)}${p.dropInNotes ? ` (${data(p.dropInNotes)})` : ''}` : p.dropInNotes ? `drop-in: ${data(p.dropInNotes)}` : null,
      p.freeTrial != null ? `free trial: ${yesNo(p.freeTrial)}${p.freeTrialNotes ? ` (${data(p.freeTrialNotes)})` : ''}` : null,
      money(p.monthlyMin) || money(p.monthlyMax)
        ? `monthly ${[money(p.monthlyMin), money(p.monthlyMax)].filter(Boolean).join(' to ')}`
        : null,
    ].filter(Boolean);
    lines.push(`Prices (USD): ${prices.join('; ')}`);
  } else {
    lines.push('Prices: not listed');
  }

  const amenities = Object.entries(AMENITIES)
    .filter(([key]) => gym.amenities?.[key] != null)
    .map(([key, label]) => `${label}: ${yesNo(gym.amenities?.[key])}`);
  lines.push(`Amenities: ${amenities.length ? amenities.join(', ') : 'not listed'}`);

  const coaches = (gym.headInstructors ?? []).map((i) => {
    const belt = i.beltRank ? `${BELTS[i.beltRank] ?? i.beltRank} belt${i.degree ? `, ${ordinal(i.degree)} degree` : ''}` : null;
    return `- ${data(i.name)}${belt ? ` (${belt})` : ''}${i.bio ? `: ${data(i.bio)}` : ''}`;
  });
  lines.push(coaches.length ? `Head instructors:\n${coaches.join('\n')}` : 'Head instructors: not listed');

  const sessions = (gym.schedule ?? []).map(
    (s) =>
      `- ${DAYS[s.day] ?? s.day} ${s.start}–${s.end}: ${CLASS_TYPES[s.classType] ?? s.classType}, ${STYLES[s.style] ?? s.style}${s.notes ? ` (${data(s.notes)})` : ''}`,
  );
  lines.push(sessions.length ? `Weekly schedule (the gym's local time):\n${sessions.join('\n')}` : 'Weekly schedule: not listed');
  if (gym.notice) lines.push(`Notice from the gym: ${data(gym.notice)}`);
  lines.push(gym.lastVerifiedAt ? `Schedule and prices last verified: ${longDate(gym.lastVerifiedAt)}` : 'Schedule and prices: never verified');
  return lines.join('\n');
}

const entryText = (e: KnowledgeEntry) =>
  `<entry category="${e.category}" applies-to="${e.general ? 'every gym' : 'this gym'}">\nQ: ${data(e.question)}\nA: ${data(e.answer)}\n</entry>`;

/**
 * The gym and its knowledge, as the stable part of the system prompt. Entries are the gym's own, then the general ones;
 * past `maxChars` they're ranked against the question and the ones that fit are kept.
 */
export function gymContext(
  gym: PublicGym,
  entries: KnowledgeEntry[],
  options: { question?: string; maxChars?: number } = {},
): { text: string; entries: number; dropped: number } {
  const maxChars = options.maxChars ?? GYM_CHAT_LIMITS.contextChars;
  const page = `<gym>\n${gymText(gym)}\n</gym>`;
  const ordered = [...entries.filter((e) => !e.general), ...entries.filter((e) => e.general)];
  const all = ordered.map(entryText);
  let kept = all;
  if (page.length + all.join('\n').length > maxChars) {
    kept = [];
    let used = page.length;
    for (const text of rankKnowledge(ordered, options.question ?? '').map(entryText)) {
      if (used + text.length + 1 > maxChars) continue;
      kept.push(text);
      used += text.length + 1;
    }
  }
  const knowledge = kept.length ? `<knowledge>\n${kept.join('\n')}\n</knowledge>` : '<knowledge>\n(no entries)\n</knowledge>';
  return { text: `${page}\n${knowledge}`, entries: kept.length, dropped: all.length - kept.length };
}

/** "Now at the gym" in its own time zone, the volatile line after the cached part of the prompt. */
export function nowLine(timezone: string | null | undefined, now: Date = new Date()): string {
  const timeZone = timezone || 'UTC';
  let local: string;
  try {
    local = now.toLocaleString('en-US', { timeZone, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    local = now.toUTCString();
  }
  return `Now at the gym: ${local} (${timeZone}).`;
}
