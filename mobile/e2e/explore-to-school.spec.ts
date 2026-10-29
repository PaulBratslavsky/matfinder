import { expect, test, type Page } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { API_URL } from '../playwright.config';

type DirectorySchool = { slug: string; name: string; visitorsWelcome: boolean | null; todaySessions: { start: string; end: string }[]; programs: string[] };

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

test('explore → filters → preview → View gym → sign up → full gym page → claim it → accepted → sign out re-gates it', async ({ page, request }) => {
  const directory: { schools: DirectorySchool[] } = (await (await request.get(`${API_URL}/api/schools/directory?city=las-vegas`)).json()).data;

  // The app opens on the map with the sheet (the sheet alone when no Mapbox token is configured).
  await page.goto('/');
  await expect(page.getByText(/MatFinder · Las Vegas/)).toBeVisible();
  await expect(page.getByText(new RegExp(`^\\d+ of ${directory.schools.length} training today$`))).toBeVisible();
  await expect(page.getByText(`Showing ${directory.schools.length} of ${directory.schools.length}`, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Sample .*\(Demo\)$/ })).toHaveCount(directory.schools.length);

  await page.locator('[aria-label="Open mat"]').click();
  await expect(page).toHaveURL(/openmat=1/);
  const openMat = directory.schools.filter((s) => s.programs?.includes('open_mat'));
  await expect.poll(() => listNames(page)).toEqual(openMat.map((s) => s.name).sort());
  await page.locator('[aria-label="Open mat"]').click();
  await expect(page).not.toHaveURL(/openmat=1/);

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
  await expect(page.getByText(/^Schedule (verified|not verified yet)/).first()).toBeVisible();
  await expect(page.getByText(/^Added by (the MatFinder team|MatFinder's AI agent)/).first()).toBeVisible();
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
  // The Explore screen stays mounted (hidden) under the school page, so only count visible matches: late in the day its
  // preview card shows a bare "Today" label too ("No more classes today").
  await expect(page.getByText(target.name, { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText('Today', { exact: true }).filter({ visible: true })).toBeVisible();
  for (const section of ['This week', 'Coaches', 'In the gym', 'Get there', 'Contact']) {
    await expect(page.getByText(section, { exact: true })).toBeVisible();
  }
  await expect(page.getByText('Directions').first()).toBeVisible();
  await expect(page.getByText('Add to calendar')).toBeVisible();

  // A reload keeps the session.
  await page.reload();
  await expect(page.getByText('Coaches', { exact: true })).toBeVisible();

  // Claim the gym: the form, then "being reviewed" on the gym page.
  await page.getByText('Claim it', { exact: true }).click();
  await expect(page).toHaveURL(`/schools/${target.slug}/claim`);
  await page.getByRole('radio', { name: 'Manager' }).click();
  await page.locator('#claim-phone').fill('702-555-0177');
  await page.getByRole('button', { name: 'Send claim' }).click();
  await expect(page.getByText("Thanks, we'll be in touch")).toBeVisible();
  await page.goto(`/schools/${target.slug}`);
  await expect(page.getByText(/Your claim is being reviewed/)).toBeVisible();

  // An admin accepts it (the first admin of this throwaway database, through the admin API): the gym shows as claimed.
  const admin = await (
    await request.post(`${API_URL}/admin/register-admin`, {
      data: { email: `e2e-admin-${randomBytes(4).toString('hex')}@example.test`, password: `Aa1${randomBytes(10).toString('hex')}`, firstname: 'E2E', lastname: 'Admin' },
    })
  ).json();
  const auth = { Authorization: `Bearer ${admin.data.token}` };
  const board = await (await request.get(`${API_URL}/matfinder/claims?status=pending`, { headers: auth })).json();
  const claim = board.items.find((c: { schoolSlug: string }) => c.schoolSlug === target.slug);
  expect(claim).toMatchObject({ role: 'manager', phone: '702-555-0177' });
  expect((await request.post(`${API_URL}/matfinder/claims/${claim.documentId}/accept`, { headers: auth, data: {} })).status()).toBe(200);
  await page.reload();
  await expect(page.getByText('Claimed by the owner')).toBeVisible();
  const after = (await (await request.get(`${API_URL}/api/schools/directory?city=las-vegas`)).json()).data;
  expect(after.schools.find((x: { slug: string }) => x.slug === target.slug).claimed).toBe(true);

  // Sign out → the school page sends you to sign in again.
  await page.goto('/account');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByText("You're browsing as a guest")).toBeVisible();
  await page.goto(`/schools/${target.slug}`);
  await expect(page).toHaveURL(`/sign-in?redirect=${redirect}`);
});
