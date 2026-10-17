import {
  Badge,
  Box,
  Button,
  Flex,
  Link,
  Searchbar,
  SingleSelect,
  SingleSelectOption,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
} from '@strapi/design-system';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';
import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { STATUS_LABELS, editGymPath, formatDay, type GymStatus } from '../status';

type Gym = {
  documentId: string;
  slug: string;
  name: string;
  neighborhood: string | null;
  city: { slug: string; name: string } | null;
  affiliation: { slug: string; name: string } | null;
  status: GymStatus;
  updatedAt: string;
  lastVerifiedAt: string | null;
};
type GymPage = { items: Gym[]; page: number; limit: number; total: number; hasMore: boolean };

const LIMIT = 25;
const FILTERS: { value: 'any' | GymStatus; label: string }[] = [
  { value: 'any', label: 'All statuses' },
  { value: 'published', label: 'Published' },
  { value: 'unpublished-changes', label: 'Changes not published' },
  { value: 'never-published', label: 'Draft' },
];

/** Every gym, with its publish status. A name opens the gym in the Content Manager, where it's edited and published. */
export function GymsTab() {
  const { get } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'any' | GymStatus>('any');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<GymPage | null>(null);
  const [loading, setLoading] = useState(true);
  // Only the newest request may update the table (typing fires several).
  const latest = useRef(0);

  // Search after a short pause, from page 1.
  useEffect(() => {
    const id = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    const ticket = ++latest.current;
    setLoading(true);
    get('/matfinder/gyms', { params: { search: query || undefined, status, page, limit: LIMIT } })
      .then((res) => {
        if (ticket === latest.current) setData(res.data as GymPage);
      })
      .catch(() => {
        if (ticket === latest.current) toggleNotification({ type: 'danger', message: "Couldn't load the gyms. Try again." });
      })
      .finally(() => {
        if (ticket === latest.current) setLoading(false);
      });
  }, [get, toggleNotification, query, status, page]);

  const pages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;

  return (
    <Flex direction="column" alignItems="stretch" gap={4}>
      <Flex gap={3} wrap="wrap">
        <Box style={{ flex: '1 1 280px' }}>
          <Searchbar
            name="search"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
            clearLabel="Clear the search"
            placeholder="Search by name, neighborhood or ZIP"
          >
            Search gyms
          </Searchbar>
        </Box>
        <Box style={{ flex: '0 0 240px' }}>
          <SingleSelect
            aria-label="Publish status"
            value={status}
            onChange={(v: string | number) => {
              setStatus(v as 'any' | GymStatus);
              setPage(1);
            }}
          >
            {FILTERS.map((f) => (
              <SingleSelectOption key={f.value} value={f.value}>
                {f.label}
              </SingleSelectOption>
            ))}
          </SingleSelect>
        </Box>
      </Flex>

      <Table colCount={6} rowCount={(data?.items.length ?? 0) + 1}>
        <Thead>
          <Tr>
            <Th>
              <Typography variant="sigma">Gym</Typography>
            </Th>
            <Th>
              <Typography variant="sigma">Area</Typography>
            </Th>
            <Th>
              <Typography variant="sigma">Team</Typography>
            </Th>
            <Th>
              <Typography variant="sigma">Status</Typography>
            </Th>
            <Th>
              <Typography variant="sigma">Schedule verified</Typography>
            </Th>
            <Th>
              <Typography variant="sigma">Updated</Typography>
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          {data?.items.map((g) => (
            <Tr key={g.documentId}>
              <Td>
                <Link tag={RouterLink} to={editGymPath(g.documentId)}>
                  {g.name}
                </Link>
              </Td>
              <Td>
                <Typography>{[g.neighborhood, g.city?.name].filter(Boolean).join(', ')}</Typography>
              </Td>
              <Td>
                <Typography>{g.affiliation?.name ?? ''}</Typography>
              </Td>
              <Td>
                <Badge variant={STATUS_LABELS[g.status].variant}>{STATUS_LABELS[g.status].label}</Badge>
              </Td>
              <Td>
                <Typography textColor={g.lastVerifiedAt ? 'neutral800' : 'neutral500'}>{formatDay(g.lastVerifiedAt) || 'Never'}</Typography>
              </Td>
              <Td>
                <Typography>{formatDay(g.updatedAt)}</Typography>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      {!loading && data?.items.length === 0 && (
        <Box padding={6} background="neutral0" hasRadius>
          <Typography textColor="neutral600">No gyms match. Clear the search or pick another status.</Typography>
        </Box>
      )}

      <Flex justifyContent="space-between" alignItems="center">
        <Typography textColor="neutral600" aria-live="polite">
          {data ? `${data.total} gym${data.total === 1 ? '' : 's'}${pages > 1 ? ` · page ${page} of ${pages}` : ''}` : 'Loading…'}
        </Typography>
        <Flex gap={2}>
          <Button variant="tertiary" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button variant="tertiary" disabled={!data?.hasMore || loading} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </Flex>
      </Flex>
    </Flex>
  );
}
