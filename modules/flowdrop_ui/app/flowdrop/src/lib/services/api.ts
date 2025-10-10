/**
 * Client-side API service for FlowDrop
 * Provides methods to interact with the backend APIs using configurable endpoints
 */

import type { NodeMetadata, Workflow, ApiResponse } from '../types/index.js';
import type { EndpointConfig } from '../config/endpoints.js';
import { buildEndpointUrl, getEndpointMethod, getEndpointHeaders } from '../config/endpoints.js';

let endpointConfig: EndpointConfig | null = null;

/**
 * Set the endpoint configuration at runtime
 */
export function setEndpointConfig(config: EndpointConfig): void {
	endpointConfig = config;
}

/**
 * Get the current endpoint configuration
 */
export function getEndpointConfig(): EndpointConfig | null {
	return endpointConfig;
}

/**
 * Set the API base URL (backward compatibility)
 */
export function setApiBaseUrl(url: string): void {
	if (!endpointConfig) {
		// Dynamic import for backward compatibility
		import('../config/endpoints.js')
			.then(({ createEndpointConfig }) => {
				endpointConfig = createEndpointConfig(url);
			})
		.catch((error) => {
			// Failed to load endpoint config
		});
	} else {
		endpointConfig.baseUrl = url.replace(/\/$/, '');
	}
}

/**
 * Generic API request helper with endpoint configuration
 */
async function apiRequest<T>(
	endpointKey: string,
	endpointPath: string,
	params?: Record<string, string>,
	options: RequestInit = {}
): Promise<ApiResponse<T>> {
	if (!endpointConfig) {
		throw new Error('Endpoint configuration not set. Call setEndpointConfig() first.');
	}

	try {
		const url = buildEndpointUrl(endpointConfig, endpointPath, params);
		const method = getEndpointMethod(endpointConfig, endpointKey);
		const headers = getEndpointHeaders(endpointConfig, endpointKey);

		const response = await fetch(url, {
			method,
			headers,
			...options
		});

		const data = await response.json();

		if (!response.ok) {
			throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
		}

		return data;
	} catch (error) {
		throw error;
	}
}

/**
 * Node API methods
 */
export const nodeApi = {
	/**
	 * Get all node types with optional filtering
	 */
	async getNodes(options?: {
		category?: string;
		search?: string;
		limit?: number;
		offset?: number;
	}): Promise<NodeMetadata[]> {
		if (!endpointConfig) {
			throw new Error('Endpoint configuration not set');
		}

		const params = new URLSearchParams();

		if (options?.category) params.append('category', options.category);
		if (options?.search) params.append('search', options.search);
		if (options?.limit) params.append('limit', options.limit.toString());
		if (options?.offset) params.append('offset', options.offset.toString());

		const response = await apiRequest<NodeMetadata[]>(
			'nodes.list',
			endpointConfig.endpoints.nodes.list + '?' + params.toString()
		);
		return response.data || [];
	},

	/**
	 * Get a specific node type by ID
	 */
	async getNode(id: string): Promise<NodeMetadata> {
		if (!endpointConfig) {
			throw new Error('Endpoint configuration not set');
		}

		const response = await apiRequest<NodeMetadata>(
			'nodes.get',
			endpointConfig.endpoints.nodes.get,
			{ id }
		);
		if (!response.data) {
			throw new Error('Node not found');
		}
		return response.data;
	}
};

/**
 * Workflow API methods
 */
export const workflowApi = {
	/**
	 * Get all workflows with optional filtering
	 */
	async getWorkflows(options?: {
		search?: string;
		limit?: number;
		offset?: number;
	}): Promise<Workflow[]> {
		if (!endpointConfig) {
			throw new Error('Endpoint configuration not set');
		}

		const params = new URLSearchParams();

		if (options?.search) params.append('search', options.search);
		if (options?.limit) params.append('limit', options.limit.toString());
		if (options?.offset) params.append('offset', options.offset.toString());

		const response = await apiRequest<Workflow[]>(
			'workflows.list',
			endpointConfig.endpoints.workflows.list + '?' + params.toString()
		);
		return response.data || [];
	},

	/**
	 * Get a specific workflow by ID
	 */
	async getWorkflow(id: string): Promise<Workflow> {
		if (!endpointConfig) {
			throw new Error('Endpoint configuration not set');
		}

		const response = await apiRequest<Workflow>(
			'workflows.get',
			endpointConfig.endpoints.workflows.get,
			{ id }
		);
		if (!response.data) {
			throw new Error('Workflow not found');
		}
		return response.data;
	},

	/**
	 * Create a new workflow
	 */
	async createWorkflow(workflow: Omit<Workflow, 'id'>): Promise<Workflow> {
		if (!endpointConfig) {
			throw new Error('Endpoint configuration not set');
		}

		const response = await apiRequest<Workflow>(
			'workflows.create',
			endpointConfig.endpoints.workflows.create,
			undefined,
			{
				method: 'POST',
				body: JSON.stringify(workflow)
			}
		);

		if (!response.data) {
			throw new Error('Failed to create workflow');
		}
		return response.data;
	},

	/**
	 * Update an existing workflow
	 */
	async updateWorkflow(id: string, workflow: Partial<Workflow>): Promise<Workflow> {
		if (!endpointConfig) {
			throw new Error('Endpoint configuration not set');
		}


		const response = await apiRequest<Workflow>(
			'workflows.update',
			endpointConfig.endpoints.workflows.update,
			{ id },
			{
				method: 'PUT',
				body: JSON.stringify(workflow)
			}
		);

		if (!response.data) {
			throw new Error('Failed to update workflow');
		}
		return response.data;
	},

	/**
	 * Delete a workflow
	 */
	async deleteWorkflow(id: string): Promise<void> {
		if (!endpointConfig) {
			throw new Error('Endpoint configuration not set');
		}

		await apiRequest<null>(
			'workflows.delete',
			endpointConfig.endpoints.workflows.delete,
			{ id },
			{ method: 'DELETE' }
		);
	},

	/**
	 * Save workflow (create or update)
	 */
	async saveWorkflow(workflow: Workflow): Promise<Workflow> {
		// Check if this is an existing workflow by looking for a valid ID
		// Valid IDs should not be a UUID (which indicates a new workflow)
		const isExistingWorkflow =
			workflow.id &&
			workflow.id.length > 0 &&
			!workflow.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

		if (isExistingWorkflow) {
			// Update existing workflow
			return this.updateWorkflow(workflow.id, workflow);
		} else {
			// Create new workflow
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { id, ...workflowData } = workflow;
			return this.createWorkflow(workflowData);
		}
	}
};

/**
 * Export the API service
 */
export const api = {
	nodes: nodeApi,
	workflows: workflowApi
};
