/**
 * API Configuration
 * Centralized configuration for all API endpoints
 *
 * @deprecated This module is deprecated. For new implementations, prefer using
 * `EndpointConfig` from './endpoints.js' which provides a more comprehensive
 * configuration system with auth, retry, timeout, and per-endpoint customization.
 *
 * Migration:
 * - `ApiConfig` -> `EndpointConfig`
 * - `defaultApiConfig` -> `defaultEndpointConfig`
 * - `getEndpointUrl()` -> `buildEndpointUrl()`
 */

/**
 * @deprecated Use `EndpointConfig` from './endpoints.js' instead
 */
export interface ApiConfig {
	baseUrl: string;
	endpoints: {
		workflows: {
			list: string;
			get: string;
			create: string;
			update: string;
			delete: string;
			execute: string;
			executionState: string;
		};
		executions: {
			active: string;
		};
		nodes: {
			list: string;
		};
	};
}

/**
 * Default API configuration
 * For library usage, configuration should be provided at runtime
 * This provides sensible defaults that can be overridden
 *
 * @deprecated Use `defaultEndpointConfig` from './endpoints.js' instead
 */
export const defaultApiConfig: ApiConfig = {
	baseUrl: '/api/flowdrop',
	endpoints: {
		workflows: {
			list: '/workflows',
			get: '/workflows/{id}',
			create: '/workflows',
			update: '/workflows/{id}',
			delete: '/workflows/{id}',
			execute: '/workflows/{id}/execute',
			executionState: '/workflows/{id}/executions/{execution_id}/state'
		},
		executions: {
			active: '/executions/active'
		},
		nodes: {
			list: '/nodes'
		}
	}
};

/**
 * Get full URL for an endpoint
 *
 * @deprecated Use `buildEndpointUrl()` from './endpoints.js' instead
 */
export function getEndpointUrl(
	config: ApiConfig,
	endpoint: string,
	params: Record<string, string> = {}
): string {
	let url = config.baseUrl + endpoint;

	// Replace path parameters
	for (const [key, value] of Object.entries(params)) {
		url = url.replace(`{${key}}`, value);
	}

	return url;
}
