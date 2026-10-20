import { Badge, Box, Flex, IconButton, SingleSelect, SingleSelectOption, Th, Tooltip, Typography, VisuallyHidden } from '@strapi/design-system';
import { Check, Cross, Filter, Phone, Trash } from '@strapi/icons';
import { Layouts, Table, useFetchClient, useNotification, useQueryParams, useRBAC } from '@strapi/strapi/admin';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { ACTION_COPY, ROLE_LABELS, STATUS, actionsFor, age, type Claim, type ClaimAction, type ClaimStatus } from '../claims';
import { PERMISSIONS } from '../permissions';
import { singleFlight } from '../singleFlight';
import { editGymPath, formatDay } from '../status';
import { textColumn } from './cells';
import { ClaimDialog } from './ClaimDialog';

type ClaimFilter = 'open' | ClaimStatus | 'all';
const FILTERS: { value: ClaimFilter; label: string }[] = [
  { value: 'open', label: 'Waiting for review' },
  { value: 'pending', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Owner removed' },
  { value: 'all', label: 'All claims' },
];
const isFilter = (v: unknown): v is ClaimFilter => FILTERS.some((f) => f.value === v);
const HEADERS = [
  { name: 'gym', label: 'Gym' },
  { name: 'claimant', label: 'Claimant' },
  { name: 'note', label: 'Note' },
  { name: 'status', label: 'Status' },
];
const ACTIONS_HEADER = { name: 'actions', label: 'Actions' };
const ICONS: Record<ClaimAction, React.ReactNode> = { contacted: <Phone />, accept: <Check />, reject: <Cross />, 'remove-owner': <Trash /> };

/**
 * Gym owners' claims. Contact the owner (phone, email), then accept or reject. Accepting marks the gym as claimed in
 * the app; only admins see who claimed it. The status filter lives in ?status=, so links can open a filtered board.
 */
export function ClaimsTab({ onChanged }: { onChanged?: () => void }) {
  const { get, post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const { allowedActions } = useRBAC(PERMISSIONS.review);
  const canReview = allowedActions.canReview === true;
  const [{ query }, setQuery] = useQueryParams<{ status?: string }>();
  const filter: ClaimFilter = isFilter(query.status) ? query.status : 'open';
  const [items, setItems] = useState<Claim[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [dialog, setDialog] = useState<{ claim: Claim; action: ClaimAction } | null>(null);
  const [refresh, setRefresh] = useState(0);
  const latest = useRef(0);

  // A new filter shows the loader; a refresh after an action keeps the rows until the new ones arrive.
  useEffect(() => setItems(null), [filter]);
  useEffect(() => {
    const ticket = ++latest.current;
    const status = filter === 'open' || filter === 'all' ? undefined : filter;
    get('/matfinder/claims', { params: status ? { status } : {} })
      .then((res) => {
        if (ticket !== latest.current) return;
        const all = (res.data as { items: Claim[] }).items;
        setItems(filter === 'open' ? all.filter((c) => c.status === 'pending' || c.status === 'contacted') : all);
        setFailed(false);
      })
      .catch(() => {
        if (ticket !== latest.current) return;
        setItems((prev) => prev ?? []);
        setFailed(true);
        toggleNotification({ type: 'danger', message: "Couldn't load the claims. Try again." });
      });
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

  const headers = canReview ? [...HEADERS, ACTIONS_HEADER] : HEADERS;
  const rows = (items ?? []).map((c) => ({ ...c, id: c.documentId }));
  const empty = failed
    ? "Couldn't load the claims."
    : filter === 'open'
      ? 'No claims waiting. Owners claim a gym from its page in the app.'
      : 'No claims with this status.';

  return (
    <>
      <Layouts.Action
        startActions={
          <SingleSelect size="S" aria-label="Show claims" startIcon={<Filter />} value={filter} onChange={(v: string | number) => setQuery({ status: v === 'open' ? undefined : String(v) })}>
            {FILTERS.map((f) => (
              <SingleSelectOption key={f.value} value={f.value}>
                {f.label}
              </SingleSelectOption>
            ))}
          </SingleSelect>
        }
      />
      <Layouts.Content>
        <Table.Root rows={rows} headers={headers} isLoading={items === null}>
          <Table.Content>
            <Table.Head>
              {HEADERS.map((h) => (
                <Table.HeaderCell key={h.name} {...h} />
              ))}
              {canReview && (
                <Th>
                  <VisuallyHidden>{ACTIONS_HEADER.label}</VisuallyHidden>
                </Th>
              )}
            </Table.Head>
            <Table.Loading />
            <Table.Empty content={empty} />
            <Table.Body>
              {rows.map((c) => {
                const handled = c.decidedAt ?? c.contactedAt;
                return (
                  <Table.Row key={c.id}>
                    <Table.Cell style={textColumn(26)}>
                      <Typography tag={RouterLink} to={editGymPath(c.schoolDocumentId)} textColor="primary600" textDecoration="none" ellipsis title={c.schoolName}>
                        {c.schoolName}
                      </Typography>
                      <Typography variant="pi" textColor="neutral600">
                        {age(c.createdAt)}
                      </Typography>
                    </Table.Cell>
                    <Table.Cell style={textColumn(24)}>
                      <Typography textColor="neutral800" fontWeight="semiBold" ellipsis title={c.name}>
                        {c.name}
                      </Typography>
                      <Typography variant="pi" textColor="neutral600" ellipsis>
                        {ROLE_LABELS[c.role]} · {c.phone}
                      </Typography>
                      <Typography variant="pi" textColor="neutral600" ellipsis title={c.email}>
                        {c.email}
                      </Typography>
                    </Table.Cell>
                    <Table.Cell style={textColumn(30)}>
                      {c.message || c.adminNote ? (
                        <Tooltip
                          label={
                            <>
                              {c.message}
                              {c.message && c.adminNote ? <br /> : null}
                              {c.adminNote ? `Admin: ${c.adminNote}` : null}
                            </>
                          }
                        >
                          <Box>
                            {!!c.message && (
                              <Typography textColor="neutral800" ellipsis>
                                {c.message}
                              </Typography>
                            )}
                            {!!c.adminNote && (
                              <Typography variant="pi" textColor="neutral600" ellipsis>
                                Admin: {c.adminNote}
                              </Typography>
                            )}
                          </Box>
                        </Tooltip>
                      ) : (
                        <Typography textColor="neutral500">—</Typography>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <Badge variant={STATUS[c.status].variant}>{STATUS[c.status].label}</Badge>
                      {handled && (
                        <Typography tag="p" variant="pi" textColor="neutral600" ellipsis maxWidth="16rem" paddingTop={1}>
                          {formatDay(handled)}
                          {c.handledBy ? ` · ${c.handledBy}` : ''}
                        </Typography>
                      )}
                    </Table.Cell>
                    {canReview && (
                      <Table.Cell>
                        <Flex gap={1} justifyContent="flex-end">
                          {actionsFor(c.status).map((a) => (
                            <IconButton key={a} variant="ghost" label={ACTION_COPY[a].button} onClick={() => setDialog({ claim: c, action: a })}>
                              {ICONS[a]}
                            </IconButton>
                          ))}
                        </Flex>
                      </Table.Cell>
                    )}
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Content>
        </Table.Root>
      </Layouts.Content>

      {dialog && <ClaimDialog claim={dialog.claim} action={dialog.action} onClose={() => setDialog(null)} onConfirm={confirm} />}
    </>
  );
}
