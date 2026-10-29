/**
 * Is this gym already listed? Pure scoring for `find_possible_duplicates` and `add_gym_from_web`: a candidate is a
 * possible duplicate of an existing gym when any one signal matches. Each match says why.
 */
export type GymSignals = {
  name: string;
  phone?: string | null;
  website?: string | null;
  instagram?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};
export type ExistingGym = GymSignals & { documentId: string; slug: string };
export type Duplicate = { documentId: string; slug: string; name: string; reasons: string[] };

/** Within this distance two gyms are probably the same place. */
export const SAME_PLACE_METERS = 150;

// Words that say "BJJ gym" rather than which gym.
const GENERIC = new Set([
  'bjj', 'jiu', 'jitsu', 'jiujitsu', 'brazilian', 'academy', 'the', 'of', 'and', 'team', 'martial', 'arts', 'mma', 'gym', 'club',
  'training', 'center', 'centre', 'studio', 'school', 'llc', 'inc', 'co',
]);

export function nameTokens(name: string): Set<string> {
  return new Set(words(name).filter((w) => !GENERIC.has(w)));
}

/** Lowercase words without accents or punctuation: "Jiu-Jítsu" → ["jiu", "jitsu"]. */
function words(name: string): string[] {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean);
}

/** Similar when most distinctive words are shared, or one name's words are all in the other ("Summerlin" in "Summerlin Gracie"). */
export function similarNames(a: string, b: string): boolean {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  // Names made only of generic words ("Jiu-Jitsu Academy"): compare the whole normalized name.
  if (!ta.size || !tb.size) return words(a).join(' ') === words(b).join(' ');
  const shared = [...ta].filter((w) => tb.has(w)).length;
  const union = new Set([...ta, ...tb]).size;
  const [small, large] = ta.size <= tb.size ? [ta, tb] : [tb, ta];
  return shared / union >= 0.6 || [...small].every((w) => large.has(w));
}

/** The last 10 digits (US numbers with or without +1, spaces or dashes). */
export const phoneKey = (phone?: string | null) => {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits.length >= 7 ? digits.slice(-10) : null;
};

const SOCIAL_HOSTS = new Set(['facebook.com', 'instagram.com', 'linktr.ee', 'google.com', 'maps.google.com', 'yelp.com']);

/** A website as host (without www) and first path part: `https://www.Example.com/About/x` → { host: 'example.com', page: 'about' }. */
export function siteParts(url?: string | null): { host: string; page: string | null } | null {
  if (!url?.trim()) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    const page = u.pathname.split('/').filter(Boolean)[0]?.toLowerCase() ?? null;
    return { host: u.hostname.toLowerCase().replace(/^www\./, ''), page };
  } catch {
    return null;
  }
}

/**
 * Same website: same host, and the same first path part unless one of them is the bare site. Gyms on a shared host
 * (a booking platform, a site builder, facebook.com) differ by path, so `host/a` and `host/b` are different gyms; on
 * social hosts the path is required, since the bare host says nothing.
 */
export function sameSite(a?: string | null, b?: string | null): boolean {
  const pa = siteParts(a);
  const pb = siteParts(b);
  if (!pa || !pb || pa.host !== pb.host) return false;
  if (SOCIAL_HOSTS.has(pa.host)) return !!pa.page && pa.page === pb.page;
  return !pa.page || !pb.page || pa.page === pb.page;
}

/** `@handle`, `handle` or an instagram.com URL → `handle`. */
export function instagramKey(value?: string | null): string | null {
  if (!value?.trim()) return null;
  const v = value.trim();
  const fromUrl = v.match(/instagram\.com\/([^/?#]+)/i)?.[1];
  const handle = (fromUrl ?? v).replace(/^@/, '').toLowerCase();
  return /^[a-z0-9._]+$/.test(handle) ? handle : null;
}

/** Great-circle distance in meters. */
export function distanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

const hasCoords = (g: GymSignals): g is GymSignals & { latitude: number; longitude: number } =>
  Number.isFinite(g.latitude) && Number.isFinite(g.longitude);

/** Existing gyms that might be `candidate`, most signals first. `names: false` skips the name signal (other cities). */
export function findDuplicates(candidate: GymSignals, existing: ExistingGym[], opts: { names?: boolean } = {}): Duplicate[] {
  const phone = phoneKey(candidate.phone);
  const ig = instagramKey(candidate.instagram);
  const out: Duplicate[] = [];
  for (const g of existing) {
    const reasons: string[] = [];
    if (opts.names !== false && similarNames(candidate.name, g.name)) reasons.push('similar name');
    if (phone && phone === phoneKey(g.phone)) reasons.push('same phone');
    if (sameSite(candidate.website, g.website)) reasons.push('same website');
    if (ig && ig === instagramKey(g.instagram)) reasons.push('same Instagram');
    if (hasCoords(candidate) && hasCoords(g)) {
      const d = distanceMeters(candidate, g);
      if (d <= SAME_PLACE_METERS) reasons.push(`${Math.round(d)} m away`);
    }
    if (reasons.length) out.push({ documentId: g.documentId, slug: g.slug, name: g.name, reasons });
  }
  return out.sort((a, b) => b.reasons.length - a.reasons.length || a.name.localeCompare(b.name));
}
