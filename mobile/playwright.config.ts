import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end suite (spec M9), web build, production-shaped:
 * - globalSetup starts a THROWAWAY Strapi with the sample seed (server/scripts/test-server.sh, port 1342).
 * - webServer exports the app with an empty API base (relative /api, as on Vercel) and serves it on :8084, proxying
 *   /api to the test Strapi like the Vercel rewrite does.
 * Stop `npm run develop` in server/ first: the test server builds into the same dist/.
 */
export const API_URL = 'http://localhost:1342';
export const WEB_URL = 'http://localhost:8084';

export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  use: {
    ...devices['Desktop Chrome'],
    // Normally `npx playwright install chromium` provides the browser. PLAYWRIGHT_CHROMIUM_PATH can point at an
    // already-installed Chromium instead (optional; unset in a normal setup).
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } } : {}),
    baseURL: WEB_URL,
    viewport: { width: 1100, height: 900 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `EXPO_PUBLIC_WEB_API_BASE= npx expo export -p web --clear && node e2e/serve.mjs 8084 ${API_URL}`,
    url: WEB_URL,
    timeout: 300_000,
    reuseExistingServer: false,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
