import { Box, Flex, Grid, Typography } from '@strapi/design-system';
import { Widget, useFetchClient } from '@strapi/strapi/admin';
import { useEffect, useState } from 'react';
import { startPolling } from '../poll';

type Summary = { gyms: { total: number; published: number; unpublishedChanges: number; neverPublished: number; fromWeb: { thisWeek: number } } };

function Tile({ value, label }: { value: number; label: string }) {
  return (
    <Box padding={3} hasRadius background="neutral100" width="100%">
      <Flex direction="column" alignItems="flex-start" gap={1}>
        <Typography variant="alpha" tag="p">
          {value}
        </Typography>
        <Typography variant="pi" textColor="neutral600">
          {label}
        </Typography>
      </Flex>
    </Box>
  );
}

/** Homepage widget: how many gyms are published, added by the agent this week, waiting with changes, or still drafts. */
export default function DirectoryWidget() {
  const { get } = useFetchClient();
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState(false);

  useEffect(
    () =>
      startPolling(async () => {
        try {
          const res = await get('/matfinder/summary');
          setData(res.data as Summary);
          setError(false);
        } catch {
          // Keep the last numbers on a failed refresh; show the error only when there's nothing to show.
          setError(true);
        }
      }, 30_000),
    [get],
  );

  if (!data && error) return <Widget.Error />;
  if (!data) return <Widget.Loading />;
  const g = data.gyms;
  if (g.total === 0) return <Widget.NoData>No gyms yet</Widget.NoData>;
  return (
    <Grid.Root gap={3} gridCols={3}>
      <Grid.Item col={1}>
        <Tile value={g.published} label="Published" />
      </Grid.Item>
      <Grid.Item col={1}>
        <Tile value={g.fromWeb.thisWeek} label="From the web this week" />
      </Grid.Item>
      <Grid.Item col={1}>
        <Tile value={g.unpublishedChanges} label="Changes waiting" />
      </Grid.Item>
      <Grid.Item col={1}>
        <Tile value={g.neverPublished} label="Drafts" />
      </Grid.Item>
      <Grid.Item col={1}>
        <Tile value={g.total} label="All gyms" />
      </Grid.Item>
    </Grid.Root>
  );
}
