import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	// Enable Svelte 5 runes mode
	compilerOptions: {
		runes: true
	},

	kit: {
		// adapter-auto detects the environment and uses the appropriate adapter
		// For Node.js environments (Docker, PM2), it will use adapter-node
		adapter: adapter(),

		// Ensure API routes are server-side only
		csrf: {
			// Configure trusted origins based on your deployment
			// In production, set this via environment variable
			trustedOrigins: process.env.TRUSTED_ORIGINS
				? process.env.TRUSTED_ORIGINS.split(',')
				: []
		}
	}
};

export default config;
