import { describe, expect, it } from 'vitest';
import type { CityNow } from './time';
import { addDays, calendarIcs, calendarUrl, dayList, nextClass, restOfWeek, slotOf, visitChecklist, weekGrid, zonedToUtc, type ScheduledSession } from './week';

const c = (day: ScheduledSession['day'], start: string, end: string, classType: ScheduledSession['classType'], style: ScheduledSession['style'] = 'gi'): ScheduledSession => ({
  day,
  start,
  end,
  classType,
  style,
  notes: null,
});
/** The sample "Summerlin" week. */
const schedule = [
  c('mon', '06:00', '07:00', 'fundamentals'),
  c('mon', '19:00', '20:30', 'open_mat', 'both'),
  c('tue', '16:30', '17:15', 'kids'),
  c('wed', '12:00', '13:00', 'all_levels', 'nogi'),
  c('thu', '16:30', '17:15', 'kids'),
  c('sat', '09:00', '10:00', 'womens'),
];
const at = (weekday: CityNow['weekday'], hhmm: string): CityNow => ({
  localDate: '2026-10-12',
  weekday,
  minutes: Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3)),
});

describe('next class', () => {
  it("today's next class, or the running one", () => {
    expect(nextClass(schedule, at('mon', '16:45'))).toMatchObject({ daysAhead: 0, onNow: false, session: { classType: 'open_mat' } });
    expect(nextClass(schedule, at('mon', '19:30'))).toMatchObject({ daysAhead: 0, onNow: true });
  });
  it('a later day when today is over, wrapping past Sunday', () => {
    expect(nextClass(schedule, at('mon', '21:00'))).toMatchObject({ daysAhead: 1, session: { day: 'tue' } });
    expect(nextClass(schedule, at('sat', '11:00'))).toMatchObject({ daysAhead: 2, session: { day: 'mon', start: '06:00' } });
  });
  it("next week's same day when that's the only class", () => {
    expect(nextClass([c('mon', '06:00', '07:00', 'fundamentals')], at('mon', '08:00'))).toMatchObject({ daysAhead: 7 });
    expect(nextClass([], at('mon', '08:00'))).toBeNull();
  });
});

describe('week grid', () => {
  it('slots by start time', () => {
    expect(['06:00', '10:59', '11:00', '13:59', '14:00', '16:59', '17:00'].map(slotOf)).toEqual([
      'morning',
      'morning',
      'midday',
      'midday',
      'afternoon',
      'afternoon',
      'evening',
    ]);
  });
  it('today: finished classes are done, the next one is marked', () => {
    const mon = weekGrid(schedule, at('mon', '16:45'))[0];
    expect(mon).toMatchObject({ day: 'mon', isToday: true });
    expect(mon.cells.map((x) => [x.state, x.label])).toEqual([
      ['done', 'Fund. · Done'],
      ['empty', ''],
      ['empty', ''],
      ['next', 'Open mat'],
    ]);
  });
  it('the next class can be on another day; days without classes are flagged', () => {
    const rows = weekGrid(schedule, at('mon', '21:00'));
    expect(rows[1].cells[2]).toMatchObject({ state: 'next', label: 'Kids' });
    expect(rows[4]).toMatchObject({ day: 'fri', hasClasses: false });
    expect(rows[0].cells[3].state).toBe('done');
  });
});

describe('rest of the week', () => {
  it('the six days after today, and the empty ones', () => {
    const { days, emptyDays } = restOfWeek(schedule, at('mon', '16:45'));
    expect(days.map((d) => d.day)).toEqual(['tue', 'wed', 'thu', 'sat']);
    expect(emptyDays).toEqual(['fri', 'sun']);
    expect(dayList(emptyDays)).toBe('Friday or Sunday');
    expect(dayList(['tue', 'fri', 'sun'])).toBe('Tuesday, Friday or Sunday');
  });
});

describe('add to calendar', () => {
  it('a Google Calendar link in the city time zone', () => {
    const url = calendarUrl({ title: 'Open mat at Summerlin', date: '2026-10-12', start: '19:00', end: '20:30', timeZone: 'America/Los_Angeles', location: '1 Main St' });
    expect(url).toBe(
      'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Open%20mat%20at%20Summerlin&dates=20261012T190000%2F20261012T203000&ctz=America%2FLos_Angeles&location=1%20Main%20St',
    );
  });
  it('adds days to a plain date across month ends', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
  });
  it('zonedToUtc follows daylight saving time', () => {
    expect(zonedToUtc('2026-10-12', '19:00', 'America/Los_Angeles').toISOString()).toBe('2026-10-13T02:00:00.000Z');
    expect(zonedToUtc('2026-12-01', '19:00', 'America/Los_Angeles').toISOString()).toBe('2026-12-02T03:00:00.000Z');
  });
  it('an .ics event in UTC, escaped', () => {
    const ics = calendarIcs({ uid: 'u1', title: 'Open mat at Summerlin, Demo', date: '2026-10-12', start: '19:00', end: '20:30', timeZone: 'America/Los_Angeles', location: '1 Main St' }, new Date('2026-10-01T00:00:00Z'));
    expect(ics).toContain('DTSTART:20261013T020000Z\r\n');
    expect(ics).toContain('DTEND:20261013T033000Z\r\n');
    expect(ics).toContain('SUMMARY:Open mat at Summerlin\\, Demo\r\n');
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
  });
  it('folds long lines at 75 UTF-8 bytes, never inside a character', () => {
    const ics = calendarIcs({ uid: 'u2', title: `Open mat at ${'Académie Jiu-Jitsu Brésilienne '.repeat(4)}`, date: '2026-10-12', start: '19:00', end: '20:30', timeZone: 'America/Los_Angeles' }, new Date('2026-10-01T00:00:00Z'));
    const bytes = new TextEncoder();
    for (const line of ics.split('\r\n')) expect(bytes.encode(line).length).toBeLessThanOrEqual(75);
    expect(ics.replace(/\r\n /g, '')).toContain('Académie Jiu-Jitsu Brésilienne');
  });
});

describe('can I train here tonight?', () => {
  const pricing = { visitorsWelcome: true, dropInFee: 25, dropInNotes: null, freeTrial: true, freeTrialNotes: null, monthlyMin: 150, monthlyMax: 200, currency: 'USD' };
  const amenities = { showers: true, changingRooms: true, parking: true, giRental: true, proShop: false, kidsArea: false, airConditioning: true };

  it("tonight's class, pricing and amenities", () => {
    const next = nextClass(schedule, at('mon', '16:45'));
    expect(visitChecklist({ pricing, amenities }, next)).toEqual([
      { ok: true, strong: 'Visitors welcome' },
      { ok: true, strong: '$25 drop-in', rest: ', or your first class free' },
      { ok: true, strong: 'Gi or No-Gi', rest: ": tonight's open mat is both" },
      { ok: true, strong: 'Gi rental', rest: " if you didn't bring one" },
      { ok: true, strong: 'Showers', rest: ' and parking' },
    ]);
  });

  it('members only, no price, no class today', () => {
    const items = visitChecklist(
      { pricing: { ...pricing, visitorsWelcome: false, dropInFee: null, freeTrial: false }, amenities: { ...amenities, showers: false, parking: false } },
      nextClass(schedule, at('mon', '21:00')),
    );
    expect(items).toEqual([
      { ok: false, strong: 'No drop-ins', rest: ': ask before you visit' },
      { ok: null, strong: 'Drop-in price not listed', rest: ': ask the gym' },
    ]);
  });

  it('no drop-ins but a free first class: the free class is said once', () => {
    const items = visitChecklist({ pricing: { ...pricing, visitorsWelcome: false, dropInFee: null, freeTrial: true }, amenities }, null);
    const free = items.filter((i) => /free/i.test(i.strong));
    expect(free).toHaveLength(1);
    expect(free[0].strong).toBe('First class free');
  });

  it("doesn't call a gym members-only when it hasn't said", () => {
    const items = visitChecklist({ pricing: { ...pricing, visitorsWelcome: null }, amenities }, null);
    expect(items[0]).toEqual({ ok: null, strong: 'Visitor policy not listed', rest: ': ask the gym' });
    expect(visitChecklist({ pricing: null, amenities: null }, null)[0]).toEqual(items[0]);
  });
});
