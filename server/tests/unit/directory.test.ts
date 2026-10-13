import { describe, expect, it } from 'vitest';
import { DIRECTORY_FIELDS, derivePrograms, deriveStyles, nextSessionToday, toDirectoryItem, toTodaySessions } from '../../src/lib/directory';
import { cityNow, type CityNow } from '../../src/lib/time';

/** A published school as the Document Service returns it, with everything the public directory must NOT expose. */
const school = {
  id: 7,
  documentId: 'doc1',
  slug: 'sample-gym',
  name: 'Sample Gym (Demo)',
  shortDescription: 'Gated',
  description: [{ type: 'paragraph', children: [{ type: 'text', text: 'Gated' }] }],
  location: { longitude: -115.2, latitude: 36.1, address: '1 Sample St', zoom: 15, pitch: 0, bearing: 0 },
  neighborhood: 'Summerlin',
  postalCode: '89135',
  logo: { url: '/uploads/logo.png', formats: { thumbnail: { url: '/uploads/thumbnail_logo.png' } } },
  gallery: [{ url: '/uploads/g.png' }],
  affiliation: { name: 'Sample Team (Demo)', website: 'https://gated.example' },
  headInstructors: [{ name: 'Gated Coach' }],
  pricing: { visitorsWelcome: true, dropInFee: '25.00', currency: 'USD', monthlyMin: 150, monthlyMax: 200, dropInNotes: 'gated' },
  contact: { phone: '702-555-0100', email: 'gated@example.test' },
  amenities: { showers: true },
  schedule: [
    { day: 'wed', startTime: '19:00:00.000', endTime: '20:30:00.000', classType: 'open_mat', style: 'both' },
    { day: 'wed', startTime: '06:00:00.000', endTime: '07:00:00.000', classType: 'fundamentals', style: 'gi' },
    { day: 'thu', startTime: '18:00:00.000', endTime: '19:00:00.000', classType: 'kids', style: 'gi' },
  ],
  lastVerifiedAt: '2026-09-15',
};

const wednesday: CityNow = { localDate: '2026-09-30', weekday: 'wed', minutes: 18 * 60 };

describe('toDirectoryItem (public directory trimming)', () => {
  const item = toDirectoryItem(school, wednesday);

  it('has exactly the public field set, in order', () => {
    expect(Object.keys(item)).toEqual([...DIRECTORY_FIELDS]);
  });

  // `programs` lists every class type in the week by design; other days' sessions (times) must not appear.
  it('contains no gated data', () => {
    const json = JSON.stringify(item);
    for (const gated of ['Gated', 'gated', 'monthlyMin', 'headInstructors', 'contact', 'amenities', 'gallery', 'description', '"day"', '18:00']) {
      expect(json).not.toContain(gated);
    }
  });

  it('keeps only today’s sessions, sorted, as HH:mm', () => {
    expect(item.todaySessions).toEqual([
      { start: '06:00', end: '07:00', classType: 'fundamentals', style: 'gi' },
      { start: '19:00', end: '20:30', classType: 'open_mat', style: 'both' },
    ]);
  });

  it('flattens relations and pricing to the public values', () => {
    expect(item).toMatchObject({
      logo: { url: '/uploads/thumbnail_logo.png' },
      latitude: 36.1,
      longitude: -115.2,
      affiliation: 'Sample Team (Demo)',
      visitorsWelcome: true,
      dropInFee: 25,
      currency: 'USD',
    });
  });

  it('defaults missing pieces', () => {
    const bare = toDirectoryItem({ documentId: 'd', slug: 's', name: 'n', location: school.location }, wednesday);
    expect(bare).toMatchObject({ logo: null, affiliation: null, neighborhood: null, visitorsWelcome: false, dropInFee: null, currency: 'USD', todaySessions: [], styles: [], programs: [] });
  });
});

describe('derived fields', () => {
  it('styles: both counts as gi and nogi; programs follow the schema order', () => {
    expect(deriveStyles(school.schedule as any)).toEqual(['gi', 'nogi']);
    expect(deriveStyles([{ style: 'nogi' }] as any)).toEqual(['nogi']);
    expect(derivePrograms(school.schedule as any)).toEqual(['fundamentals', 'open_mat', 'kids']);
  });

  it('next session today: upcoming, on now, none', () => {
    const today = toTodaySessions(school.schedule as any, wednesday);
    expect(nextSessionToday(today, { ...wednesday, minutes: 12 * 60 })).toMatchObject({ classType: 'open_mat', onNow: false });
    expect(nextSessionToday(today, { ...wednesday, minutes: 19 * 60 + 30 })).toMatchObject({ classType: 'open_mat', onNow: true });
    expect(nextSessionToday(today, { ...wednesday, minutes: 21 * 60 })).toBeNull();
  });

  it('city-local now uses the city zone, not the server zone', () => {
    // 2026-10-01T03:30Z: already Thursday in UTC, still Wednesday 20:30 in Las Vegas.
    expect(cityNow('America/Los_Angeles', new Date('2026-10-01T03:30:00Z'))).toEqual({ localDate: '2026-09-30', weekday: 'wed', minutes: 20 * 60 + 30 });
  });
});
