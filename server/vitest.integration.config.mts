import { defineConfig } from 'vitest/config';

// Integration tests hit a running Strapi with the sample seed (see scripts/test-server.sh).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/api.test.ts'],
    globalSetup: ['tests/global-setup.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
