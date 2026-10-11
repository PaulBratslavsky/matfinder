import { expect, test, type Page } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { API_URL } from '../playwright.config';

type DirectorySchool = { slug: string; name: string; visitorsWelcome: boolean; todaySessions: { start: string; end: string }[] };

const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
/** Minutes since midnight in Las Vegas, computed independently of the app. */
function vegasMinutes(): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date())
      .map((x) => [x.type, x.value]),
  );
  return Number(p.hour) * 60 + Number(p.minute);
}

const listNames = async (page: Page) =>
  (await page.getByRole('button', { name: /^Sample .*\(Demo\)$/ }).evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))).sort();

test('explore → filters → preview → View gym → sign up → full gym page → sign out re-gates it', async ({ page, request }) => {
  const directory: { schools: DirectorySchool[] } = (await (await request.get(`${API_URL}/api/schools/directory?city=las-vegas`)).json()).data;

  // The app opens on the map with the sheet (the sheet alone when no Mapbox token is configured).
  await page.goto('/');
  await expect(page.getByText(/MatFinder · Las Vegas/)).toBeVisible();
  await expect(page.getByText(new RegExp(`^\\d+ of ${directory.schools.length} training today$`))).toBeVisible();
  await expect(page.getByText(`Showing ${directory.schools.length} of ${directory.schools.length}`, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Sample .*\(Demo\)$/ })).toHaveCount(directory.schools.length);

  // "Training today" + "Visitors welcome", checked against the API and Las Vegas time.
  await page.locator('[aria-label="Training today"]').click();
  await page.locator('[aria-label="Visitors welcome"]').click();
  await expect(page).toHaveURL(/today=1/);
  await expect(page).toHaveURL(/visitors=1/);
  const now = vegasMinutes();
  const expected = directory.schools.filter((s) => s.visitorsWelcome && s.todaySessions.some((x) => minutes(x.end) > now));
  if (expected.length) {
    await expect.poll(() => listNames(page)).toEqual(expected.map((s) => s.name).sort());
  } else {
    // Late in the day nothing is left: the empty state shows, and we continue with visitors-welcome schools.
    await expect(page.getByText('No gyms match')).toBeVisible();
    await page.locator('[aria-label="Training today"]').click();
  }
  // A gym with classes today, so its week grid marks "Today".
  const target = (expected.length ? expected : directory.schools.filter((s) => s.visitorsWelcome && s.todaySessions.length))[0];
  expect(target).toBeTruthy();

  // Gym card → preview in the sheet → View gym.
  await page.getByRole('button', { name: target.name, exact: true }).click();
  const card = page.locator(`[aria-label="${target.name} preview"]`);
  await expect(card).toBeVisible();
  await expect(card).toContainText(/On now|Next session|No more classes today/);
  await expect(card).toContainText('Visitors welcome');
  await card.getByText('View gym').click();

  // Signed out → sign-in with the redirect → sign up.
  const redirect = encodeURIComponent(`/schools/${target.slug}`);
  await expect(page).toHaveURL(`/sign-in?redirect=${redirect}`);
  await page.getByText('Sign up', { exact: true }).click();
  await expect(page).toHaveURL(`/sign-up?redirect=${redirect}`);
  await page.locator('input#name').fill('E2E Tester');
  await page.locator('input#email').fill(`e2e-${randomBytes(5).toString('hex')}@example.test`);
  await page.locator('input#password').fill(randomBytes(12).toString('hex'));
  await page.getByRole('button', { name: 'Create account' }).click();

  // Back on that gym's full page: today marked in the week grid, the gated sections present.
  await expect(page).toHaveURL(`/schools/${target.slug}`);
  // The Explore screen stays mounted (hidden) under the school page, so only count visible matches.
  await expect(page.getByText(target.name, { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText('Today', { exact: true })).toBeVisible();
  for (const section of ['This week', 'Coaches', 'In the gym', 'Get there', 'Contact']) {
    await expect(page.getByText(section, { exact: true })).toBeVisible();
  }
  await expect(page.getByText('Directions').first()).toBeVisible();
  await expect(page.getByText('Add to calendar')).toBeVisible();

  // A reload keeps the session.
  await page.reload();
  await expect(page.getByText('Coaches', { exact: true })).toBeVisible();

  // Sign out → the school page sends you to sign in again.
  await page.goto('/account');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByText("You're browsing as a guest")).toBeVisible();
  await page.goto(`/schools/${target.slug}`);
  await expect(page).toHaveURL(`/sign-in?redirect=${redirect}`);
});
