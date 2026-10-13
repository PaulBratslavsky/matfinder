import type { TextStyle } from 'react-native';
import { fonts, layout, mapStyles, palettes, radii, type ColorScheme, type Palette } from './tokens';

/** Text presets built from the tokens; spread one into a style and add a color. */
const type = {
  /** Screen titles: condensed 800 italic caps. */
  display: { fontFamily: fonts.display, textTransform: 'uppercase', letterSpacing: 0.2 },
  /** Big condensed numbers and headings that aren't italic. */
  heavy: { fontFamily: fonts.heavy, textTransform: 'uppercase' },
  /** Small caps labels: kickers, chip text, group headings. */
  label: { fontFamily: fonts.label, textTransform: 'uppercase', letterSpacing: 1 },
  body: { fontFamily: fonts.body },
  bodyMedium: { fontFamily: fonts.bodyMedium },
  bodySemibold: { fontFamily: fonts.bodySemibold },
  bodyBold: { fontFamily: fonts.bodyBold },
} satisfies Record<string, TextStyle>;

export type Theme = {
  scheme: ColorScheme;
  colors: Palette;
  fonts: typeof fonts;
  type: typeof type;
  radii: typeof radii;
  layout: typeof layout;
  mapStyle: string;
};

export const themes: Record<ColorScheme, Theme> = {
  light: { scheme: 'light', colors: palettes.light, fonts, type, radii, layout, mapStyle: mapStyles.light },
  dark: { scheme: 'dark', colors: palettes.dark, fonts, type, radii, layout, mapStyle: mapStyles.dark },
};
