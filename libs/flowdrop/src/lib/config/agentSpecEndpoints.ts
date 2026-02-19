/**
 * Agent Spec Runtime Endpoint Configuration
 *
 * Defines the API endpoints for connecting to Agent Spec runtimes
 * (WayFlow, PyAgentSpec, or other compatible runtimes).
 */

/**
 * Agent Spec runtime endpoint configuration.
 *
 * Separate from the main FlowDrop EndpointConfig because the Agent Spec
 * runtime is an independent service with its own base URL and auth.
 *
 * @example
 * ```typescript
 * const config: AgentSpecEndpointConfig = {
 *   baseUrl: 'http://localhost:8000',
 *   endpoints: { ...defaultAgentSpecEndpoints.endpoints },
 *   auth: { type: 'bearer', token: 'my-api-key' }
 * };
 * ```
 */
export interface AgentSpecEndpointConfig {
	/** Base URL for the Agent Spec runtime */
	baseUrl: string;

	endpoints: {
		/** POST — Execute a flow (body: AgentSpecFlow JSON) */
		execute: string;
		/** GET — Get execution status (params: {id}) */
		status: string;
		/** POST — Cancel a running execution (params: {id}) */
		cancel: string;
		/** GET — Get execution results (params: {id}) */
		results: string;
		/** WS — WebSocket for streaming execution updates (params: {id}) */
		stream: string;
		/** POST — Validate a flow specification (body: AgentSpecFlow JSON) */
		validate: string;
		/** GET — List available agents on the runtime */
		agents: string;
		/** GET — List available tools on the runtime */
		tools: string;
		/** GET — Runtime health check */
		health: string;
	};

	/** Authentication for the runtime */
	auth?: {
		type: 'none' | 'bearer' | 'api_key';
		token?: string;
		apiKey?: string;
	};

	/** Request timeout in milliseconds */
	timeout?: number;
}

/**
 * Default Agent Spec runtime endpoints.
 * Targets a local WayFlow/PyAgentSpec instance on port 8000.
 */
export const defaultAgentSpecEndpoints: AgentSpecEndpointConfig = {
	baseUrl: 'http://localhost:8000',
	endpoints: {
		execute: '/flows/execute',
		status: '/executions/{id}',
		cancel: '/executions/{id}/cancel',
		results: '/executions/{id}/results',
		stream: '/executions/{id}/stream',
		validate: '/flows/validate',
		agents: '/agents',
		tools: '/tools',
		health: '/health'
	},
	timeout: 60000
};

/**
 * Create Agent Spec endpoint configuration with custom base URL.
 */
export function createAgentSpecEndpointConfig(
	baseUrl: string,
	overrides?: Partial<AgentSpecEndpointConfig>
): AgentSpecEndpointConfig {
	return {
		...defaultAgentSpecEndpoints,
		baseUrl: baseUrl.replace(/\/$/, ''),
		...overrides
	};
}

/**
 * Build a full URL for an Agent Spec runtime endpoint.
 */
export function buildAgentSpecUrl(
	config: AgentSpecEndpointConfig,
	endpointPath: string,
	params?: Record<string, string>
): string {
	let url = endpointPath;

	if (params) {
		for (const [key, value] of Object.entries(params)) {
			url = url.replace(`{${key}}`, encodeURIComponent(value));
		}
	}

	if (!url.startsWith('http') && !url.startsWith('//')) {
		url = `${config.baseUrl}${url.startsWith('/') ? url : `/${url}`}`;
	}

	return url;
}

/**
 * Get authentication headers for Agent Spec runtime requests.
 */
export function getAgentSpecAuthHeaders(config: AgentSpecEndpointConfig): Record<string, string> {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json'
	};

	if (config.auth?.type === 'bearer' && config.auth.token) {
		headers['Authorization'] = `Bearer ${config.auth.token}`;
	} else if (config.auth?.type === 'api_key' && config.auth.apiKey) {
		headers['X-API-Key'] = config.auth.apiKey;
	}

	return headers;
}
