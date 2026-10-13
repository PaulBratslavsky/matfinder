import { useQuery } from '@tanstack/react-query';
import { AuthRequiredError } from '@/lib/api/client';
import { getSchoolBySlug, type SchoolPage } from '@/lib/api/schools';
import { useSession } from './useSession';

/** The full school page; only fetched with a session (the server answers 401/403 otherwise). */
export function useSchool(slug: string) {
  const session = useSession();
  return useQuery({
    queryKey: ['school', slug],
    queryFn: () => getSchoolBySlug<SchoolPage>(slug),
    enabled: !!session.data?.user && !!slug,
    // An expired session is not worth retrying: the screen sends the user to sign in.
    retry: (count, error) => !(error instanceof AuthRequiredError) && count < 2,
  });
}
