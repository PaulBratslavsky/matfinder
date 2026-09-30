/**
 * Strapi stores `time` fields as `HH:mm:ss.SSS`; the APIs emit `HH:mm`. Compare as minutes since midnight,
 * so both forms give the same answer. Returns null for anything that isn't a valid time of day.
 */
export function toMinutes(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const m = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?$/.exec(value.trim());
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (hours > 23 || minutes > 59 || (m[3] !== undefined && Number(m[3]) > 59)) return null;
  return hours * 60 + minutes;
}
