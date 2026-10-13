import { defineConfig } from 'vitest/config';

// Unit tests for pure logic only (no React Native runtime): lib/** and the theme tokens.
export default defineConfig({
  test: { environment: 'node', include: ['lib/**/*.test.ts', 'theme/**/*.test.ts'] },
});
