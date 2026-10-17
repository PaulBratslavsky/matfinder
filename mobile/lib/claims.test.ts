import { describe, expect, it } from 'vitest';
import { claimErrorMessage, isClaimOpen, phoneProblem } from './claims';

describe('claim form', () => {
  it('accepts phone numbers people actually type', () => {
    for (const p of ['702-555-0199', '(702) 555 0199', '+1 702.555.0199', '7025550199']) expect(phoneProblem(p)).toBeNull();
  });
  it('refuses empty, lettered and too-short numbers', () => {
    expect(phoneProblem('  ')).toMatch(/Add a phone/);
    expect(phoneProblem('call me')).toMatch(/digits/);
    expect(phoneProblem('555-01')).toMatch(/full phone/);
  });
  it('open claims and server refusals', () => {
    expect(isClaimOpen('pending')).toBe(true);
    expect(isClaimOpen('contacted')).toBe(true);
    expect(isClaimOpen('rejected')).toBe(false);
    expect(isClaimOpen(null)).toBe(false);
    expect(claimErrorMessage('CLAIM_OPEN', 'x')).toMatch(/already have a claim/);
    expect(claimErrorMessage(undefined, 'Something went wrong')).toBe('Something went wrong');
  });
});
