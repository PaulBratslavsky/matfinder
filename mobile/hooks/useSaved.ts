import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSaved, saveGym, unsaveGym } from '@/lib/api/saved';
import { useSession } from './useSession';

/** The signed-in user's saved gyms, and a toggle for one gym. */
export function useSaved() {
  const session = useSession();
  return useQuery({ queryKey: ['saved'], queryFn: getSaved, enabled: !!session.data?.user });
}

export function useToggleSaved(slug: string) {
  const queryClient = useQueryClient();
  const saved = useSaved();
  const isSaved = !!saved.data?.items.some((g) => g.slug === slug);
  const toggle = useMutation({
    mutationFn: (): Promise<{ saved: boolean }> => (isSaved ? unsaveGym(slug) : saveGym(slug)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['saved'] }),
  });
  return { isSaved, toggle };
}
