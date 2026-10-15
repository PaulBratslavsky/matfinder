import { Badge, Box, Flex, Typography } from '@strapi/design-system';
import { Widget, useFetchClient } from '@strapi/strapi/admin';
import { useEffect, useState } from 'react';
import { ROLE_LABELS, STATUS, age, type Claim } from '../claims';
import { startPolling } from '../poll';

type Summary = {
  claims: { pending: number; contacted: number; claimed: number; newest: Pick<Claim, 'schoolName' | 'name' | 'role' | 'status' | 'createdAt'>[] };
};

/** Homepage widget: claims waiting for review (new and contacted) and the newest few. */
export default function ClaimsWidget() {
  const { get } = useFetchClient();
  const [data, setData] = useState<Summary['claims'] | null>(null);
  const [error, setError] = useState(false);

  useEffect(
    () =>
      startPolling(async () => {
        try {
          setData(((await get('/matfinder/summary')).data as Summary).claims);
          setError(false);
        } catch {
          setError(true);
        }
      }, 15_000),
    [get],
  );

  if (!data && error) return <Widget.Error />;
  if (!data) return <Widget.Loading />;
  if (!data.pending && !data.contacted) return <Widget.NoData>No claims waiting for review</Widget.NoData>;
  return (
    <Flex direction="column" alignItems="stretch" gap={3} height="100%">
      <Flex gap={4}>
        <Typography variant="alpha" tag="p">
          {data.pending}
        </Typography>
        <Typography variant="pi" textColor="neutral600">
          new
        </Typography>
        <Typography variant="alpha" tag="p">
          {data.contacted}
        </Typography>
        <Typography variant="pi" textColor="neutral600">
          contacted
        </Typography>
      </Flex>
      <Box style={{ overflowY: 'auto', flex: 1 }}>
        <Flex direction="column" alignItems="stretch" gap={2}>
          {data.newest.map((c, i) => (
            <Flex key={i} justifyContent="space-between" gap={2}>
              <Box style={{ minWidth: 0 }}>
                <Typography fontWeight="semiBold" ellipsis>
                  {c.schoolName}
                </Typography>
                <Typography variant="pi" textColor="neutral600" ellipsis>
                  {c.name} · {ROLE_LABELS[c.role]} · {age(c.createdAt)}
                </Typography>
              </Box>
              <Badge variant={STATUS[c.status].variant}>{STATUS[c.status].label}</Badge>
            </Flex>
          ))}
        </Flex>
      </Box>
    </Flex>
  );
}
