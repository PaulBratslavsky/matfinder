import { createContext, useContext, type ReactNode } from 'react';
import { authClient } from '@/lib/auth-client';

type SessionState = ReturnType<typeof authClient.useSession>;

const SessionContext = createContext<SessionState | null>(null);

/** Reads the Better Auth session once for the whole app (root layout). */
export function AuthProvider({ children }: { children: ReactNode }) {
  const session = authClient.useSession();
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

/** `{ data, isPending, refetch }`; `data` is null when signed out. */
export function useSession(): SessionState {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession must be used inside <AuthProvider>');
  return session;
}

/** Where to go after signing in or up: the `redirect` param if it's an in-app path, else Explore. */
export function safeRedirect(raw: unknown): string {
  const r = Array.isArray(raw) ? raw[0] : raw;
  return typeof r === 'string' && r.startsWith('/') && !r.startsWith('//') && !r.startsWith('/sign-') ? r : '/';
}
