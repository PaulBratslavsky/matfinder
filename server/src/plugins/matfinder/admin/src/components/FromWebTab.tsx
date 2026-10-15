import { Badge, Box, Flex, Link, Table, Tbody, Td, Th, Thead, Tr, Typography } from '@strapi/design-system';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';
import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { STATUS_LABELS, editGymPath, formatDay, type GymStatus } from '../status';

type WebGym = {
  documentId: string;
  slug: string;
  name: string;
  neighborhood: string | null;
  city: { slug: string; name: string } | null;
  sourceUrls: string[];
  discoveredAt: string | null;
  status: GymStatus;
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
 * Every gym the web agent added, newest first. They go live as soon as the agent adds them (unless autoPublish is off),
 * so this is where you spot-check them: the name opens the gym in the Content Manager to correct, unpublish or delete it.
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
        const data = res.data as { items: WebGym[]; notLive: number };
        setItems(data.items);
        onCount?.(data.notLive);
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
          No gyms from the web yet. Gyms an agent adds with add_gym_from_web show up here.
        </Typography>
      </Box>
    );
  }

  return (
    <Table colCount={6} rowCount={(items?.length ?? 0) + 1}>
      <Thead>
        <Tr>
          <Th>
            <Typography variant="sigma">Gym</Typography>
          </Th>
          <Th>
            <Typography variant="sigma">Area</Typography>
          </Th>
          <Th>
            <Typography variant="sigma">Status</Typography>
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
              <Badge variant={STATUS_LABELS[g.status].variant}>{STATUS_LABELS[g.status].label}</Badge>
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
