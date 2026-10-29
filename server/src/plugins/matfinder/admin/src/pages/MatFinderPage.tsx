import { Badge, Box, Button, Divider, Flex, Tabs } from '@strapi/design-system';
import { Plus } from '@strapi/icons';
import { Layouts, Page, RESPONSIVE_DEFAULT_SPACING, useFetchClient, useRBAC } from '@strapi/strapi/admin';
import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ClaimsTab } from '../components/ClaimsTab';
import { FromWebTab } from '../components/FromWebTab';
import { GymsTab } from '../components/GymsTab';
import { ReportsTab } from '../components/ReportsTab';
import { PERMISSIONS } from '../permissions';
import { createGymPath } from '../status';
import { TABS, tabFromQuery, type TabId } from '../tabs';

/** useRBAC → allowedActions.canCreate: the Content Manager's own check for its "Create new entry" button. */
const CREATE_GYM = [{ action: 'plugin::content-manager.explorer.create', subject: 'api::school.school' }];

/** The MatFinder admin area: every gym, owners' claims, and the gyms the web agent added for review. */
export default function MatFinderPage() {
  const { get } = useFetchClient();
  const { allowedActions } = useRBAC(CREATE_GYM);
  const [params, setParams] = useSearchParams();
  const tab = tabFromQuery(params.get('tab'));
  const [counts, setCounts] = useState<Partial<Record<TabId, number>>>({});
  // Tab badges: claims waiting for review, open problem reports, and gyms from the web that aren't live.
  const loadCounts = useCallback(() => {
    get('/matfinder/summary')
      .then((res) => {
        const s = res.data as {
          gyms: { fromWeb: { notLive: number } };
          claims: { pending: number; contacted: number };
          reports: { open: number };
        };
        setCounts({ claims: s.claims.pending + s.claims.contacted, reports: s.reports.open, 'from-web': s.gyms.fromWeb.notLive });
      })
      .catch(() => {});
  }, [get]);
  useEffect(loadCounts, [loadCounts]);
  const onFromWebCount = useCallback((n: number) => setCounts((c) => ({ ...c, 'from-web': n })), []);

  return (
    <Page.Protect permissions={PERMISSIONS.read}>
      <Page.Main>
        <Page.Title>MatFinder</Page.Title>
        <Layouts.Header
          title="MatFinder"
          subtitle="Every gym in the directory, owners' claims, problem reports, and the gyms the agent found on the web."
          primaryAction={
            allowedActions.canCreate ? (
              <Button tag={Link} to={createGymPath} startIcon={<Plus />} minWidth="max-content">
                Add a gym
              </Button>
            ) : null
          }
        />
        {/* Each tab renders its own toolbar (Layouts.Action) and content, like a Content Manager list view.
            Switching tabs drops the other tab's search, filters and page from the URL. */}
        <Tabs.Root variant="simple" value={tab} onValueChange={(v: string) => setParams({ tab: v }, { replace: true })}>
          <Box paddingLeft={RESPONSIVE_DEFAULT_SPACING} paddingRight={RESPONSIVE_DEFAULT_SPACING} paddingBottom={6}>
            <Tabs.List aria-label="MatFinder sections">
              {TABS.map((t) => (
                <Tabs.Trigger key={t.id} value={t.id}>
                  <Flex tag="span" gap={2} alignItems="center">
                    {t.label}
                    {!!counts[t.id] && (
                      <Badge size="S" active={tab === t.id}>
                        {counts[t.id]}
                      </Badge>
                    )}
                  </Flex>
                </Tabs.Trigger>
              ))}
            </Tabs.List>
            <Divider />
          </Box>
          <Tabs.Content value="gyms">
            <GymsTab />
          </Tabs.Content>
          <Tabs.Content value="claims">
            <ClaimsTab onChanged={loadCounts} />
          </Tabs.Content>
          <Tabs.Content value="reports">
            <ReportsTab onChanged={loadCounts} />
          </Tabs.Content>
          <Tabs.Content value="from-web">
            <FromWebTab onCount={onFromWebCount} />
          </Tabs.Content>
        </Tabs.Root>
      </Page.Main>
    </Page.Protect>
  );
}
