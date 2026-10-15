import { describe, expect, it } from 'vitest';
import { isOpen, nextStatus } from '../../src/plugins/matfinder/server/src/domain/claims';

describe('claim states', () => {
  it('new → contacted → accepted, or rejected from either', () => {
    expect(nextStatus('pending', 'contacted')).toBe('contacted');
    expect(nextStatus('pending', 'accept')).toBe('accepted');
    expect(nextStatus('contacted', 'accept')).toBe('accepted');
    expect(nextStatus('pending', 'reject')).toBe('rejected');
    expect(nextStatus('contacted', 'reject')).toBe('rejected');
  });
  it('only an accepted claim can lose its owner; finished claims stay finished', () => {
    expect(nextStatus('accepted', 'remove-owner')).toBe('withdrawn');
    expect(nextStatus('pending', 'remove-owner')).toBeNull();
    expect(nextStatus('contacted', 'contacted')).toBeNull();
    expect(nextStatus('accepted', 'accept')).toBeNull();
    expect(nextStatus('rejected', 'accept')).toBeNull();
    expect(nextStatus('withdrawn', 'accept')).toBeNull();
  });
  it('open means waiting for review', () => {
    expect(['pending', 'contacted', 'accepted', 'rejected', 'withdrawn'].filter((s) => isOpen(s as never))).toEqual(['pending', 'contacted']);
  });
});
