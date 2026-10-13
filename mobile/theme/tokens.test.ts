/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { cssVars } from './css-vars';
import { fonts, palettes, type ColorScheme, type Palette } from './tokens';

/** WCAG 2.x relative luminance and contrast ratio, for opaque `#RRGGBB` colors. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** Text tokens and the surfaces each one is used on: all must reach WCAG AA for body text (4.5:1). */
const PAIRS: [keyof Palette, (keyof Palette)[]][] = [
  ['text', ['bg', 'sheet', 'surface', 'field']],
  ['textSecondary', ['bg', 'sheet', 'surface', 'field']],
  ['textDim', ['bg', 'sheet', 'surface', 'field']],
  ['chipText', ['bg', 'sheet', 'surface']],
  ['redText', ['bg', 'sheet', 'surface']],
  ['liveText', ['bg', 'sheet', 'surface']],
  ['onRed', ['redFill']],
  ['onInverse', ['inverse']],
  ['warning', ['warningBg']],
];

describe.each(['light', 'dark'] as ColorScheme[])('%s palette', (scheme) => {
  const p = palettes[scheme];
  it.each(PAIRS)('%s is readable on its surfaces', (fg, bgs) => {
    for (const bg of bgs) expect(contrast(p[fg], p[bg]), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
  });
  it('white text on the ON NOW fill is readable', () => {
    expect(contrast('#FFFFFF', p.liveFill)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('the copies outside tokens.ts stay in step', () => {
  it('global.css defaults are the light palette', () => {
    const css = readFileSync(new URL('../global.css', import.meta.url), 'utf8');
    for (const [name, value] of Object.entries(cssVars(palettes.light))) {
      expect(css, name).toMatch(new RegExp(`${name}: ${value};`));
    }
  });

  it('tailwind font families are the token fonts', () => {
    const config = createRequire(import.meta.url)('../tailwind.config.js');
    const families = Object.values(config.theme.extend.fontFamily as Record<string, string[]>).map((f) => f[0]);
    expect(families.sort()).toEqual(Object.values(fonts).sort());
  });
});
