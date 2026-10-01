import { apiGet } from './client';

export type Style = 'gi' | 'nogi' | 'both';
export type ClassType = 'fundamentals' | 'all_levels' | 'advanced' | 'open_mat' | 'competition' | 'kids' | 'womens';
export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/** A session as the APIs emit it: times are city-local `HH:mm`. */
export type Session = { start: string; end: string; classType: ClassType; style: Style };

export type DirectorySchool = {
  documentId: string;
  slug: string;
  name: string;
  logo: { url: string } | null;
  latitude: number;
  longitude: number;
  neighborhood: string | null;
  postalCode: string | null;
  affiliation: string | null;
  styles: ('gi' | 'nogi')[];
  programs: ClassType[];
  visitorsWelcome: boolean;
  dropInFee: number | null;
  currency: string;
  todaySessions: Session[];
};

export type Directory = {
  city: {
    slug: string;
    name: string;
    timezone: string;
    center: { latitude: number; longitude: number };
    defaultZoom: number;
  };
  localDate: string;
  weekday: Weekday;
  generatedAt: string;
  schools: DirectorySchool[];
};

/** Public, trimmed directory for the map (GET /api/schools/directory). */
export async function getDirectory(citySlug: string): Promise<Directory> {
  return (await apiGet<{ data: Directory }>('/api/schools/directory', { city: citySlug })).data;
}

/** The full school page; needs an account (the auth client and the screen arrive in M7). */
export async function getSchoolBySlug<T = unknown>(slug: string): Promise<T> {
  return (await apiGet<{ data: T }>(`/api/schools/slug/${encodeURIComponent(slug)}`)).data;
}
