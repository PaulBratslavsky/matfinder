import { expect, test } from '@playwright/test';

test.describe('location not decided', () => {
  test('Explore says why before asking, and what a denial means', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Allow your location to center the map and see how far each gym is.')).toBeVisible();
    await page.getByRole('button', { name: 'Use my location' }).click();
    await expect(page.getByText(/^Showing Las Vegas\. Allow location to see distances\.$/)).toBeVisible();
  });
});

test.describe('location allowed', () => {
  test.use({ permissions: ['geolocation'], geolocation: { latitude: 36.1699, longitude: -115.1398 } });
  test('no notice, and gyms show distances', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/MatFinder · Las Vegas/)).toBeVisible();
    await expect(page.getByText('Use my location')).toHaveCount(0);
    await expect(page.getByText(/\d+\.\d mi/).first()).toBeVisible();
  });
});
