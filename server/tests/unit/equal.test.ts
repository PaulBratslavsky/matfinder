import { describe, expect, it } from 'vitest';
import { sameJson } from '../../src/lib/equal';

describe('sameJson', () => {
  it('ignores key order at any depth (Postgres jsonb re-orders keys)', () => {
    const built = { longitude: -115.1, latitude: 36.1, address: '1 Main St', zoom: 14, pitch: 0, bearing: 0 };
    const readBack = { zoom: 14, pitch: 0, address: '1 Main St', bearing: 0, latitude: 36.1, longitude: -115.1 };
    expect(sameJson(built, readBack)).toBe(true);
    expect(sameJson([{ type: 'paragraph', children: [{ type: 'text', text: 'Hi' }] }], [{ children: [{ text: 'Hi', type: 'text' }], type: 'paragraph' }])).toBe(true);
  });
  it('still sees real changes, array order, and null vs undefined as equal', () => {
    expect(sameJson({ a: 1 }, { a: 2 })).toBe(false);
    expect(sameJson([1, 2], [2, 1])).toBe(false);
    expect(sameJson(undefined, null)).toBe(true);
    expect(sameJson({ a: 1, b: undefined }, { a: 1 })).toBe(true);
  });
});
