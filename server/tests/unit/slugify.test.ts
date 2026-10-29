import { describe, expect, it } from 'vitest';
import { pickFreeSlug, slugify, slugifyWithFallback } from '../../src/lib/slugify';

describe('slugify', () => {
  it('lowercases, strips accents and joins words with hyphens', () => {
    expect(slugify('Test Schöol & Co.')).toBe('test-school-co');
    expect(slugify('João Silva')).toBe('joao-silva');
    expect(slugify('  10th Planet — Las Vegas  ')).toBe('10th-planet-las-vegas');
  });

  it('trims leading and trailing separators', () => {
    expect(slugify('--Gracie Barra!!')).toBe('gracie-barra');
  });

  it('returns an empty string when nothing is left', () => {
    expect(slugify('!!!')).toBe('');
    expect(slugify('柔術')).toBe('');
  });
});

describe('slugifyWithFallback', () => {
  it('uses the slug when there is one', () => {
    expect(slugifyWithFallback('Sample Team Alpha (Demo)', 'affiliation')).toBe('sample-team-alpha-demo');
  });

  it('falls back to <type>-<6 random chars> for an empty result', () => {
    const a = slugifyWithFallback('柔術アカデミー', 'school');
    const b = slugifyWithFallback('!!!', 'school');
    expect(a).toMatch(/^school-[a-z0-9]{6}$/);
    expect(b).toMatch(/^school-[a-z0-9]{6}$/);
    expect(a).not.toBe(b);
  });
});

describe('pickFreeSlug', () => {
  it('returns the base when it is free', () => {
    expect(pickFreeSlug('gracie-barra', 'henderson', new Set())).toBe('gracie-barra');
  });

  it('adds the city when the base is taken', () => {
    expect(pickFreeSlug('gracie-barra', 'henderson', new Set(['gracie-barra']))).toBe('gracie-barra-henderson');
  });

  it('then counts up from -2', () => {
    expect(pickFreeSlug('gracie-barra', 'henderson', new Set(['gracie-barra', 'gracie-barra-henderson']))).toBe('gracie-barra-henderson-2');
  });

  it("doesn't add the city twice when the base already ends with it", () => {
    expect(pickFreeSlug('summerlin-bjj-las-vegas', 'las-vegas', new Set(['summerlin-bjj-las-vegas']))).toBe('summerlin-bjj-las-vegas-2');
  });
});
