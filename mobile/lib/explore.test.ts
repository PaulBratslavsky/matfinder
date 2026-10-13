import { describe, expect, it } from 'vitest';
import type { DirectorySchool, Session } from './api/schools';
import { distanceParts, dropInLabel, formatDuration, groupOf, pinTone, sessionState, sessionsLeftToday, sortItems, type ExploreItem } from './explore';
import type { CityNow } from './time';

const s = (start: string, end: string, classType: Session['classType'] = 'open_mat'): Session => ({ start, end, classType, style: 'both' });
/** Monday 4:45 pm. */
const now: CityNow = { localDate: '2026-10-12', weekday: 'mon', minutes: 16 * 60 + 45 };

describe('session state', () => {
  it('on now: minutes left and progress through the class', () => {
    expect(sessionState([s('16:30', '17:30')], now)).toMatchObject({ kind: 'live', minutesLeft: 45, progress: 0.25 });
  });
  it('upcoming: minutes until the next class, skipping the ones that ended', () => {
    expect(sessionState([s('06:00', '07:00', 'fundamentals'), s('19:00', '20:30')], now)).toMatchObject({
      kind: 'upcoming',
      minutesUntil: 135,
      session: { start: '19:00', classType: 'open_mat' },
    });
  });
  it('done vs none', () => {
    expect(sessionState([s('06:00', '07:00')], now)).toEqual({ kind: 'done' });
    expect(sessionState([], now)).toEqual({ kind: 'none' });
  });
  it('counts the classes not yet over, the running one included', () => {
    expect(sessionsLeftToday([s('06:00', '07:00'), s('16:30', '17:30'), s('19:00', '20:00')], now)).toBe(2);
  });
});

describe('groups and sorting', () => {
  const item = (name: string, sessions: Session[], distance: number | null = null): ExploreItem => ({
    school: { name, slug: name.toLowerCase(), todaySessions: sessions } as DirectorySchool,
    state: sessionState(sessions, now),
    distance,
  });
  const items = [
    item('Later', [s('19:00', '20:30')], 9.6),
    item('Rest', [], 1),
    item('Live', [s('16:30', '17:30')], 2.4),
    item('Soon', [s('18:00', '19:00')], 10.4),
    item('Done', [s('06:00', '07:00')], 0.5),
  ];

  it('starting soon is within 90 minutes', () => {
    expect(groupOf(sessionState([s('18:15', '19:00')], now))).toBe('soon');
    expect(groupOf(sessionState([s('18:16', '19:00')], now))).toBe('later');
  });

  it('start time: On now → Starting soon → Later today → Not today', () => {
    expect(sortItems(items, 'time').map((g) => [g.group, g.items.map((i) => i.school.name)])).toEqual([
      ['live', ['Live']],
      ['soon', ['Soon']],
      ['later', ['Later']],
      ['none', ['Done', 'Rest']],
    ]);
  });

  it('distance: one list, nearest first; unknown distances last, by name', () => {
    expect(sortItems(items, 'distance')[0].items.map((i) => i.school.name)).toEqual(['Done', 'Rest', 'Live', 'Later', 'Soon']);
    expect(sortItems([item('B', []), item('A', [])], 'distance')[0].items.map((i) => i.school.name)).toEqual(['A', 'B']);
  });

  it('pins: live, today (tagged with a start time) or muted', () => {
    expect(items.map((i) => pinTone(i.state))).toEqual(['today', 'muted', 'live', 'today', 'muted']);
  });
});

describe('formatting', () => {
  it('durations', () => {
    expect([45, 60, 75, 135].map(formatDuration)).toEqual(['45 min', '1 h', '1 h 15 min', '2 h 15 min']);
  });
  it('drop-in labels', () => {
    expect(dropInLabel({ dropInFee: 25, currency: 'USD' })).toBe('$25 drop-in');
    expect(dropInLabel({ dropInFee: 0, currency: 'USD' })).toBe('Free drop-in');
    expect(dropInLabel({ dropInFee: 12.5, currency: 'EUR' })).toBe('EUR 12.50 drop-in');
    expect(dropInLabel({ dropInFee: null, currency: 'USD' })).toBeNull();
  });
  it('distance parts', () => {
    expect(distanceParts(2.43)).toEqual({ value: '2.4', unit: 'mi' });
    expect(distanceParts(0.05)).toEqual({ value: '264', unit: 'ft' });
  });
});
