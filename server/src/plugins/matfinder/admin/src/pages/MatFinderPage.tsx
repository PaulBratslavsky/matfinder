import { Box, Tabs } from '@strapi/design-system';
import { Layouts, Page } from '@strapi/strapi/admin';
import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FromWebTab } from '../components/FromWebTab';
import { GymsTab } from '../components/GymsTab';
import { PERMISSIONS } from '../permissions';
import { TABS, tabFromQuery, tabLabel, type TabId } from '../tabs';

/** The MatFinder admin area: every gym, and the ones the web agent added for review. Claims arrive in M12. */
export default function MatFinderPage() {
  const [params, setParams] = useSearchParams();
  const tab = tabFromQuery(params.get('tab'));
  const [fromWebCount, setFromWebCount] = useState<number | undefined>();
  const onFromWebCount = useCallback((n: number) => setFromWebCount(n), []);
  const counts: Partial<Record<TabId, number>> = { 'from-web': fromWebCount };

  return (
    <Page.Protect permissions={PERMISSIONS.read}>
      <Page.Main>
        <Page.Title>MatFinder</Page.Title>
        <Layouts.Header title="MatFinder" subtitle="Every gym in the directory, and the ones found on the web that are waiting for review." />
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
