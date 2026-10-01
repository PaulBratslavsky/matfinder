import { describe, expect, it } from 'vitest';
import { MAX_SESSIONS, scheduleProblem } from '../../src/document-middlewares/schedule-validate';
import { toMinutes, toStoredTime } from '../../src/lib/time';

const row = (o: Record<string, unknown> = {}) => ({
  day: 'mon',
  startTime: '18:00:00.000',
  endTime: '19:30:00.000',
  classType: 'open_mat',
  style: 'both',
  ...o,
});

describe('scheduleProblem', () => {
  it('accepts a valid week and clearing the schedule', () => {
    expect(scheduleProblem([row(), row({ day: 'sat', startTime: '10:00:00.000', endTime: '11:00:00.000' })])).toBeNull();
    expect(scheduleProblem(null)).toBeNull();
    expect(scheduleProblem([])).toBeNull();
  });

  it('rejects end <= start, comparing as minutes (stored and HH:mm forms)', () => {
    expect(scheduleProblem([row({ endTime: '18:00:00.000' })])?.path).toEqual(['schedule', 0, 'endTime']);
    expect(scheduleProblem([row(), row({ startTime: '20:00', endTime: '19:59' })])?.path).toEqual(['schedule', 1, 'endTime']);
  });

  it('rejects invalid enums with the field path', () => {
    expect(scheduleProblem([row({ classType: 'yoga' })])?.path).toEqual(['schedule', 0, 'classType']);
    expect(scheduleProblem([row({ day: 'funday' })])?.path).toEqual(['schedule', 0, 'day']);
    expect(scheduleProblem([row({ style: 'judo' })])?.path).toEqual(['schedule', 0, 'style']);
  });

  it('rejects invalid times', () => {
    expect(scheduleProblem([row({ startTime: '25:00:00.000' })])?.path).toEqual(['schedule', 0, 'startTime']);
    expect(scheduleProblem([row({ endTime: '7pm' })])?.path).toEqual(['schedule', 0, 'endTime']);
  });

  it(`allows at most ${MAX_SESSIONS} sessions`, () => {
    expect(scheduleProblem(Array.from({ length: MAX_SESSIONS }, () => row()))).toBeNull();
    expect(scheduleProblem(Array.from({ length: MAX_SESSIONS + 1 }, () => row()))?.path).toEqual(['schedule']);
  });

  it('rejects a non-list', () => {
    expect(scheduleProblem({ day: 'mon' })?.path).toEqual(['schedule']);
  });
});

describe('time helpers', () => {
  it('parses HH:mm and HH:mm:ss.SSS the same way', () => {
    expect(toMinutes('19:30')).toBe(toMinutes('19:30:00.000'));
    expect(toMinutes('24:00')).toBeNull();
  });

  it('converts the MCP HH:mm form to the stored form', () => {
    expect(toStoredTime('06:05')).toBe('06:05:00.000');
    expect(toStoredTime('6:05')).toBeNull();
    expect(toStoredTime('06:05:00')).toBeNull();
  });
});
