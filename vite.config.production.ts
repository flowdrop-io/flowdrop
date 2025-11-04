import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
	plugins: [svelte()],
	resolve: {
		alias: {
			$lib: path.resolve('./src/lib'),
			// Mock SvelteKit-specific imports for library build
			'$app/stores': path.resolve('./src/lib/mocks/app-stores.js'),
			'$app/forms': path.resolve('./src/lib/mocks/app-forms.js'),
			'$app/navigation': path.resolve('./src/lib/mocks/app-navigation.js'),
			'$app/environment': path.resolve('./src/lib/mocks/app-environment.js')
		}
	},
	build: {
		outDir: 'build/flowdrop',
		lib: {
			entry: 'src/lib/index.ts',
			name: 'FlowDrop',
			fileName: (format) => `flowdrop.${format}.js`,
			formats: ['iife', 'es']
		},
		rollupOptions: {
			// For IIFE build, bundle all dependencies to make it self-contained
			external: [
				// Keep only truly external dependencies that should be global
				// Remove @xyflow/svelte, @iconify/svelte, and uuid from external
			],
			output: {
				// Global variable name for IIFE
				globals: {
					// Only define globals for truly external dependencies
					// svelte: 'Svelte', // Keep if Svelte should be external
				},
				// Ensure CSS is extracted
				assetFileNames: (assetInfo) => {
					if (assetInfo.name?.endsWith('.css')) {
						return 'flowdrop.css';
					}
					return assetInfo.name || 'assets/[name]-[hash][extname]';
				}
			}
		},
		// Ensure we generate source maps
		sourcemap: true,
		// Minify for production
		minify: 'terser',
		// Target modern browsers
		target: 'es2015'
	},
	define: {
		'process.env.NODE_ENV': JSON.stringify('production'),
		'process.env': '{}',
		// Prevent Vite from exposing environment variables
		'import.meta.env.MODE': JSON.stringify('production'),
		'import.meta.env.DEV': 'false',
		'import.meta.env.PROD': 'true',
		'import.meta.env.SSR': 'false'
	},
	// Disable environment variable exposure
	envPrefix: '__FLOWDROP_DISABLED__',
	// Optimize dependencies
	optimizeDeps: {
		include: ['svelte', '@xyflow/svelte', '@iconify/svelte', 'uuid']
	}
});
