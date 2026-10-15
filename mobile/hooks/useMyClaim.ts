import { useQuery } from '@tanstack/react-query';
import { getMyClaim } from '@/lib/api/claims';
import { useSession } from './useSession';

/** The signed-in user's claim on a gym, so the gym page can say "Your claim is being reviewed". */
export function useMyClaim(slug: string) {
  const session = useSession();
  return useQuery({
    queryKey: ['my-claim', slug],
    queryFn: () => getMyClaim(slug),
    enabled: !!session.data?.user && !!slug,
  });
}
