import { apiDelete, apiGet, apiPut } from './client';

export type SavedGym = { slug: string; name: string; neighborhood: string | null; city: { slug: string; name: string } | null };

export const getSaved = () => apiGet<{ items: SavedGym[] }>('/api/matfinder/saved');
export const saveGym = (slug: string) => apiPut<{ saved: true }>(`/api/matfinder/saved/${encodeURIComponent(slug)}`);
export const unsaveGym = (slug: string) => apiDelete<{ saved: false }>(`/api/matfinder/saved/${encodeURIComponent(slug)}`);
