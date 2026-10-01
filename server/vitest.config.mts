import { defineConfig } from 'vitest/config';

// Unit tests: pure logic, no Strapi.
export default defineConfig({
  test: { environment: 'node', include: ['tests/unit/**/*.test.ts'] },
});
