/**
 * API Configuration
 * Centralized configuration for all API endpoints
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
