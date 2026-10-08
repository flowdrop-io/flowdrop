import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Two vitest projects (run both with `pnpm test`):
 *
 *   unit     happy-dom tests under tests/        `pnpm run test:unit`
 *   storybook every story as a browser test      `pnpm run test:stories`
 *            (Playwright chromium, headless)
 *
 * Scoped runs: `pnpm exec vitest run --project=unit tests/unit/styles`.
 */
export default defineConfig({
  plugins: [sveltekit()],
  test: {
    // Coverage is a root-level option and applies to the unit project.
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/mocks/**',
        'build/',
        'dist/',
        '.svelte-kit/'
      ]
    },
    projects: [
      {
        extends: true,
        // Unit tests that mount components need the client build of `svelte`;
        // without this Node resolves the server build and `mount()` throws
        // `lifecycle_function_unavailable`. Recommended by the Svelte testing docs.
        resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
        test: {
          name: 'unit',
          globals: true,
          environment: 'happy-dom',
          include: ['tests/**/*.{test,spec}.{js,ts}'],
          exclude: ['node_modules', 'build', 'dist', '.svelte-kit', 'tests/e2e'],
          testTimeout: 10000,
          hookTimeout: 10000,
          setupFiles: ['./tests/setup.ts'],
          mockReset: true,
          restoreMocks: true,
          clearMocks: true
        }
      },
      {
        extends: true,
        plugins: [storybookTest({ configDir: path.join(dirname, '.storybook') })],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: 'playwright',
            instances: [{ browser: 'chromium' }]
          },
          setupFiles: ['./.storybook/vitest.setup.ts']
        }
      }
    ]
  }
});
