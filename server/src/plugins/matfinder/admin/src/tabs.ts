import { PLUGIN_ID } from './pluginId';

/** The MatFinder page's tabs. The open one lives in ?tab=, so widgets and links can open a tab directly. */
export const TABS = [
  { id: 'gyms', label: 'Gyms' },
  { id: 'claims', label: 'Claims' },
  { id: 'from-web', label: 'From the web' },
  // Shown only to admins whose role holds "Use the MatFinder assistant" (MatFinderPage).
  { id: 'assistant', label: 'Assistant' },
] as const;

export type TabId = (typeof TABS)[number]['id'];

export const tabFromQuery = (value: string | null): TabId => (TABS.some((t) => t.id === value) ? (value as TabId) : 'gyms');

/** The plugin page, on one tab, with optional filters: pagePath('gyms', { status: 'published' }). */
export const pagePath = (tab: TabId, params: Record<string, string> = {}) =>
  `/plugins/${PLUGIN_ID}?${new URLSearchParams({ tab, ...params }).toString()}`;
