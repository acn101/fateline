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
      // .tsx components + the RN-coupled useTheme hook are covered by E2E, not
      // unit tests (they require a native render env). Pure logic stays gated.
      exclude: ['src/**/*.tsx', 'src/useTheme.ts', 'src/index.ts', '**/*.test.ts'],
    },
  },
});
