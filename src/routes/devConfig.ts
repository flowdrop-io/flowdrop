/**
 * Development Configuration Helper
 *
 * This file is ONLY for the demo/development environment.
 * It is NOT part of the library package.
 *
 * The library code (src/lib/) should never import from this file.
 */

import { defaultApiConfig } from '$lib/config/apiConfig';
import type { ApiConfig } from '$lib/config/apiConfig';

/**
 * Get development API configuration from environment variables
 * This is only used in the demo application, not in the library
 */
export function getDevApiConfig(): ApiConfig {
	// Access environment variables (only works in development with Vite)
	const baseUrl =
		import.meta.env.VITE_API_BASE_URL ||
		import.meta.env.VITE_DRUPAL_API_URL ||
		import.meta.env.VITE_FLOWDROP_API_URL ||
		defaultApiConfig.baseUrl;

	return {
		...defaultApiConfig,
		baseUrl
	};
}

/**
 * Get development configuration values
 */
export function getDevConfig() {
	return {
		apiBaseUrl:
			import.meta.env.VITE_API_BASE_URL ||
			import.meta.env.VITE_DRUPAL_API_URL ||
			import.meta.env.VITE_FLOWDROP_API_URL ||
			'/api/flowdrop',
		theme: (import.meta.env.VITE_FLOWDROP_THEME as 'light' | 'dark' | 'auto') || 'auto',
		timeout: import.meta.env.VITE_FLOWDROP_TIMEOUT
			? parseInt(import.meta.env.VITE_FLOWDROP_TIMEOUT)
			: 30000,
		authType:
			(import.meta.env.VITE_FLOWDROP_AUTH_TYPE as 'none' | 'bearer' | 'api_key' | 'custom') ||
			'none',
		authToken: import.meta.env.VITE_FLOWDROP_AUTH_TOKEN || undefined
	};
}
