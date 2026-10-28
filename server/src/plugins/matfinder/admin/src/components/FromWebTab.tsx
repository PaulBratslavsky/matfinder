import { Flex, Link, MenuItem, SimpleMenu, Tooltip, Typography } from '@strapi/design-system';
import { WarningCircle } from '@strapi/icons';
import { Layouts, Table, useFetchClient, useNotification } from '@strapi/strapi/admin';
import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { editGymPath, formatDay, type GymStatus } from '../status';
import { stopRowClick as stop, textColumn } from './cells';
import { GymStatusPill } from './GymStatusPill';

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

const HEADERS = [
  { name: 'name', label: 'Gym' },
  { name: 'status', label: 'Status' },
  { name: 'sources', label: 'Sources' },
  { name: 'duplicates', label: 'Possible duplicates' },
  { name: 'discoveredAt', label: 'Found' },
];

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
 * so this is where you spot-check them: a row opens the gym in the Content Manager to correct, unpublish or delete it.
 */
export function FromWebTab({ onCount }: { onCount?: (n: number) => void }) {
  const { get } = useFetchClient();
  const { toggleNotification } = useNotification();
  const navigate = useNavigate();
  const [items, setItems] = useState<WebGym[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    get('/matfinder/from-web')
      .then((res) => {
        if (!alive) return;
        const data = res.data as { items: WebGym[]; notLive: number };
        setItems(data.items);
        onCount?.(data.notLive);
      })
      .catch(() => {
        if (!alive) return;
        setItems([]);
        setFailed(true);
        toggleNotification({ type: 'danger', message: "Couldn't load the gyms from the web. Try again." });
      });
    return () => {
      alive = false;
    };
  }, [get, toggleNotification, onCount]);

  const rows = (items ?? []).map((g) => ({ ...g, id: g.documentId }));

  return (
    <Layouts.Content>
      <Table.Root rows={rows} headers={HEADERS} isLoading={items === null}>
        <Table.Content>
          <Table.Head>
            {HEADERS.map((h) => (
              <Table.HeaderCell key={h.name} {...h} />
            ))}
          </Table.Head>
          <Table.Loading />
          <Table.Empty
            content={failed ? "Couldn't load the gyms from the web." : 'No gyms from the web yet. Gyms an agent adds with add_gym_from_web show up here.'}
          />
          <Table.Body>
            {rows.map((g) => {
              const area = [g.neighborhood, g.city?.name].filter(Boolean).join(', ');
              return (
                <Table.Row key={g.id} cursor="pointer" onClick={() => navigate(editGymPath(g.documentId))}>
                  <Table.Cell style={textColumn(45)}>
                    <Typography tag={RouterLink} to={editGymPath(g.documentId)} onClick={stop} textColor="neutral800" textDecoration="none" fontWeight="semiBold" ellipsis title={g.name}>
                      {g.name}
                    </Typography>
                    {area && (
                      <Typography variant="pi" textColor="neutral600" ellipsis>
                        {area}
                      </Typography>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <GymStatusPill status={g.status} />
                  </Table.Cell>
                  <Table.Cell onClick={stop}>
                    {g.sourceUrls[0] ? (
                      // The first source, and the others in a menu.
                      <Flex gap={1} alignItems="center">
                        <Link href={g.sourceUrls[0]} isExternal>
                          {hostOf(g.sourceUrls[0])}
                        </Link>
                        {g.sourceUrls.length > 1 && (
                          <SimpleMenu label={`+${g.sourceUrls.length - 1}`} aria-label="More sources" variant="ghost" size="S">
                            {g.sourceUrls.slice(1).map((u) => (
                              <MenuItem key={u} href={u} isExternal>
                                {hostOf(u)}
                              </MenuItem>
                            ))}
                          </SimpleMenu>
                        )}
                      </Flex>
                    ) : (
                      <Typography textColor="neutral500">—</Typography>
                    )}
                  </Table.Cell>
                  <Table.Cell style={textColumn(25)}>
                    {g.possibleDuplicates.length ? (
                      <Tooltip label={g.possibleDuplicates.map((d) => `${d.name}: ${d.reasons.join(', ')}`).join(' · ')}>
                        <Flex gap={1} alignItems="center" color="warning600">
                          <WarningCircle aria-hidden />
                          <Typography textColor="warning600" ellipsis minWidth={0}>
                            {g.possibleDuplicates.length === 1 ? g.possibleDuplicates[0].name : `${g.possibleDuplicates.length} possible duplicates`}
                          </Typography>
                        </Flex>
                      </Tooltip>
                    ) : (
                      <Typography textColor="neutral500">None</Typography>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <Typography textColor="neutral800">{formatDay(g.discoveredAt)}</Typography>
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Content>
      </Table.Root>
    </Layouts.Content>
  );
}
