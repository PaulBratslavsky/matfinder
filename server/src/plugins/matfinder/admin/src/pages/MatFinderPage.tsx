import { Box, Tabs } from '@strapi/design-system';
import { Layouts, Page } from '@strapi/strapi/admin';
import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFetchClient } from '@strapi/strapi/admin';
import { useEffect } from 'react';
import { ClaimsTab } from '../components/ClaimsTab';
import { FromWebTab } from '../components/FromWebTab';
import { GymsTab } from '../components/GymsTab';
import { PERMISSIONS } from '../permissions';
import { TABS, tabFromQuery, tabLabel, type TabId } from '../tabs';

/** The MatFinder admin area: every gym, owners' claims, and the gyms the web agent added for review. */
export default function MatFinderPage() {
  const { get } = useFetchClient();
  const [params, setParams] = useSearchParams();
  const tab = tabFromQuery(params.get('tab'));
  const [counts, setCounts] = useState<Partial<Record<TabId, number>>>({});
  // Tab badges: claims waiting for review and unreviewed gyms from the web.
  const loadCounts = useCallback(() => {
    get('/matfinder/summary')
      .then((res) => {
        const s = res.data as { gyms: { fromWeb: number }; claims: { pending: number; contacted: number } };
        setCounts({ claims: s.claims.pending + s.claims.contacted, 'from-web': s.gyms.fromWeb });
      })
      .catch(() => {});
  }, [get]);
  useEffect(loadCounts, [loadCounts]);
  const onFromWebCount = useCallback((n: number) => setCounts((c) => ({ ...c, 'from-web': n })), []);

  return (
    <Page.Protect permissions={PERMISSIONS.read}>
      <Page.Main>
        <Page.Title>MatFinder</Page.Title>
        <Layouts.Header title="MatFinder" subtitle="Every gym in the directory, owners' claims, and the gyms found on the web that are waiting for review." />
        <Layouts.Content>
          <Tabs.Root value={tab} onValueChange={(v: string) => setParams({ tab: v }, { replace: true })}>
            <Tabs.List aria-label="MatFinder sections">
              {TABS.map((t) => (
                <Tabs.Trigger key={t.id} value={t.id}>
                  {tabLabel(t.label, counts[t.id])}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
            <Tabs.Content value="gyms">
              <Box paddingTop={4}>
                <GymsTab />
              </Box>
            </Tabs.Content>
            <Tabs.Content value="claims">
              <Box paddingTop={4}>
                <ClaimsTab onChanged={loadCounts} />
              </Box>
            </Tabs.Content>
            <Tabs.Content value="from-web">
              <Box paddingTop={4}>
                <FromWebTab onCount={onFromWebCount} />
              </Box>
            </Tabs.Content>
          </Tabs.Root>
        </Layouts.Content>
      </Page.Main>
    </Page.Protect>
  );
}
