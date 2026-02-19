import type { LayoutServerLoad } from './$types';

/**
 * Server-side layout load function.
 * Reads runtime configuration from environment variables
 * so the app can be configured at deploy time, not build time.
 */
export const load: LayoutServerLoad = async () => {
	const runtimeConfig = {
		apiBaseUrl:
			process.env.FLOWDROP_API_BASE_URL || process.env.API_BASE_URL || '/api/flowdrop',
		theme: (process.env.FLOWDROP_THEME as 'light' | 'dark' | 'auto') || 'auto',
		timeout: process.env.FLOWDROP_TIMEOUT ? parseInt(process.env.FLOWDROP_TIMEOUT, 10) : 30000,
		authType:
			(process.env.FLOWDROP_AUTH_TYPE as 'none' | 'bearer' | 'api_key' | 'custom') || 'none',
		authToken: process.env.FLOWDROP_AUTH_TOKEN || undefined,
		version: process.env.FLOWDROP_VERSION || '1.0.0',
		environment: process.env.NODE_ENV || 'production'
	};

	return { runtimeConfig };
};
