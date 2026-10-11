const { hairlineWidth } = require('nativewind/theme');

/** A theme color as an RGB-triplet CSS variable, so opacity modifiers (`bg-primary/90`) work. */
const c = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  // Light/dark is applied by swapping the CSS variables (theme/ThemeProvider.tsx), not with `dark:` classes.
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Colors come from theme/tokens.ts as CSS variables (theme/css-vars.ts maps them onto these names).
      colors: {
        border: c('border'),
        input: c('input'),
        ring: c('ring'),
        background: c('background'),
        foreground: c('foreground'),
        primary: { DEFAULT: c('primary'), foreground: c('primary-foreground') },
        secondary: { DEFAULT: c('secondary'), foreground: c('secondary-foreground') },
        destructive: { DEFAULT: c('destructive'), foreground: c('destructive-foreground') },
        muted: { DEFAULT: c('muted'), foreground: c('muted-foreground') },
        accent: { DEFAULT: c('accent'), foreground: c('accent-foreground') },
        popover: { DEFAULT: c('popover'), foreground: c('popover-foreground') },
        card: { DEFAULT: c('card'), foreground: c('card-foreground') },
      },
      // The same families as `fonts` in theme/tokens.ts (theme/tokens.test.ts checks). Custom fonts carry their
      // weight in the family, so use these rather than font-medium / font-semibold / font-bold.
      fontFamily: {
        sans: ['Barlow_400Regular'],
        'body-medium': ['Barlow_500Medium'],
        'body-semibold': ['Barlow_600SemiBold'],
        'body-bold': ['Barlow_700Bold'],
        label: ['BarlowCondensed_700Bold'],
        heavy: ['BarlowCondensed_800ExtraBold'],
        display: ['BarlowCondensed_800ExtraBold_Italic'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      borderWidth: { hairline: hairlineWidth() },
    },
  },
  future: { hoverOnlyWhenSupported: true },
  plugins: [require('tailwindcss-animate')],
};
