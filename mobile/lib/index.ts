const STRAPI_URL = process.env.EXPO_PUBLIC_STRAPI_URL || "http://localhost:1337";

export function getStrapiURL(): string {
  return STRAPI_URL;
}

export function getStrapiMedia(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${getStrapiURL()}${url}`;
}