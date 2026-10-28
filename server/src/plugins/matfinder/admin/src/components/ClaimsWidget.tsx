import { Badge, Box, Flex, Typography } from '@strapi/design-system';
import { Clock, Phone } from '@strapi/icons';
import { Widget, useFetchClient } from '@strapi/strapi/admin';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { styled } from 'styled-components';
import { ROLE_LABELS, STATUS, age, type Claim } from '../claims';
import { startPolling } from '../poll';
import { pagePath } from '../tabs';
import { StatGrid } from './StatGrid';

type Summary = {
  claims: { pending: number; contacted: number; claimed: number; newest: Pick<Claim, 'schoolName' | 'name' | 'role' | 'status' | 'createdAt'>[] };
};

// One newest claim: a link to the Claims tab, divided like the rows of Strapi's "Last edited entries" widget.
const Row = styled(Link)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spaces[2]};
  padding: ${({ theme }) => `${theme.spaces[2]} ${theme.spaces[1]}`};
  text-decoration: none;
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral150};

  &:last-child {
    border-bottom: none;
  }
  &:hover {
    background: ${({ theme }) => theme.colors.neutral100};
  }
`;

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
    <Flex direction="column" alignItems="stretch" gap={4}>
      <StatGrid
        stats={[
          { label: 'New', value: data.pending, icon: <Clock />, tone: 'warning', to: pagePath('claims', { status: 'pending' }) },
          { label: 'Contacted', value: data.contacted, icon: <Phone />, tone: 'secondary', to: pagePath('claims', { status: 'contacted' }) },
        ]}
      />
      <Box>
        {data.newest.map((c, i) => (
          <Row key={i} to={pagePath('claims')}>
            <Box flex={1} minWidth={0}>
              <Typography fontWeight="semiBold" textColor="neutral800" ellipsis>
                {c.schoolName}
              </Typography>
              <Typography variant="pi" textColor="neutral600" ellipsis>
                {c.name} · {ROLE_LABELS[c.role]} · {age(c.createdAt)}
              </Typography>
            </Box>
            <Badge variant={STATUS[c.status].variant}>{STATUS[c.status].label}</Badge>
          </Row>
        ))}
      </Box>
    </Flex>
  );
}
