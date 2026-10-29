import { describe, expect, it } from 'vitest';
import { sourceLine, verifiedLine } from './verified';

describe('verified and source lines', () => {
  it('never verified', () => {
    expect(verifiedLine(null, '2026-10-29')).toEqual({ text: 'Schedule not verified yet', stale: false });
  });
  it('verified recently', () => {
    expect(verifiedLine('2026-09-15', '2026-10-29')).toEqual({ text: 'Schedule verified Sep 15, 2026', stale: false });
  });
  it('flags a date more than 90 days old', () => {
    const v = verifiedLine('2026-06-01', '2026-10-29');
    expect(v.stale).toBe(true);
    expect(v.text.endsWith('(may be out of date)')).toBe(true);
  });
  it('who added the gym', () => {
    expect(sourceLine(true)).toBe("Added by MatFinder's AI agent from the gym's web pages");
    expect(sourceLine(false)).toBe('Added by the MatFinder team');
  });
});
