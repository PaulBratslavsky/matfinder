import { Badge, Box, Flex, Link, Table, Tbody, Td, Th, Thead, Tr, Typography } from '@strapi/design-system';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';
import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { editGymPath, formatDay } from '../status';

type WebGym = {
  documentId: string;
  slug: string;
  name: string;
  neighborhood: string | null;
  city: { slug: string; name: string } | null;
  sourceUrls: string[];
  discoveredAt: string | null;
  possibleDuplicates: { slug: string; name: string; reasons: string[] }[];
};

/** The page's host, for a short link label: https://www.example.com/a/b → example.com */
const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

/**
 * Gyms the web agent added that nobody has published yet. Review opens the gym in the Content Manager, where you check
 * the facts against the sources and publish it, or delete it.
 */
export function FromWebTab({ onCount }: { onCount?: (n: number) => void }) {
  const { get } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [items, setItems] = useState<WebGym[] | null>(null);

  useEffect(() => {
    let alive = true;
    get('/matfinder/from-web')
      .then((res) => {
        if (!alive) return;
        const data = res.data as { items: WebGym[]; total: number };
        setItems(data.items);
        onCount?.(data.total);
      })
      .catch(() => alive && toggleNotification({ type: 'danger', message: "Couldn't load the gyms from the web. Try again." }));
    return () => {
      alive = false;
    };
  }, [get, toggleNotification, onCount]);

  if (items && items.length === 0) {
    return (
      <Box padding={6} background="neutral0" hasRadius>
        <Typography textColor="neutral600">
          Nothing to review. Gyms an agent adds with add_gym_from_web show up here until they're published.
        </Typography>
      </Box>
    );
  }

  return (
    <Table colCount={5} rowCount={(items?.length ?? 0) + 1}>
      <Thead>
        <Tr>
          <Th>
            <Typography variant="sigma">Gym</Typography>
          </Th>
          <Th>
            <Typography variant="sigma">Area</Typography>
          </Th>
          <Th>
            <Typography variant="sigma">Sources</Typography>
          </Th>
          <Th>
            <Typography variant="sigma">Possible duplicates</Typography>
          </Th>
          <Th>
            <Typography variant="sigma">Found</Typography>
          </Th>
        </Tr>
      </Thead>
      <Tbody>
        {items?.map((g) => (
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
              <Flex direction="column" alignItems="flex-start" gap={1}>
                {g.sourceUrls.map((u) => (
                  <Link key={u} href={u} isExternal>
                    {hostOf(u)}
                  </Link>
                ))}
              </Flex>
            </Td>
            <Td>
              {g.possibleDuplicates.length ? (
                <Flex direction="column" alignItems="flex-start" gap={1}>
                  {g.possibleDuplicates.map((d) => (
                    <Typography key={d.slug} variant="omega">
                      <Badge variant="warning">{d.name}</Badge> {d.reasons.join(', ')}
                    </Typography>
                  ))}
                </Flex>
              ) : (
                <Typography textColor="neutral500">None</Typography>
              )}
            </Td>
            <Td>
              <Typography>{formatDay(g.discoveredAt)}</Typography>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
