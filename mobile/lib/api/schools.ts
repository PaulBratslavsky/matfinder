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
  /** null: the gym hasn't said. */
  visitorsWelcome: boolean | null;
  dropInFee: number | null;
  currency: string;
  todaySessions: Session[];
  /** An owner's claim was accepted. */
  claimed: boolean;
  /** "Schedule verified" date (YYYY-MM-DD), set only by a person; null when never verified. */
  lastVerifiedAt: string | null;
  /** The AI agent added this gym from the web (not the team by hand). */
  addedFromWeb: boolean;
  /** The gym offers a free first class. */
  freeTrial: boolean;
  /** A short notice from the gym while it applies ("Closed Nov 27"), else null. */
  notice: string | null;
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

/** The full school page; needs an account (401/403 → AuthRequiredError otherwise). */
export async function getSchoolBySlug<T = unknown>(slug: string): Promise<T> {
  return (await apiGet<{ data: T }>(`/api/schools/slug/${encodeURIComponent(slug)}`)).data;
}

export type Media = {
  url: string;
  alternativeText: string | null;
  width: number | null;
  height: number | null;
  formats: Record<string, { url: string; width: number; height: number }> | null;
};

export type BeltRank = 'white' | 'blue' | 'purple' | 'brown' | 'black' | 'red_black' | 'red_white' | 'red';

/** Strapi `blocks` rich text (the subset the school page renders). */
export type BlockNode = { type: string; children?: BlockNode[]; text?: string; url?: string; level?: number; format?: string; [mark: string]: unknown };

export type AmenityKey = 'showers' | 'changingRooms' | 'parking' | 'giRental' | 'proShop' | 'kidsArea' | 'airConditioning';

/** The full, account-only school page (GET /api/schools/slug/:slug). */
export type SchoolPage = {
  documentId: string;
  slug: string;
  name: string;
  /** An owner's claim was accepted. */
  claimed: boolean;
  shortDescription: string | null;
  description: BlockNode[] | null;
  city: { slug: string; name: string; timezone: string } | null;
  location: { longitude: number; latitude: number; address: string; zoom: number } | null;
  neighborhood: string | null;
  postalCode: string | null;
  logo: Media | null;
  gallery: Media[];
  affiliation: { name: string; slug: string; website: string | null; logo: Media | null } | null;
  headInstructors: { name: string; slug: string; beltRank: BeltRank; degree: number | null; photo: Media | null; bio: string | null }[];
  pricing: {
    visitorsWelcome: boolean | null;
    dropInFee: number | null;
    dropInNotes: string | null;
    freeTrial: boolean;
    freeTrialNotes: string | null;
    monthlyMin: number | null;
    monthlyMax: number | null;
    currency: string;
  } | null;
  contact: { phone: string | null; email: string | null; website: string | null; instagram: string | null } | null;
  amenities: Record<AmenityKey, boolean> | null;
  schedule: (Session & { day: Weekday; notes: string | null })[];
  styles: ('gi' | 'nogi')[];
  programs: ClassType[];
  todaySessions: Session[];
  nextSessionToday: (Session & { onNow: boolean }) | null;
  lastVerifiedAt: string | null;
  addedFromWeb: boolean;
  notice: string | null;
};
