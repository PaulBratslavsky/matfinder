import * as SecureStore from 'expo-secure-store';

export type ThemePreference = 'system' | 'light' | 'dark';

const KEY = 'matfinder.theme';

const isPreference = (v: unknown): v is ThemePreference => v === 'system' || v === 'light' || v === 'dark';

/** The saved System / Light / Dark choice (native: SecureStore, read synchronously so the first frame is right). */
export function loadPreference(): ThemePreference {
  try {
    const v = SecureStore.getItem(KEY);
    return isPreference(v) ? v : 'system';
  } catch {
    return 'system';
  }
}

export function savePreference(p: ThemePreference): void {
  SecureStore.setItemAsync(KEY, p).catch(() => {});
}
