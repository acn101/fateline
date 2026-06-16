import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      // CLI is dev/CI tooling (not a trust-critical runtime package); branches
      // allows a couple of defensive error-formatting ternaries to go untested.
      thresholds: { lines: 85, functions: 85, branches: 80, statements: 85 },
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/bin.ts', '**/*.test.ts'],
    },
  },
});
