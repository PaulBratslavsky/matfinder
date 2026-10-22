import { expect, test, type Page } from '@playwright/test';
import { randomBytes } from 'node:crypto';

// "Ask about this gym" (plan 09, M18). The test server's gym chat answers from a script (MATFINDER_AI_SCRIPTED):
// the answer says what was asked and repeats what the model would have read, streamed in pieces like a model.
const SLUG = 'sample-summerlin-bjj-demo';
const NAME = 'Sample Summerlin BJJ (Demo)';

async function signUpTo(page: Page, redirect: string) {
  await page.goto(`/sign-up?redirect=${encodeURIComponent(redirect)}`);
  await page.locator('input#name').fill('E2E Asker');
  await page.locator('input#email').fill(`e2e-ask-${randomBytes(5).toString('hex')}@example.test`);
  await page.locator('input#password').fill(randomBytes(12).toString('hex'));
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(redirect);
}

test('signed out, the chat sends you to sign in and back', async ({ page }) => {
  await page.goto(`/schools/${SLUG}/ask`);
  await expect(page).toHaveURL(`/sign-in?redirect=${encodeURIComponent(`/schools/${SLUG}/ask`)}`);
});

test('ask a suggested question and a typed one; the answers stream in from the gym’s page and knowledge', async ({ page }) => {
  await signUpTo(page, `/schools/${SLUG}`);
  await page.getByRole('button', { name: 'Ask about this gym' }).click();
  await expect(page).toHaveURL(`/schools/${SLUG}/ask`);
  await expect(page.getByText(/Answers come from MatFinder.s information about this gym/).first()).toBeVisible();

  // A suggestion chosen from the gym's data: the sample gym welcomes visitors and lists a drop-in price.
  await page.getByRole('button', { name: 'Can I drop in, and what does it cost?' }).click();
  await expect(page.getByText('Scripted answer (no model). You asked: Can I drop in, and what does it cost?', { exact: false }).first()).toBeVisible();
  // What the model read: this gym's page and its own knowledge entry, and nothing from another gym.
  await expect(page.getByText('Name: Sample Summerlin BJJ (Demo)', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('Free parking in the lot behind the building', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('two-car garage', { exact: false })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Send' })).toBeVisible(); // the answer finished

  // A typed question, sent with Enter: the box empties and a second answer comes.
  const box = page.getByRole('textbox', { name: 'Your question' });
  await box.fill('Is there an open mat this week?');
  await box.press('Enter');
  await expect(box).toHaveValue('');
  await expect(page.getByText('You asked: Is there an open mat this week?', { exact: false }).first()).toBeVisible();
});

test('the button is hidden when the chat is not set up', async ({ page }) => {
  await signUpTo(page, `/schools/${SLUG}`);
  await expect(page.getByRole('button', { name: 'Ask about this gym' })).toBeVisible();
  // As without an AI key: the status says not ready.
  await page.route('**/api/matfinder/chat/status', (route) => route.fulfill({ json: { ready: false } }));
  await page.reload();
  await expect(page.getByText(NAME, { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ask about this gym' })).toHaveCount(0);
});
