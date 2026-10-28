import { Link, SingleSelect, SingleSelectOption, Typography, VisuallyHidden } from '@strapi/design-system';
import { Filter } from '@strapi/icons';
import { Layouts, Pagination, SearchInput, Table, useFetchClient, useNotification, useQueryParams } from '@strapi/strapi/admin';
import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { STATUS_LABELS, editGymPath, formatDay, isGymStatus, type GymStatus } from '../status';
import { pagePath } from '../tabs';
import { stopRowClick as stop, textColumn } from './cells';
import { GymStatusPill } from './GymStatusPill';

type Gym = {
  documentId: string;
  slug: string;
  name: string;
  neighborhood: string | null;
  city: { slug: string; name: string } | null;
  affiliation: { slug: string; name: string } | null;
  status: GymStatus;
  updatedAt: string;
  lastVerifiedAt: string | null;
  origin: 'manual' | 'web-agent';
  claim: { owner: string | null; open: number };
};
type GymPage = { items: Gym[]; page: number; limit: number; total: number; hasMore: boolean };
/** Search, filter and page live in the URL, as in the Content Manager (SearchInput writes _q, Pagination page/pageSize). */
type Query = { _q?: string; status?: string; page?: string; pageSize?: string };

/** The API caps limit at 50. */
const PAGE_SIZES = ['10', '25', '50'];
const DEFAULT_PAGE_SIZE = 25;
const FILTERS: { value: 'any' | GymStatus; label: string }[] = [
  { value: 'any', label: 'All statuses' },
  ...(Object.keys(STATUS_LABELS) as GymStatus[]).map((s) => ({ value: s, label: STATUS_LABELS[s].label })),
];
const HEADERS = [
  { name: 'name', label: 'Gym' },
  { name: 'area', label: 'Area' },
  { name: 'status', label: 'Status' },
  { name: 'claim', label: 'Claim' },
  { name: 'updatedAt', label: 'Updated' },
];
/** Every gym, with its publish status. A row opens the gym in the Content Manager, where it's edited and published. */
export function GymsTab() {
  const { get } = useFetchClient();
  const { toggleNotification } = useNotification();
  const navigate = useNavigate();
  const [{ query }, setQuery] = useQueryParams<Query>();
  const search = typeof query._q === 'string' ? query._q.trim() : '';
  const status: 'any' | GymStatus = isGymStatus(query.status) ? query.status : 'any';
  const page = Math.max(1, Math.trunc(Number(query.page)) || 1);
  const pageSize = Math.min(Math.max(Math.trunc(Number(query.pageSize)) || DEFAULT_PAGE_SIZE, 1), 50);
  const [data, setData] = useState<GymPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  // Only the newest request may update the table (filters can change while one is in flight).
  const latest = useRef(0);

  useEffect(() => {
    const ticket = ++latest.current;
    setLoading(true);
    get('/matfinder/gyms', { params: { search: search || undefined, status, page, limit: pageSize } })
      .then((res) => {
        if (ticket !== latest.current) return;
        setData(res.data as GymPage);
        setFailed(false);
      })
      .catch(() => {
        if (ticket !== latest.current) return;
        setData(null);
        setFailed(true);
        toggleNotification({ type: 'danger', message: "Couldn't load the gyms. Try again." });
      })
      .finally(() => {
        if (ticket === latest.current) setLoading(false);
      });
  }, [get, toggleNotification, search, status, page, pageSize]);

  const rows = (data?.items ?? []).map((g) => ({ ...g, id: g.documentId }));
  const filtered = !!search || status !== 'any';

  return (
    <>
      <Layouts.Action
        startActions={
          <>
            <SearchInput label="Search gyms" placeholder="Search by name, neighborhood or ZIP" />
            <SingleSelect
              size="S"
              aria-label="Publish status"
              startIcon={<Filter />}
              value={status}
              onChange={(v: string | number) => setQuery({ status: v === 'any' ? undefined : String(v), page: '1' })}
            >
              {FILTERS.map((f) => (
                <SingleSelectOption key={f.value} value={f.value}>
                  {f.label}
                </SingleSelectOption>
              ))}
            </SingleSelect>
          </>
        }
      />
      <Layouts.Content>
        <Table.Root rows={rows} headers={HEADERS} isLoading={loading}>
          <Table.Content>
            <Table.Head>
              {HEADERS.map((h) => (
                <Table.HeaderCell key={h.name} {...h} />
              ))}
            </Table.Head>
            <Table.Loading />
            <Table.Empty
              content={failed ? "Couldn't load the gyms." : filtered ? 'No gyms match. Clear the search or pick another status.' : 'No gyms yet.'}
            />
            <Table.Body>
              {rows.map((g) => {
                const details = [g.affiliation?.name, g.origin === 'web-agent' ? 'From the web' : null].filter(Boolean).join(' · ');
                const area = [g.neighborhood, g.city?.name].filter(Boolean).join(', ');
                return (
                  <Table.Row key={g.id} cursor="pointer" onClick={() => navigate(editGymPath(g.documentId))}>
                    <Table.Cell style={textColumn(40)}>
                      <Typography tag={RouterLink} to={editGymPath(g.documentId)} onClick={stop} textColor="neutral800" textDecoration="none" fontWeight="semiBold" ellipsis title={g.name}>
                        {g.name}
                      </Typography>
                      {details && (
                        <Typography variant="pi" textColor="neutral600" ellipsis>
                          {details}
                        </Typography>
                      )}
                    </Table.Cell>
                    <Table.Cell style={textColumn(22)}>
                      <Typography textColor="neutral800" ellipsis title={area}>
                        {area || '—'}
                      </Typography>
                    </Table.Cell>
                    <Table.Cell>
                      <GymStatusPill status={g.status} />
                    </Table.Cell>
                    <Table.Cell style={textColumn(22)}>
                      {g.claim.owner ? (
                        <Typography textColor="neutral800" ellipsis title={`Claimed by ${g.claim.owner}`}>
                          Claimed by {g.claim.owner}
                        </Typography>
                      ) : g.claim.open ? (
                        <Link tag={RouterLink} to={pagePath('claims')} onClick={stop}>
                          {g.claim.open === 1 ? 'Claim pending' : `${g.claim.open} claims pending`}
                        </Link>
                      ) : (
                        <>
                          <Typography textColor="neutral500" aria-hidden>
                            —
                          </Typography>
                          <VisuallyHidden>Not claimed</VisuallyHidden>
                        </>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <Typography textColor="neutral800">{formatDay(g.updatedAt)}</Typography>
                      {/* lastVerifiedAt: when a person last confirmed the schedule and prices. */}
                      <Typography tag="p" variant="pi" textColor={g.lastVerifiedAt ? 'neutral600' : 'neutral500'} title="When someone last confirmed the schedule and prices">
                        {g.lastVerifiedAt ? `Verified ${formatDay(g.lastVerifiedAt)}` : 'Never verified'}
                      </Typography>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Content>
        </Table.Root>
        {data && (
          <Pagination.Root pageCount={Math.max(1, Math.ceil(data.total / pageSize))} total={data.total} defaultPageSize={DEFAULT_PAGE_SIZE}>
            <Pagination.PageSize options={PAGE_SIZES} />
            <Pagination.Links />
          </Pagination.Root>
        )}
      </Layouts.Content>
    </>
  );
}
