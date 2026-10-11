import type { Palette } from './tokens';

/** `#F4F1EA` → `244 241 234` (Tailwind's `rgb(var(--x) / <alpha-value>)` form). */
export function rgbTriplet(hex: string): string {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(' ');
}

/**
 * The React Native Reusables color names (`bg-primary`, `text-muted-foreground`…) mapped onto the tokens. These
 * become CSS variables: set on the root view on native (NativeWind `vars()`) and on `<html>` on the web.
 * `global.css` holds the light values as defaults (a unit test keeps it in step with this mapping).
 */
export function cssVars(c: Palette): Record<`--${string}`, string> {
  const vars = {
    background: c.bg,
    foreground: c.text,
    card: c.surface,
    'card-foreground': c.text,
    popover: c.surface,
    'popover-foreground': c.text,
    primary: c.redFill,
    'primary-foreground': c.onRed,
    secondary: c.separator,
    'secondary-foreground': c.text,
    muted: c.separator,
    'muted-foreground': c.textSecondary,
    accent: c.separator,
    'accent-foreground': c.text,
    destructive: c.redFill,
    'destructive-foreground': c.onRed,
    border: c.surfaceBorder,
    input: c.outline,
    ring: c.redText,
  };
  return Object.fromEntries(Object.entries(vars).map(([k, v]) => [`--${k}`, rgbTriplet(v)])) as Record<`--${string}`, string>;
}
