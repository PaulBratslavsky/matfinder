import { Flex, Loader, Typography } from '@strapi/design-system';
import { ChevronDown } from '@strapi/icons';
import { styled } from 'styled-components';
import type { ToolBoxModel } from '../../assistant';

/**
 * One tool call in the answer, closed at first (the maison plugin's tool boxes): "Tool: list_claims · 3 results", and
 * the result as JSON when opened. A failed one takes the danger colour and shows the tool's own message.
 */
const Box = styled.details<{ $failed: boolean }>`
  border: 1px solid ${({ theme, $failed }) => ($failed ? theme.colors.danger600 : theme.colors.neutral200)};
  border-radius: ${({ theme }) => theme.borderRadius};
  background: ${({ theme }) => theme.colors.neutral0};
  margin: 0.4rem 0 0.8rem;

  summary {
    cursor: pointer;
    padding: 0.6rem 1rem;
    list-style: none;
    display: flex;
    align-items: center;
    gap: 0.8rem;
  }
  summary::-webkit-details-marker { display: none; }
  summary > svg {
    flex-shrink: 0;
    width: 1.2rem;
    height: 1.2rem;
    fill: ${({ theme }) => theme.colors.neutral500};
    transform: rotate(-90deg);
    transition: transform 0.15s;
  }
  &[open] > summary > svg { transform: none; }
  pre {
    margin: 0;
    padding: 0.8rem 1rem;
    max-height: 28rem;
    overflow: auto;
    border-top: 1px solid ${({ theme }) => theme.colors.neutral200};
    font-size: 1.2rem;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    color: ${({ theme }) => theme.colors.neutral800};
  }
`;

export function ToolBox({ box, label }: { box: ToolBoxModel; label?: string }) {
  const failed = box.state === 'failed';
  return (
    <Box $failed={failed}>
      <summary>
        <ChevronDown aria-hidden />
        <Flex tag="span" gap={2} alignItems="center" wrap="wrap">
          <Typography variant="pi" fontWeight="bold" textColor="neutral800">
            Tool: {box.name}
          </Typography>
          {!!label && (
            <Typography variant="pi" textColor="neutral600">
              ({label})
            </Typography>
          )}
          <Typography variant="pi" textColor={failed ? 'danger600' : box.state === 'denied' ? 'warning600' : 'neutral600'}>
            · {box.status}
          </Typography>
          {box.state === 'running' && <Loader small>Running</Loader>}
        </Flex>
      </summary>
      {!!box.body && <pre>{box.body}</pre>}
    </Box>
  );
}
