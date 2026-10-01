import { describe, expect, it } from 'vitest';
import { slugify, slugifyWithFallback } from '../../src/lib/slugify';

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
