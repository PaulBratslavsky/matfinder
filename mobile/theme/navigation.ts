import { DarkTheme, DefaultTheme } from 'expo-router';
import { themes } from './theme';
import type { ColorScheme } from './tokens';

// SDK 56+: expo-router ships its own navigation; themes come from it, not @react-navigation.
type NavTheme = typeof DefaultTheme;

function navTheme(scheme: ColorScheme): NavTheme {
  const { colors, fonts } = themes[scheme];
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      background: colors.bg,
      border: colors.separator,
      card: colors.bg,
      notification: colors.redFill,
      primary: colors.redText,
      text: colors.text,
    },
    fonts: {
      regular: { fontFamily: fonts.body, fontWeight: 'normal' },
      medium: { fontFamily: fonts.bodyMedium, fontWeight: 'normal' },
      bold: { fontFamily: fonts.label, fontWeight: 'normal' },
      heavy: { fontFamily: fonts.heavy, fontWeight: 'normal' },
    },
  };
}

/** The navigation theme (headers, screen backgrounds) for each mode, from the tokens. */
export const NAV_THEME: Record<ColorScheme, NavTheme> = { light: navTheme('light'), dark: navTheme('dark') };
