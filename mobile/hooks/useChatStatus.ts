import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/client';
import { useSession } from './useSession';

/**
 * Whether the gym chat is set up on the server (`GET /api/matfinder/chat/status`). The gym page shows "Ask about this
 * gym" only when it is; it's false without an AI key. Signed-in only, like the gym page.
 */
export function useChatStatus() {
  const session = useSession();
  return useQuery({
    queryKey: ['gym-chat-status'],
    queryFn: () => apiGet<{ ready: boolean }>('/api/matfinder/chat/status'),
    enabled: !!session.data?.user,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}
