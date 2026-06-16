import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Only the pure presentational helpers are unit-tested here; full RN
    // component rendering is covered by app E2E (README §9 Phase 7).
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 },
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.tsx', 'src/index.ts', '**/*.test.ts'],
    },
  },
});
