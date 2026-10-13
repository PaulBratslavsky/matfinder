export type ThemePreference = 'system' | 'light' | 'dark';

const KEY = 'matfinder.theme';

const isPreference = (v: unknown): v is ThemePreference => v === 'system' || v === 'light' || v === 'dark';

/** The saved System / Light / Dark choice (web: localStorage, which can be missing or blocked). */
export function loadPreference(): ThemePreference {
  try {
    const v = typeof localStorage === 'undefined' ? null : localStorage.getItem(KEY);
    return isPreference(v) ? v : 'system';
  } catch {
    return 'system';
  }
}

export function savePreference(p: ThemePreference): void {
  try {
    localStorage.setItem(KEY, p);
  } catch {
    // Private mode or blocked storage: the choice lasts for this visit only.
  }
}
