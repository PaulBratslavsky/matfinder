import { expect, test } from '@playwright/test';
import { randomBytes } from 'node:crypto';

test('privacy page is public and linked from sign-up', async ({ page }) => {
  await page.goto('/sign-up');
  await page.getByText('How MatFinder uses your data').click();
  await expect(page).toHaveURL('/privacy');
  await expect(page.getByRole('heading', { name: 'Privacy' }).last()).toBeVisible();
  await expect(page.getByText(/is not sent to MatFinder’s server/)).toBeVisible();
});

test('sign up → delete account (password required) → the account is gone', async ({ page }) => {
  const email = `e2e-del-${randomBytes(5).toString('hex')}@example.test`;
  const password = randomBytes(12).toString('hex');
  await page.goto('/sign-up?redirect=%2Faccount');
  await page.locator('input#name').fill('E2E Delete');
  await page.locator('input#email').fill(email);
  await page.locator('input#password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText(email)).toBeVisible();

  await page.getByRole('button', { name: 'Delete account' }).click();
  await page.getByLabel('Your password').fill('not-the-password');
  await page.getByRole('button', { name: 'Delete my account' }).click();
  await expect(page.getByRole('alert')).toHaveText("That password isn't right.");

  await page.getByLabel('Your password').fill(password);
  await page.getByRole('button', { name: 'Delete my account' }).click();
  await expect(page.getByText('Your account was deleted.')).toBeVisible();
  await expect(page.getByText("You're browsing as a guest")).toBeVisible();

  await page.goto('/sign-in');
  await page.locator('input#email').fill(email);
  await page.locator('input#password').fill(password);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
});
