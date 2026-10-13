import { vars } from 'nativewind';
import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { cssVars } from './css-vars';
import { loadPreference, savePreference, type ThemePreference } from './preference';
import { themes, type Theme } from './theme';
import { palettes, type ColorScheme } from './tokens';

export type { ThemePreference };

type ThemeContextValue = Theme & { preference: ThemePreference; setPreference: (p: ThemePreference) => void };

const ThemeContext = createContext<ThemeContextValue>({ ...themes.light, preference: 'system', setPreference: () => {} });

// Native: NativeWind reads CSS variables from the nearest ancestor that sets them with `vars()`.
const NATIVE_VARS: Record<ColorScheme, object> = { light: vars(cssVars(palettes.light)), dark: vars(cssVars(palettes.dark)) };

/** Web: the variables go on <html>, so everything (portals included) and the page background follow the theme. */
function applyWebTheme(scheme: ColorScheme) {
  const root = document.documentElement;
  for (const [name, value] of Object.entries(cssVars(palettes[scheme]))) root.style.setProperty(name, value);
  root.style.colorScheme = scheme;
  document.body.style.backgroundColor = palettes[scheme].bg;
}

/**
 * Light or dark from the tokens: follows the phone's setting unless the user picked Light or Dark on Account
 * (saved on the device).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>(loadPreference);
  const scheme: ColorScheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    savePreference(p);
  }, []);

  useLayoutEffect(() => {
    if (Platform.OS === 'web') applyWebTheme(scheme);
  }, [scheme]);

  const value = useMemo(() => ({ ...themes[scheme], preference, setPreference }), [scheme, preference, setPreference]);

  return (
    <ThemeContext.Provider value={value}>
      <View style={[styles.root, { backgroundColor: value.colors.bg }, Platform.OS !== 'web' && NATIVE_VARS[scheme]]}>{children}</View>
    </ThemeContext.Provider>
  );
}

/** The current theme (colors, fonts, type presets, radii, map style) plus the System / Light / Dark preference. */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

/**
 * StyleSheet styles that follow the theme. Both modes are built once, up front:
 *
 *     const useStyles = makeStyles((t) => ({ title: { ...t.type.display, color: t.colors.text } }));
 *     // in the component
 *     const styles = useStyles();
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: (t: Theme) => T) {
  const sheets: Record<ColorScheme, T> = { light: StyleSheet.create(factory(themes.light)), dark: StyleSheet.create(factory(themes.dark)) };
  return function useStyles(): T {
    return sheets[useTheme().scheme];
  };
}

const styles = StyleSheet.create({ root: { flex: 1 } });
