/**
 * MSW handlers for Dynamic Schema API endpoints
 * Implements GET /api/flowdrop/nodes/:nodeTypeId/schema for dynamic config schema fetching
 */

import { http, HttpResponse } from 'msw';
import type { ApiResponse, ConfigSchema } from '../../lib/types/index.js';

/** Response type for dynamic schema */
type DynamicSchemaResponse = ApiResponse<ConfigSchema>;

/** Base API path for flowdrop endpoints */
const API_BASE = '/api/flowdrop';

/**
 * Mock dynamic schemas for different node types.
 * These simulate schemas that would be fetched from a remote server.
 */
const mockDynamicSchemas: Record<string, ConfigSchema> = {
	/**
	 * Schema for the dynamic_config_demo node
	 * Demonstrates a complete form with various field types
	 */
	dynamic_config_demo: {
		type: 'object',
		properties: {
			apiKey: {
				type: 'string',
				title: 'API Key',
				description: 'Your API key for authentication (fetched dynamically)',
				format: 'password',
				required: true
			},
			environment: {
				type: 'string',
				title: 'Environment',
				description: 'Select the deployment environment',
				enum: ['development', 'staging', 'production'],
				default: 'development'
			},
			retryCount: {
				type: 'number',
				title: 'Retry Count',
				description: 'Number of retry attempts on failure',
				minimum: 0,
				maximum: 10,
				default: 3
			},
			enableLogging: {
				type: 'boolean',
				title: 'Enable Logging',
				description: 'Log all requests for debugging',
				default: false
			},
			requestTimeout: {
				type: 'number',
				title: 'Request Timeout (ms)',
				description: 'Timeout for API requests in milliseconds',
				minimum: 1000,
				maximum: 60000,
				default: 5000
			},
			customHeaders: {
				type: 'string',
				title: 'Custom Headers',
				description: 'Additional headers to include in requests (JSON format)',
				format: 'multiline'
			}
		}
	},

	/**
	 * Schema for the dynamic_schema_only_demo node
	 * Demonstrates schema-only configuration
	 */
	dynamic_schema_only_demo: {
		type: 'object',
		properties: {
			dataSource: {
				type: 'string',
				title: 'Data Source URL',
				description: 'URL of the data source to connect to',
				required: true
			},
			authMethod: {
				type: 'string',
				title: 'Authentication Method',
				description: 'How to authenticate with the data source',
				enum: ['none', 'basic', 'bearer', 'oauth2'],
				default: 'none'
			},
			username: {
				type: 'string',
				title: 'Username',
				description: 'Username for basic authentication (if applicable)'
			},
			password: {
				type: 'string',
				title: 'Password',
				description: 'Password for basic authentication (if applicable)',
				format: 'password'
			},
			token: {
				type: 'string',
				title: 'Bearer Token',
				description: 'Bearer token for token authentication (if applicable)',
				format: 'password'
			},
			cacheResults: {
				type: 'boolean',
				title: 'Cache Results',
				description: 'Cache fetched data for improved performance',
				default: true
			},
			cacheDuration: {
				type: 'number',
				title: 'Cache Duration (seconds)',
				description: 'How long to cache results',
				minimum: 0,
				maximum: 86400,
				default: 300
			},
			transformScript: {
				type: 'string',
				title: 'Transform Script',
				description: 'JavaScript code to transform the fetched data',
				format: 'multiline'
			}
		}
	}
};

/**
 * GET /api/flowdrop/nodes/:nodeTypeId/schema
 * Retrieve dynamic configuration schema for a specific node type
 */
export const getDynamicSchemaHandler = http.get(
	`${API_BASE}/nodes/:nodeTypeId/schema`,
	({ params, request }) => {
		const { nodeTypeId } = params;
		const nodeId = Array.isArray(nodeTypeId) ? nodeTypeId[0] : nodeTypeId;

		// Check for optional instance ID in headers
		const instanceId = request.headers.get('X-FlowDrop-Instance');

		// Find the schema for this node type
		const schema = mockDynamicSchemas[nodeId];

		if (!schema) {
			return HttpResponse.json(
				{
					success: false,
					error: 'Dynamic schema not available for this node type',
					code: 'SCHEMA_NOT_FOUND'
				} as DynamicSchemaResponse,
				{ status: 404 }
			);
		}

		// Simulate a slight delay to mimic network latency
		const response: DynamicSchemaResponse = {
			success: true,
			data: schema,
			message: `Dynamic schema for "${nodeId}" loaded successfully${instanceId ? ` (instance: ${instanceId})` : ''}`
		};

		return HttpResponse.json(response, {
			headers: {
				'Content-Type': 'application/json',
				'X-Schema-Version': '1.0.0',
				'X-Cache-Control': 'max-age=300'
			}
		});
	}
);

/**
 * POST /api/flowdrop/nodes/:nodeTypeId/config
 * Save configuration for a node (mock endpoint for external config systems)
 */
export const saveNodeConfigHandler = http.post(
	`${API_BASE}/nodes/:nodeTypeId/config`,
	async ({ params, request }) => {
		const { nodeTypeId } = params;
		const nodeId = Array.isArray(nodeTypeId) ? nodeTypeId[0] : nodeTypeId;

		// Get the request body
		const body = await request.json();

		// Validate that we have config data
		if (!body || typeof body !== 'object') {
			return HttpResponse.json(
				{
					success: false,
					error: 'Invalid configuration data',
					code: 'INVALID_CONFIG'
				},
				{ status: 400 }
			);
		}

		// Mock successful save
		return HttpResponse.json({
			success: true,
			data: {
				nodeTypeId: nodeId,
				config: body,
				savedAt: new Date().toISOString()
			},
			message: `Configuration for "${nodeId}" saved successfully`
		});
	}
);

/**
 * GET /api/flowdrop/nodes/:nodeTypeId/config
 * Retrieve saved configuration for a node (mock endpoint for external config systems)
 */
export const getNodeConfigHandler = http.get(
	`${API_BASE}/nodes/:nodeTypeId/config`,
	({ params, request }) => {
		const { nodeTypeId } = params;
		const nodeId = Array.isArray(nodeTypeId) ? nodeTypeId[0] : nodeTypeId;
		const instanceId = request.headers.get('X-FlowDrop-Instance');

		// Return mock saved configuration
		const mockConfigs: Record<string, Record<string, unknown>> = {
			dynamic_config_demo: {
				apiKey: '',
				environment: 'development',
				retryCount: 3,
				enableLogging: false,
				requestTimeout: 5000,
				customHeaders: ''
			},
			dynamic_schema_only_demo: {
				dataSource: '',
				authMethod: 'none',
				username: '',
				password: '',
				token: '',
				cacheResults: true,
				cacheDuration: 300,
				transformScript: ''
			}
		};

		const config = mockConfigs[nodeId];

		if (!config) {
			return HttpResponse.json(
				{
					success: false,
					error: 'No saved configuration found for this node type',
					code: 'CONFIG_NOT_FOUND'
				},
				{ status: 404 }
			);
		}

		return HttpResponse.json({
			success: true,
			data: {
				nodeTypeId: nodeId,
				instanceId: instanceId ?? undefined,
				config,
				lastModified: new Date().toISOString()
			},
			message: `Configuration for "${nodeId}" retrieved successfully`
		});
	}
);

/**
 * OPTIONS handlers for CORS preflight
 */
export const dynamicSchemaOptionsHandler = http.options(
	`${API_BASE}/nodes/:nodeTypeId/schema`,
	() => {
		return new HttpResponse(null, {
			status: 204,
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-FlowDrop-Instance'
			}
		});
	}
);

export const nodeConfigOptionsHandler = http.options(`${API_BASE}/nodes/:nodeTypeId/config`, () => {
	return new HttpResponse(null, {
		status: 204,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-FlowDrop-Instance'
		}
	});
});

/**
 * Export all dynamic schema handlers
 */
export const dynamicSchemaHandlers = [
	getDynamicSchemaHandler,
	saveNodeConfigHandler,
	getNodeConfigHandler,
	dynamicSchemaOptionsHandler,
	nodeConfigOptionsHandler
];
