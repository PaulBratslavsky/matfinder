import {
  Badge,
  Box,
  Button,
  Flex,
  Link,
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
import { useFetchClient, useNotification, useRBAC } from '@strapi/strapi/admin';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { ACTION_COPY, ROLE_LABELS, STATUS, actionsFor, age, type Claim, type ClaimAction, type ClaimStatus } from '../claims';
import { PERMISSIONS } from '../permissions';
import { singleFlight } from '../singleFlight';
import { editGymPath, formatDay } from '../status';
import { ClaimDialog } from './ClaimDialog';

const FILTERS: { value: 'open' | ClaimStatus | 'all'; label: string }[] = [
  { value: 'open', label: 'Waiting for review' },
  { value: 'pending', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Owner removed' },
  { value: 'all', label: 'All claims' },
];

/**
 * Gym owners' claims. Contact the owner (phone, email), then accept or reject. Accepting marks the gym as claimed in
 * the app; only admins see who claimed it.
 */
export function ClaimsTab({ onChanged }: { onChanged?: () => void }) {
  const { get, post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const { allowedActions } = useRBAC(PERMISSIONS.review);
  const canReview = allowedActions.canReview === true;
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['value']>('open');
  const [items, setItems] = useState<Claim[] | null>(null);
  const [dialog, setDialog] = useState<{ claim: Claim; action: ClaimAction } | null>(null);
  const [refresh, setRefresh] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    const ticket = ++latest.current;
    const status = filter === 'open' || filter === 'all' ? undefined : filter;
    get('/matfinder/claims', { params: status ? { status } : {} })
      .then((res) => {
        if (ticket !== latest.current) return;
        const all = (res.data as { items: Claim[] }).items;
        setItems(filter === 'open' ? all.filter((c) => c.status === 'pending' || c.status === 'contacted') : all);
      })
      .catch(() => ticket === latest.current && toggleNotification({ type: 'danger', message: "Couldn't load the claims. Try again." }));
  }, [get, toggleNotification, filter, refresh]);

  const run = useMemo(
    () =>
      singleFlight(async (claim: Claim, action: ClaimAction, note: string) => {
        try {
          await post(`/matfinder/claims/${claim.documentId}/${action}`, { note });
          toggleNotification({ type: 'success', message: `${ACTION_COPY[action].confirm}: done.` });
          setRefresh((n) => n + 1);
          onChanged?.();
          return true;
        } catch (e: any) {
          const message = e?.response?.data?.error?.message ?? 'That didn’t work. Try again.';
          toggleNotification({ type: 'danger', message });
          return false;
        }
      }),
    [post, toggleNotification, onChanged],
  );
  const confirm = useCallback(async (note: string) => (dialog ? ((await run(dialog.claim, dialog.action, note)) ?? false) : false), [dialog, run]);

  return (
    <Flex direction="column" alignItems="stretch" gap={4}>
      <Box style={{ maxWidth: 260 }}>
        <SingleSelect aria-label="Show claims" value={filter} onChange={(v: string | number) => setFilter(v as typeof filter)}>
          {FILTERS.map((f) => (
            <SingleSelectOption key={f.value} value={f.value}>
              {f.label}
            </SingleSelectOption>
          ))}
        </SingleSelect>
      </Box>

      {items && items.length === 0 ? (
        <Box padding={6} background="neutral0" hasRadius>
          <Typography textColor="neutral600">
            {filter === 'open' ? 'No claims waiting. Owners claim a gym from its page in the app.' : 'No claims with this status.'}
          </Typography>
        </Box>
      ) : (
        <Table colCount={6} rowCount={(items?.length ?? 0) + 1}>
          <Thead>
            <Tr>
              <Th>
                <Typography variant="sigma">Gym</Typography>
              </Th>
              <Th>
                <Typography variant="sigma">Who</Typography>
              </Th>
              <Th>
                <Typography variant="sigma">Contact</Typography>
              </Th>
              <Th>
                <Typography variant="sigma">Note</Typography>
              </Th>
              <Th>
                <Typography variant="sigma">Status</Typography>
              </Th>
              <Th>
                <Typography variant="sigma">Actions</Typography>
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {items?.map((c) => (
              <Tr key={c.documentId}>
                <Td>
                  <Flex direction="column" alignItems="flex-start" gap={1}>
                    <Link tag={RouterLink} to={editGymPath(c.schoolDocumentId)}>
                      {c.schoolName}
                    </Link>
                    <Typography variant="pi" textColor="neutral600">
                      {age(c.createdAt)}
                    </Typography>
                  </Flex>
                </Td>
                <Td>
                  <Flex direction="column" alignItems="flex-start" gap={1}>
                    <Typography fontWeight="semiBold">{c.name}</Typography>
                    <Typography variant="pi" textColor="neutral600">
                      {ROLE_LABELS[c.role]}
                    </Typography>
                  </Flex>
                </Td>
                <Td>
                  <Flex direction="column" alignItems="flex-start" gap={1}>
                    <Typography>{c.phone}</Typography>
                    <Typography variant="pi" textColor="neutral600">
                      {c.email}
                    </Typography>
                  </Flex>
                </Td>
                <Td style={{ maxWidth: 320, whiteSpace: 'normal' }}>
                  <Typography variant="pi">{c.message ?? ''}</Typography>
                  {!!c.adminNote && (
                    <Typography variant="pi" textColor="neutral600" tag="p" style={{ marginTop: 4 }}>
                      Admin: {c.adminNote}
                    </Typography>
                  )}
                </Td>
                <Td>
                  <Flex direction="column" alignItems="flex-start" gap={1}>
                    <Badge variant={STATUS[c.status].variant}>{STATUS[c.status].label}</Badge>
                    {(c.decidedAt || c.contactedAt) && (
                      <Typography variant="pi" textColor="neutral600">
                        {formatDay(c.decidedAt ?? c.contactedAt)}
                        {c.handledBy ? ` · ${c.handledBy}` : ''}
                      </Typography>
                    )}
                  </Flex>
                </Td>
                <Td>
                  <Flex gap={2} wrap="wrap">
                    {canReview &&
                      actionsFor(c.status).map((a) => (
                        <Button
                          key={a}
                          size="S"
                          variant={a === 'accept' ? 'success-light' : a === 'reject' || a === 'remove-owner' ? 'danger-light' : 'secondary'}
                          onClick={() => setDialog({ claim: c, action: a })}
                        >
                          {ACTION_COPY[a].button}
                        </Button>
                      ))}
                  </Flex>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      {dialog && <ClaimDialog claim={dialog.claim} action={dialog.action} onClose={() => setDialog(null)} onConfirm={confirm} />}
    </Flex>
  );
}
