import { Tabs } from '@strapi/design-system';
import { Layouts, Page } from '@strapi/strapi/admin';
import { GymsTab } from '../components/GymsTab';
import { PERMISSIONS } from '../permissions';

/** The MatFinder admin area. Gyms now; the Claims and From the web tabs arrive in M11 and M12. */
export default function MatFinderPage() {
  return (
    <Page.Protect permissions={PERMISSIONS.read}>
      <Page.Main>
        <Page.Title>MatFinder</Page.Title>
        <Layouts.Header title="MatFinder" subtitle="Every gym in the directory and its publish status." />
        <Layouts.Content>
          <Tabs.Root defaultValue="gyms">
            <Tabs.List aria-label="MatFinder sections">
              <Tabs.Trigger value="gyms">Gyms</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="gyms">
              <GymsTabPanel />
            </Tabs.Content>
          </Tabs.Root>
        </Layouts.Content>
      </Page.Main>
    </Page.Protect>
  );
}

function GymsTabPanel() {
  return (
    <div style={{ paddingTop: 16 }}>
      <GymsTab />
    </div>
  );
}
