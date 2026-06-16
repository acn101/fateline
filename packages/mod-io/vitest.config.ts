import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      // functions allows one unreachable defensive fs error-callback (the
      // `.catch` on readdir, which only fires if a dir vanishes mid-read).
      thresholds: { lines: 90, functions: 85, branches: 90, statements: 90 },
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', '**/*.test.ts'],
    },
  },
});
