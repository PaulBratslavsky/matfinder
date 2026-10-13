import { defineConfig } from 'vitest/config';

// Unit tests for pure logic only (no React Native runtime): lib/**.
export default defineConfig({
  test: { environment: 'node', include: ['lib/**/*.test.ts'] },
});
