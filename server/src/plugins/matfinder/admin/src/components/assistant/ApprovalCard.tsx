import { Box, Button, Flex, Typography } from '@strapi/design-system';
import { Check, Cross } from '@strapi/icons';
import { useState } from 'react';
import { approvalDetails } from '../../assistant';

/**
 * A change the assistant wants to make, waiting for the admin: what it does (the model's one-sentence summary), the
 * tool and its exact arguments, Approve and Deny. Nothing is written until Approve; each button works once.
 */
export function ApprovalCard({
  label,
  args,
  onDecide,
}: {
  label: string;
  args: Record<string, unknown>;
  /** False when the decision couldn't be sent. */
  onDecide: (approved: boolean) => boolean;
}) {
  const [decided, setDecided] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);
  const summary = typeof args.summary === 'string' ? args.summary : null;
  const decide = (approved: boolean) => {
    if (decided !== null) return;
    if (onDecide(approved)) setDecided(approved);
    else setFailed(true);
  };
  return (
    <Box padding={4} hasRadius background="warning100" borderColor="warning200" borderStyle="solid" borderWidth="1px" marginTop={2} marginBottom={2}>
      <Flex direction="column" alignItems="stretch" gap={3}>
        <Typography variant="sigma" textColor="warning700">
          Approve this change? · {label}
        </Typography>
        {!!summary && (
          <Typography variant="omega" fontWeight="semiBold" textColor="neutral800">
            {summary}
          </Typography>
        )}
        <Box tag="dl" margin={0}>
          {approvalDetails(args).map(({ key, value }) => (
            <Flex key={key} gap={2} alignItems="baseline">
              <Typography tag="dt" variant="pi" fontWeight="bold" textColor="neutral600" style={{ minWidth: '9rem' }}>
                {key}
              </Typography>
              <Typography tag="dd" variant="pi" textColor="neutral800" style={{ margin: 0, overflowWrap: 'anywhere' }}>
                {value}
              </Typography>
            </Flex>
          ))}
        </Box>
        <Typography variant="pi" textColor="neutral600">
          It goes live in the app as soon as you approve it.
        </Typography>
        {failed && (
          <Typography variant="pi" textColor="danger600" role="alert">
            Your decision couldn't be sent: this change is no longer waiting. Start a new chat and ask again.
          </Typography>
        )}
        <Flex gap={2}>
          <Button startIcon={<Check />} onClick={() => decide(true)} disabled={decided !== null || failed} loading={decided === true}>
            Approve
          </Button>
          <Button variant="tertiary" startIcon={<Cross />} onClick={() => decide(false)} disabled={decided !== null || failed}>
            Deny
          </Button>
        </Flex>
      </Flex>
    </Box>
  );
}
