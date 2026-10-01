import { describe, expect, it } from 'vitest';
import type { DirectorySchool, Session } from './api/schools';
import { applyFilters, filtersToParams, NO_FILTERS, parseFilters } from './filters';
import type { CityNow } from './time';

const session = (start: string, end: string): Session => ({ start, end, classType: 'open_mat', style: 'gi' });
const school = (o: Partial<DirectorySchool>): DirectorySchool => ({
  documentId: o.slug ?? 'x',
  slug: 'x',
  name: 'X',
  logo: null,
  latitude: 36.1,
  longitude: -115.1,
  neighborhood: null,
  postalCode: null,
  affiliation: null,
  styles: ['gi'],
  programs: [],
  visitorsWelcome: false,
  dropInFee: null,
  currency: 'USD',
  todaySessions: [],
  ...o,
});

const schools = [
  school({ slug: 'jj', name: 'Jiu-Jítsu Academy', neighborhood: 'Summerlin', postalCode: '89135', styles: ['gi'], visitorsWelcome: true, todaySessions: [session('19:00', '20:30')] }),
  school({ slug: 'hg', name: 'Henderson Grappling', neighborhood: 'Henderson', postalCode: '89014', styles: ['nogi'], visitorsWelcome: true, todaySessions: [session('06:00', '07:00')] }),
  school({ slug: 'gv', name: 'Green Valley BJJ', neighborhood: 'Henderson', postalCode: '89074', affiliation: 'Team Alpha', styles: ['gi', 'nogi'], todaySessions: [session('18:00', '21:00')] }),
  school({ slug: 'nl', name: 'North LV Academy', neighborhood: 'North Las Vegas', styles: ['gi'], visitorsWelcome: true }),
];
const noon: CityNow = { localDate: '2026-09-30', weekday: 'wed', minutes: 12 * 60 };
const slugs = (r: DirectorySchool[]) => r.map((s) => s.slug);

describe('applyFilters', () => {
  it('no filters keeps everything', () => {
    expect(slugs(applyFilters(schools, NO_FILTERS, noon))).toEqual(['jj', 'hg', 'gv', 'nl']);
  });

  it('text search is case- and accent-insensitive over name, neighborhood, ZIP and affiliation', () => {
    const q = (text: string) => slugs(applyFilters(schools, { ...NO_FILTERS, q: text }, noon));
    expect(q('henderson')).toEqual(['hg', 'gv']);
    expect(q('HENDERSON')).toEqual(['hg', 'gv']);
    expect(q('jiu-jitsu')).toEqual(['jj']);
    expect(q('JÍU')).toEqual(['jj']);
    expect(q('8907')).toEqual(['gv']);
    expect(q('team alpha')).toEqual(['gv']);
    expect(q('  ')).toEqual(['jj', 'hg', 'gv', 'nl']);
  });

  it('each filter on its own', () => {
    expect(slugs(applyFilters(schools, { ...NO_FILTERS, today: true }, noon))).toEqual(['jj', 'gv']);
    expect(slugs(applyFilters(schools, { ...NO_FILTERS, visitors: true }, noon))).toEqual(['jj', 'hg', 'nl']);
    expect(slugs(applyFilters(schools, { ...NO_FILTERS, style: 'gi' }, noon))).toEqual(['jj', 'gv', 'nl']);
    expect(slugs(applyFilters(schools, { ...NO_FILTERS, style: 'nogi' }, noon))).toEqual(['hg', 'gv']);
  });

  it('combines filters with AND', () => {
    expect(slugs(applyFilters(schools, { q: 'henderson', today: true, visitors: false, style: null }, noon))).toEqual(['gv']);
    expect(slugs(applyFilters(schools, { q: '', today: true, visitors: true, style: 'gi' }, noon))).toEqual(['jj']);
    expect(slugs(applyFilters(schools, { q: 'henderson', today: true, visitors: true, style: null }, noon))).toEqual([]);
  });
});

describe('URL params', () => {
  it('round-trip, dropping unset filters', () => {
    const f = { q: 'henderson', today: true, visitors: false, style: 'nogi' as const };
    expect(filtersToParams(f)).toEqual({ q: 'henderson', today: '1', visitors: undefined, style: 'nogi' });
    expect(parseFilters({ q: 'henderson', today: '1', style: 'nogi' })).toEqual(f);
  });

  it('ignores invalid values', () => {
    expect(parseFilters({ today: 'yes', style: 'judo', visitors: ['1', '0'] })).toEqual({ q: '', today: false, visitors: true, style: null });
  });
});
