import { Badge, Box, Flex, IconButton, SingleSelect, SingleSelectOption, Th, Tooltip, Typography, VisuallyHidden } from '@strapi/design-system';
import { Check, Filter } from '@strapi/icons';
import { Layouts, Table, useFetchClient, useNotification, useQueryParams, useRBAC } from '@strapi/strapi/admin';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { age } from '../claims';
import { PERMISSIONS } from '../permissions';
import { KIND_LABELS, type Report, type ReportStatus } from '../reports';
import { singleFlight } from '../singleFlight';
import { editGymPath, formatDay } from '../status';
import { textColumn } from './cells';

type ReportFilter = ReportStatus | 'all';
const FILTERS: { value: ReportFilter; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'all', label: 'All reports' },
];
const isFilter = (v: unknown): v is ReportFilter => FILTERS.some((f) => f.value === v);
const HEADERS = [
  { name: 'gym', label: 'Gym' },
  { name: 'problem', label: 'Problem' },
  { name: 'status', label: 'Status' },
];
const ACTIONS_HEADER = { name: 'actions', label: 'Actions' };
const STATUS: Record<ReportStatus, { label: string; variant: 'warning' | 'success' }> = {
  open: { label: 'Open', variant: 'warning' },
  resolved: { label: 'Resolved', variant: 'success' },
};

/**
 * Problem reports from the app ("Something's wrong with this gym"). Check the gym, fix it, then mark the report
 * resolved. The reporter isn't shown. The status filter lives in ?status=, like the claims board.
 */
export function ReportsTab({ onChanged }: { onChanged?: () => void }) {
  const { get, post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const { allowedActions } = useRBAC(PERMISSIONS.reviewReports);
  const canReview = allowedActions.canReview === true;
  const [{ query }, setQuery] = useQueryParams<{ status?: string }>();
  const filter: ReportFilter = isFilter(query.status) ? query.status : 'open';
  const [items, setItems] = useState<Report[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const latest = useRef(0);

  // A new filter shows the loader; a refresh after an action keeps the rows until the new ones arrive.
  useEffect(() => setItems(null), [filter]);
  useEffect(() => {
    const ticket = ++latest.current;
    get('/matfinder/reports', { params: filter === 'all' ? {} : { status: filter } })
      .then((res) => {
        if (ticket !== latest.current) return;
        setItems((res.data as { items: Report[] }).items);
        setFailed(false);
      })
      .catch(() => {
        if (ticket !== latest.current) return;
        setItems((prev) => prev ?? []);
        setFailed(true);
        toggleNotification({ type: 'danger', message: "Couldn't load the reports. Try again." });
      });
  }, [get, toggleNotification, filter, refresh]);

  const resolve = useMemo(
    () =>
      singleFlight(async (report: Report) => {
        try {
          await post(`/matfinder/reports/${report.documentId}/resolve`, {});
          toggleNotification({ type: 'success', message: 'Report resolved.' });
          setRefresh((n) => n + 1);
          onChanged?.();
        } catch (e: any) {
          const message = e?.response?.data?.error?.message ?? 'That didn’t work. Try again.';
          toggleNotification({ type: 'danger', message });
        }
      }),
    [post, toggleNotification, onChanged],
  );

  const headers = canReview ? [...HEADERS, ACTIONS_HEADER] : HEADERS;
  const rows = (items ?? []).map((r) => ({ ...r, id: r.documentId }));
  const empty = failed
    ? "Couldn't load the reports."
    : filter === 'open'
      ? "No open reports. People report problems from a gym's page in the app."
      : 'No reports with this status.';

  return (
    <>
      <Layouts.Action
        startActions={
          <SingleSelect size="S" aria-label="Show reports" startIcon={<Filter />} value={filter} onChange={(v: string | number) => setQuery({ status: v === 'open' ? undefined : String(v) })}>
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
              {rows.map((r) => (
                <Table.Row key={r.id}>
                  <Table.Cell style={textColumn(30)}>
                    <Typography tag={RouterLink} to={editGymPath(r.schoolDocumentId)} textColor="primary600" textDecoration="none" ellipsis title={r.schoolName}>
                      {r.schoolName}
                    </Typography>
                    <Typography variant="pi" textColor="neutral600">
                      {age(r.createdAt)}
                    </Typography>
                  </Table.Cell>
                  <Table.Cell style={textColumn(40)}>
                    <Typography textColor="neutral800" fontWeight="semiBold" ellipsis>
                      {KIND_LABELS[r.kind]}
                    </Typography>
                    {r.message ? (
                      <Tooltip label={r.message}>
                        <Box>
                          <Typography variant="pi" textColor="neutral600" ellipsis>
                            {r.message}
                          </Typography>
                        </Box>
                      </Tooltip>
                    ) : (
                      <Typography variant="pi" textColor="neutral500">
                        —
                      </Typography>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge variant={STATUS[r.status].variant}>{STATUS[r.status].label}</Badge>
                    {r.resolvedAt && (
                      <Typography tag="p" variant="pi" textColor="neutral600" ellipsis maxWidth="16rem" paddingTop={1}>
                        {formatDay(r.resolvedAt)}
                        {r.resolvedBy ? ` · ${r.resolvedBy}` : ''}
                      </Typography>
                    )}
                    {r.adminNote && (
                      <Typography tag="p" variant="pi" textColor="neutral600" ellipsis maxWidth="16rem">
                        {r.adminNote}
                      </Typography>
                    )}
                  </Table.Cell>
                  {canReview && (
                    <Table.Cell>
                      <Flex gap={1} justifyContent="flex-end">
                        {r.status === 'open' && (
                          <IconButton variant="ghost" label="Mark resolved" onClick={() => resolve(r)}>
                            <Check />
                          </IconButton>
                        )}
                      </Flex>
                    </Table.Cell>
                  )}
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.Root>
      </Layouts.Content>
    </>
  );
}
