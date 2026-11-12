import type { DirectorySchool } from './api/schools';
import { isTrainingToday, type CityNow } from './time';

/** The Explore filters; they live in the URL (`?q=&today=1&visitors=1&openmat=1&style=gi|nogi`) and combine with AND. */
export type Filters = { q: string; today: boolean; visitors: boolean; openMat: boolean; style: 'gi' | 'nogi' | null };

export const NO_FILTERS: Filters = { q: '', today: false, visitors: false, openMat: false, style: null };

type Params = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseFilters(params: Params): Filters {
  const style = first(params.style);
  return {
    q: first(params.q) ?? '',
    today: first(params.today) === '1',
    visitors: first(params.visitors) === '1',
    openMat: first(params.openmat) === '1',
    style: style === 'gi' || style === 'nogi' ? style : null,
  };
}

/** URL params for `router.setParams`: unset filters become `undefined` so they drop out of the URL. */
export function filtersToParams(f: Filters): Record<string, string | undefined> {
  return {
    q: f.q.trim() ? f.q : undefined,
    today: f.today ? '1' : undefined,
    visitors: f.visitors ? '1' : undefined,
    openmat: f.openMat ? '1' : undefined,
    style: f.style ?? undefined,
  };
}

export const hasActiveFilters = (f: Filters) => !!f.q.trim() || f.today || f.visitors || f.openMat || !!f.style;

/** Lowercase without accents, so "Henderson" matches "henderson" and "Jiu-Jítsu" matches "jiu-jitsu". */
export const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Text search on name, neighborhood, postal code and affiliation; every active filter must match. */
export function applyFilters(schools: DirectorySchool[], f: Filters, now: CityNow): DirectorySchool[] {
  const q = fold(f.q.trim());
  return schools.filter(
    (s) =>
      (!q || [s.name, s.neighborhood, s.postalCode, s.affiliation].some((v) => v && fold(v).includes(q))) &&
      (!f.today || isTrainingToday(s.todaySessions, now)) &&
      (!f.visitors || s.visitorsWelcome) &&
      (!f.openMat || s.programs.includes('open_mat')) &&
      (!f.style || s.styles.includes(f.style)),
  );
}
