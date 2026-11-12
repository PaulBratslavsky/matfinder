import { Badge, Box, Button, Divider, Flex, Tabs } from '@strapi/design-system';
import { Plus } from '@strapi/icons';
import { Layouts, Page, RESPONSIVE_DEFAULT_SPACING, useFetchClient, useRBAC } from '@strapi/strapi/admin';
import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AssistantTab } from '../components/assistant/AssistantTab';
import { ClaimsTab } from '../components/ClaimsTab';
import { FromWebTab } from '../components/FromWebTab';
import { GymsTab } from '../components/GymsTab';
import { PERMISSIONS } from '../permissions';
import { createGymPath } from '../status';
import { TABS, tabFromQuery, type TabId } from '../tabs';

/** useRBAC → allowedActions.canCreate: the Content Manager's own check for its "Create new entry" button. */
const CREATE_GYM = [{ action: 'plugin::content-manager.explorer.create', subject: 'api::school.school' }];

/** The MatFinder admin area: every gym, owners' claims, and the gyms the web agent added for review. */
export default function MatFinderPage() {
  const { get } = useFetchClient();
  const { allowedActions } = useRBAC(CREATE_GYM);
  const assistant = useRBAC(PERMISSIONS.assistant);
  const canUseAssistant = !!assistant.allowedActions.canUse;
  const [params, setParams] = useSearchParams();
  const asked = tabFromQuery(params.get('tab'));
  // ?tab=assistant without the permission opens Gyms (once the role is known).
  const tab: TabId = asked === 'assistant' && !canUseAssistant && !assistant.isLoading ? 'gyms' : asked;
  const tabs = TABS.filter((t) => t.id !== 'assistant' || canUseAssistant);
  const [counts, setCounts] = useState<Partial<Record<TabId, number>>>({});
  // Tab badges: claims waiting for review, and gyms from the web that aren't live.
  const loadCounts = useCallback(() => {
    get('/matfinder/summary')
      .then((res) => {
        const s = res.data as { gyms: { fromWeb: { notLive: number } }; claims: { pending: number; contacted: number } };
        setCounts({ claims: s.claims.pending + s.claims.contacted, 'from-web': s.gyms.fromWeb.notLive });
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
          subtitle="Every gym in the directory, owners' claims, and the gyms the agent found on the web."
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
              {tabs.map((t) => (
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
          <Tabs.Content value="from-web">
            <FromWebTab onCount={onFromWebCount} />
          </Tabs.Content>
          {/* Kept mounted (hidden) on other tabs, so the conversation survives a look at Claims and back. */}
          {canUseAssistant && (
            <Tabs.Content value="assistant" forceMount hidden={tab !== 'assistant'}>
              <AssistantTab onAnswered={loadCounts} />
            </Tabs.Content>
          )}
        </Tabs.Root>
      </Page.Main>
    </Page.Protect>
  );
}
