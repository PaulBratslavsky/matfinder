/** The MatFinder page's tabs. The open one lives in ?tab=, so widgets and links can open a tab directly. */
export const TABS = [
  { id: 'gyms', label: 'Gyms' },
  { id: 'from-web', label: 'From the web' },
] as const;

export type TabId = (typeof TABS)[number]['id'];

export const tabFromQuery = (value: string | null): TabId => (TABS.some((t) => t.id === value) ? (value as TabId) : 'gyms');

/** "From the web 3", or the plain label when there's nothing waiting. */
export const tabLabel = (label: string, count?: number) => (count ? `${label} ${count}` : label);
