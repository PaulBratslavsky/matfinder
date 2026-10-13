import { DarkTheme, DefaultTheme } from 'expo-router';

// SDK 56+: expo-router ships its own navigation; themes come from it, not @react-navigation.
type Theme = typeof DefaultTheme;

/** Mirrors global.css, for places that need raw colors (navigation, map layers). */
export const THEME = {
  light: {
    background: '#FFFFFF',
    foreground: '#000000',
    card: '#FFFFFF',
    primary: '#007AFF',
    mutedForeground: '#8E8E93',
    destructive: '#FF3B30',
    border: '#E5E5EA',
  },
  dark: {
    background: 'hsl(222 18% 7%)',
    foreground: 'hsl(0 0% 98%)',
    card: 'hsl(222 16% 10%)',
    primary: 'hsl(216 78% 58%)',
    mutedForeground: 'hsl(220 8% 65%)',
    destructive: 'hsl(0 62% 50%)',
    border: 'hsl(222 12% 21%)',
  },
};

export const NAV_THEME: Record<'light' | 'dark', Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: THEME.light.background,
      border: THEME.light.border,
      card: THEME.light.card,
      notification: THEME.light.destructive,
      primary: THEME.light.primary,
      text: THEME.light.foreground,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: THEME.dark.background,
      border: THEME.dark.border,
      card: THEME.dark.card,
      notification: THEME.dark.destructive,
      primary: THEME.dark.primary,
      text: THEME.dark.foreground,
    },
  },
};
