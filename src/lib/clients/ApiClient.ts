/**
 * FlowDrop API Client
 * Type-safe client for the FlowDrop API
 */

import type {
	NodeMetadata,
	Workflow,
	ApiResponse,
	NodesResponse,
	WorkflowResponse,
	WorkflowsResponse
} from '../types/index.js';

/**
 * API Client Configuration
 */
export interface ApiClientConfig {
	baseUrl: string;
	apiKey?: string;
	timeout?: number;
	headers?: Record<string, string>;
}

/**
 * Request options for API calls
 */
export interface RequestOptions {
	headers?: Record<string, string>;
	timeout?: number;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
	limit?: number;
	offset?: number;
}

/**
 * Node types query parameters
 */
export interface NodeTypesQuery {
	category?: string;
	search?: string;
	limit?: number;
	offset?: number;
}

/**
 * Workflows query parameters
 */
export interface WorkflowsQuery {
	search?: string;
	tags?: string;
	limit?: number;
	offset?: number;
	sort?: 'created_at' | 'updated_at' | 'name';
	order?: 'asc' | 'desc';
}

/**
 * Create workflow request
 */
export interface CreateWorkflowRequest {
	name: string;
	description?: string;
	nodes?: unknown[];
	edges?: unknown[];
	tags?: string[];
}

/**
 * Update workflow request
 */
export interface UpdateWorkflowRequest {
	name?: string;
	description?: string;
	nodes?: unknown[];
	edges?: unknown[];
	tags?: string[];
}

/**
 * Execute workflow request
 */
export interface ExecuteWorkflowRequest {
	inputs: Record<string, unknown>;
	options?: {
		timeout?: number;
		maxSteps?: number;
	};
}

/**
 * FlowDrop API Client Class
 */
export class ApiClient {
	private config: ApiClientConfig;
	private defaultHeaders: Record<string, string>;

	constructor(config: ApiClientConfig) {
		this.config = {
			timeout: 30000,
			...config
		};

		this.defaultHeaders = {
			'Content-Type': 'application/json',
			...config.headers
		};

		if (config.apiKey) {
			this.defaultHeaders.Authorization = `Bearer ${config.apiKey}`;
		}
	}

	/**
	 * Make an HTTP request
	 */
	private async request<T>(
		method: string,
		path: string,
		data?: unknown,
		options: RequestOptions = {}
	): Promise<T> {
		const url = `${this.config.baseUrl}${path}`;
		const headers = { ...this.defaultHeaders, ...options.headers };
		const timeout = options.timeout || this.config.timeout;

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeout);

		try {
			const response = await fetch(url, {
				method,
				headers,
				body: data ? JSON.stringify(data) : undefined,
				signal: controller.signal
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new ApiError(
					response.status,
					errorData.error || `HTTP ${response.status}`,
					errorData.code,
					errorData.details
				);
			}

			return await response.json();
		} catch (error) {
			clearTimeout(timeoutId);

			if (error instanceof ApiError) {
				throw error;
			}

			if (error instanceof Error && error.name === 'AbortError') {
				throw new ApiError(408, 'Request timeout', 'TIMEOUT');
			}

			throw new ApiError(
				500,
				error instanceof Error ? error.message : 'Network error',
				'NETWORK_ERROR'
			);
		}
	}

	// ===== HEALTH CHECK =====

	/**
	 * Check API health
	 */
	async healthCheck(): Promise<{ status: string; timestamp: string; version: string }> {
		return this.request('GET', '/health');
	}

	// ===== NODE TYPES =====

	/**
	 * Get all node types
	 */
	async getNodeTypes(query?: NodeTypesQuery): Promise<NodesResponse> {
		const params = new URLSearchParams();
		if (query?.category) params.append('category', query.category);
		if (query?.search) params.append('search', query.search);
		if (query?.limit) params.append('limit', query.limit.toString());
		if (query?.offset) params.append('offset', query.offset.toString());

		const path = `/nodes${params.toString() ? `?${params.toString()}` : ''}`;
		return this.request<NodesResponse>('GET', path);
	}

	/**
	 * Get node type by ID
	 */
	async getNodeType(id: string): Promise<NodeTypeResponse> {
		return this.request<NodeTypeResponse>('GET', `/nodes/${id}`);
	}

	// ===== WORKFLOWS =====

	/**
	 * Get all workflows
	 */
	async getWorkflows(query?: WorkflowsQuery): Promise<WorkflowsResponse> {
		const params = new URLSearchParams();
		if (query?.search) params.append('search', query.search);
		if (query?.tags) params.append('tags', query.tags);
		if (query?.limit) params.append('limit', query.limit.toString());
		if (query?.offset) params.append('offset', query.offset.toString());
		if (query?.sort) params.append('sort', query.sort);
		if (query?.order) params.append('order', query.order);

		const path = `/workflows${params.toString() ? `?${params.toString()}` : ''}`;
		return this.request<WorkflowsResponse>('GET', path);
	}

	/**
	 * Get workflow by ID
	 */
	async getWorkflow(id: string): Promise<WorkflowResponse> {
		return this.request<WorkflowResponse>('GET', `/workflows/${id}`);
	}

	/**
	 * Create a new workflow
	 */
	async createWorkflow(data: CreateWorkflowRequest): Promise<WorkflowResponse> {
		return this.request<WorkflowResponse>('POST', '/workflows', data);
	}

	/**
	 * Update workflow
	 */
	async updateWorkflow(id: string, data: UpdateWorkflowRequest): Promise<WorkflowResponse> {
		return this.request<WorkflowResponse>('PUT', `/workflows/${id}`, data);
	}

	/**
	 * Delete workflow
	 */
	async deleteWorkflow(id: string): Promise<void> {
		return this.request<void>('DELETE', `/workflows/${id}`);
	}

	// ===== WORKFLOW EXECUTION =====

	/**
	 * Execute workflow
	 */
	async executeWorkflow(id: string, data: ExecuteWorkflowRequest): Promise<ExecutionResponse> {
		return this.request<ExecutionResponse>('POST', `/workflows/${id}/execute`, data);
	}

	/**
	 * Get execution status
	 */
	async getExecutionStatus(id: string): Promise<ExecutionStatusResponse> {
		return this.request<ExecutionStatusResponse>('GET', `/executions/${id}`);
	}

	/**
	 * Cancel execution
	 */
	async cancelExecution(id: string): Promise<ExecutionResponse> {
		return this.request<ExecutionResponse>('POST', `/executions/${id}/cancel`);
	}

	// ===== IMPORT/EXPORT =====

	/**
	 * Export workflow
	 */
	async exportWorkflow(id: string, format: 'json' | 'yaml' = 'json'): Promise<Workflow> {
		return this.request<Workflow>('GET', `/workflows/${id}/export?format=${format}`);
	}

	/**
	 * Import workflow
	 */
	async importWorkflow(workflow: Workflow): Promise<WorkflowResponse> {
		return this.request<WorkflowResponse>('POST', '/workflows/import', workflow);
	}

	// ===== VALIDATION =====

	/**
	 * Validate workflow
	 */
	async validateWorkflow(workflow: Workflow): Promise<ValidationResponse> {
		return this.request<ValidationResponse>('POST', '/workflows/validate', workflow);
	}

	// ===== UTILITY METHODS =====

	/**
	 * Wait for execution completion
	 */
	async waitForExecution(id: string, pollInterval = 1000): Promise<ExecutionStatusResponse> {
		while (true) {
			const status = await this.getExecutionStatus(id);

			if (
				status.data?.status === 'completed' ||
				status.data?.status === 'failed' ||
				status.data?.status === 'cancelled'
			) {
				return status;
			}

			await new Promise((resolve) => setTimeout(resolve, pollInterval));
		}
	}

	/**
	 * Get workflows by tag
	 */
	async getWorkflowsByTag(
		tag: string,
		query?: Omit<WorkflowsQuery, 'tags'>
	): Promise<WorkflowsResponse> {
		return this.getWorkflows({ ...query, tags: tag });
	}

	/**
	 * Get node types by category
	 */
	async getNodeTypesByCategory(
		category: string,
		query?: Omit<NodeTypesQuery, 'category'>
	): Promise<NodesResponse> {
		return this.getNodeTypes({ ...query, category });
	}
}

/**
 * API Error Class
 */
export class ApiError extends Error {
	constructor(
		public status: number,
		message: string,
		public code?: string,
		public details?: unknown
	) {
		super(message);
		this.name = 'ApiError';
	}
}

/**
 * Execution response types
 */
export type ExecutionResponse = ApiResponse<{
	executionId: string;
	status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
	message: string;
}>;

export type ExecutionStatusResponse = ApiResponse<{
	executionId: string;
	status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
	result?: unknown;
	error?: string;
	startTime: string;
	endTime?: string;
	duration?: number;
	nodeResults?: Record<string, unknown>;
}>;

export type ValidationResponse = ApiResponse<{
	valid: boolean;
	errors: string[];
	warnings: string[];
	suggestions?: string[];
}>;

/**
 * Type for node type response
 */
export type NodeTypeResponse = ApiResponse<NodeMetadata>;
