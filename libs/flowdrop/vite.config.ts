import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  // Unit tests that mount components need the client build of `svelte`; without
  // this Node resolves the server build and `mount()` throws
  // `lifecycle_function_unavailable`. Recommended by the Svelte testing docs.
  resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
  test: {
    // Global test configuration
    globals: true,
    environment: 'happy-dom',

    // Test file patterns
    include: ['tests/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'build', 'dist', '.svelte-kit', 'tests/e2e'],

    // Coverage configuration
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

    // Timeouts
    testTimeout: 10000,
    hookTimeout: 10000,

    // Setup files
    setupFiles: ['./tests/setup.ts'],

    // Mock configuration
    mockReset: true,
    restoreMocks: true,
    clearMocks: true
  }
});
