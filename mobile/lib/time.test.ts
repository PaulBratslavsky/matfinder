import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from './api/schools';
import { cityNow, formatTime, isTrainingToday, nextSessionLabel, nextSessionToday } from './time';

const VEGAS = 'America/Los_Angeles';
const s = (start: string, end: string, classType: Session['classType'] = 'open_mat'): Session => ({ start, end, classType, style: 'gi' });
const today = [s('19:00', '20:30'), s('06:00', '07:00', 'fundamentals')];
/** Vegas wall-clock time on Wednesday 2026-09-30 (PDT, UTC-7). */
const vegasAt = (hhmm: string) => cityNow(VEGAS, new Date(`2026-09-30T${hhmm}:00-07:00`));

describe('city-local now', () => {
  it('reads date, weekday and minutes in the city zone', () => {
    expect(vegasAt('17:14')).toEqual({ localDate: '2026-09-30', weekday: 'wed', minutes: 17 * 60 + 14 });
  });

  it('day rollover: one minute after midnight is the next day', () => {
    expect(vegasAt('23:59')).toMatchObject({ weekday: 'wed', minutes: 23 * 60 + 59 });
    expect(cityNow(VEGAS, new Date('2026-10-01T00:00:30-07:00'))).toEqual({ localDate: '2026-10-01', weekday: 'thu', minutes: 0 });
  });

  describe('with the device in another time zone', () => {
    const deviceTz = process.env.TZ;
    beforeEach(() => {
      process.env.TZ = 'Asia/Tokyo';
      vi.useFakeTimers();
      // 00:14 UTC Wednesday: Wednesday 09:14 in Tokyo, but still Tuesday 17:14 in Las Vegas.
      vi.setSystemTime(new Date('2026-09-30T00:14:00Z'));
    });
    afterEach(() => {
      vi.useRealTimers();
      process.env.TZ = deviceTz;
    });

    it('still uses Las Vegas time for "now"', () => {
      expect(new Date().getDate()).toBe(30); // the device thinks it's Wednesday
      expect(cityNow(VEGAS)).toEqual({ localDate: '2026-09-29', weekday: 'tue', minutes: 17 * 60 + 14 });
    });

    it('so "On now" and "Training today" follow the city clock', () => {
      const now = cityNow(VEGAS);
      expect(nextSessionLabel([s('17:00', '18:00')], now)).toBe('On now');
      expect(isTrainingToday([s('06:00', '07:00')], now)).toBe(false);
    });
  });
});

describe('training today', () => {
  it('is true while any session today has not ended', () => {
    expect(isTrainingToday(today, vegasAt('12:00'))).toBe(true);
    expect(isTrainingToday(today, vegasAt('20:29'))).toBe(true);
  });

  it('is false once the last session has ended, or with no sessions', () => {
    expect(isTrainingToday(today, vegasAt('20:30'))).toBe(false);
    expect(isTrainingToday([], vegasAt('08:00'))).toBe(false);
  });
});

describe('next session today', () => {
  it('is the earliest session that has not ended, regardless of input order', () => {
    expect(nextSessionToday(today, vegasAt('05:00'))).toMatchObject({ classType: 'fundamentals', onNow: false });
    expect(nextSessionToday(today, vegasAt('12:00'))).toMatchObject({ classType: 'open_mat', onNow: false });
  });

  it('is "On now" from start until (not including) end', () => {
    expect(nextSessionToday(today, vegasAt('19:00'))?.onNow).toBe(true);
    expect(nextSessionToday(today, vegasAt('20:29'))?.onNow).toBe(true);
    expect(nextSessionToday(today, vegasAt('20:30'))).toBeNull();
  });

  it('labels: On now, "<Class type> · <h:mm am/pm>", or none left', () => {
    expect(nextSessionLabel(today, vegasAt('06:30'))).toBe('On now');
    expect(nextSessionLabel(today, vegasAt('12:00'))).toBe('Open mat · 7:00 pm');
    expect(nextSessionLabel(today, vegasAt('05:00'))).toBe('Fundamentals · 6:00 am');
    expect(nextSessionLabel(today, vegasAt('21:00'))).toBe('No more sessions today');
  });

  it('formats 12-hour times', () => {
    expect(formatTime('00:05')).toBe('12:05 am');
    expect(formatTime('12:00')).toBe('12:00 pm');
    expect(formatTime('18:30:00.000')).toBe('6:30 pm');
  });
});
