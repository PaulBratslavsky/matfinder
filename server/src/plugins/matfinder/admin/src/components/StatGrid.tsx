import { Box, Flex, Typography } from '@strapi/design-system';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { styled } from 'styled-components';

type Tone = 'primary' | 'success' | 'warning' | 'secondary' | 'alternative' | 'danger' | 'neutral';
/** `hint` is the cell's tooltip, for a label that needs more words than fit. */
export type Stat = { label: string; value: number; icon: ReactNode; tone: Tone; to: string; hint?: string };

// A bordered two-column grid of linked numbers, like Strapi's own "Project statistics" homepage widget.
const Grid = styled(Box)`
  display: grid;
  grid-template-columns: 1fr 1fr;
  border: 1px solid ${({ theme }) => theme.colors.neutral200};
  border-radius: ${({ theme }) => theme.borderRadius};
  overflow: hidden;
`;

const Cell = styled(Link)`
  display: flex;
  padding: ${({ theme }) => theme.spaces[3]};
  text-decoration: none;
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral200};
  border-right: 1px solid ${({ theme }) => theme.colors.neutral200};

  &:nth-child(2n) {
    border-right: none;
  }
  &:nth-last-child(-n + 2) {
    border-bottom: none;
  }
`;

/** Numbers for a homepage widget, two per row (pass an even count so the grid has no empty slot). */
export function StatGrid({ stats }: { stats: Stat[] }) {
  return (
    <Grid>
      {stats.map((s) => (
        <Cell key={s.label} to={s.to} title={s.hint}>
          <Flex alignItems="center" gap={2}>
            <Flex padding={2} borderRadius={1} background={`${s.tone}100`} color={`${s.tone}600`}>
              {s.icon}
            </Flex>
            <Flex direction="column" alignItems="flex-start">
              <Typography variant="pi" fontWeight="bold" textColor="neutral500">
                {s.label}
              </Typography>
              <Typography variant="omega" fontWeight="bold" textColor="neutral800">
                {s.value}
              </Typography>
            </Flex>
          </Flex>
        </Cell>
      ))}
    </Grid>
  );
}
