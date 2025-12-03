/**
 * Enhanced API Client for FlowDrop
 *
 * Uses configurable endpoints and supports pluggable authentication providers.
 *
 * @module api/enhanced-client
 */

import type {
	NodeMetadata,
	Workflow,
	ExecutionResult,
	ApiResponse,
	NodesResponse,
	WorkflowResponse,
	WorkflowsResponse
} from '../types/index.js';
import type { EndpointConfig } from '../config/endpoints.js';
import { buildEndpointUrl, getEndpointMethod, getEndpointHeaders } from '../config/endpoints.js';
import type { AuthProvider } from '../types/auth.js';
import { createAuthProviderFromLegacyConfig } from '../types/auth.js';

/**
 * API error with additional context
 */
export class ApiError extends Error {
	/** HTTP status code */
	public readonly status: number;
	/** Original error data from API */
	public readonly errorData: Record<string, unknown>;
	/** Operation that was being performed */
	public readonly operation: string;

	constructor(
		message: string,
		status: number,
		operation: string,
		errorData: Record<string, unknown> = {}
	) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.operation = operation;
		this.errorData = errorData;
	}
}

/**
 * Enhanced HTTP API client for FlowDrop with configurable endpoints
 *
 * Supports pluggable authentication via AuthProvider interface.
 *
 * @example
 * ```typescript
 * // With AuthProvider
 * const client = new EnhancedFlowDropApiClient(config, authProvider);
 *
 * // Backward compatible (uses config.auth)
 * const client = new EnhancedFlowDropApiClient(config);
 * ```
 */
export class EnhancedFlowDropApiClient {
	private config: EndpointConfig;
	private authProvider: AuthProvider;

	/**
	 * Create a new EnhancedFlowDropApiClient
	 *
	 * @param config - Endpoint configuration
	 * @param authProvider - Optional authentication provider (if not provided, uses config.auth)
	 */
	constructor(config: EndpointConfig, authProvider?: AuthProvider) {
		this.config = config;

		// Use provided AuthProvider or create one from legacy config
		this.authProvider = authProvider ?? createAuthProviderFromLegacyConfig(config.auth);
	}

	/**
	 * Make HTTP request with error handling, retry logic, and auth support
	 *
	 * @param endpointKey - Key identifying the endpoint (for method/header lookup)
	 * @param endpointPath - The endpoint path template
	 * @param params - URL parameters to substitute
	 * @param options - Additional fetch options
	 * @param operation - Description of the operation (for error messages)
	 */
	private async request<T>(
		endpointKey: string,
		endpointPath: string,
		params?: Record<string, string>,
		options: RequestInit = {},
		operation: string = 'API request'
	): Promise<T> {
		const url = buildEndpointUrl(this.config, endpointPath, params);
		const method = options.method ?? getEndpointMethod(this.config, endpointKey);
		const configHeaders = getEndpointHeaders(this.config, endpointKey);

		// Get auth headers from provider
		const authHeaders = await this.authProvider.getAuthHeaders();

		// Merge headers: config headers < auth headers < request-specific headers
		const headers: Record<string, string> = {
			...configHeaders,
			...authHeaders,
			...(options.headers as Record<string, string>)
		};

		const fetchConfig: RequestInit = {
			method,
			headers,
			...options
		};

		let lastError: Error | null = null;
		const maxAttempts = this.config.retry?.enabled ? this.config.retry.maxAttempts : 1;

		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			try {
				const response = await fetch(url, fetchConfig);

				// Handle 401 Unauthorized
				if (response.status === 401) {
					if (this.authProvider.onUnauthorized) {
						const refreshed = await this.authProvider.onUnauthorized();
						if (refreshed && attempt < maxAttempts) {
							// Get new auth headers and retry
							const newAuthHeaders = await this.authProvider.getAuthHeaders();
							fetchConfig.headers = {
								...configHeaders,
								...newAuthHeaders,
								...(options.headers as Record<string, string>)
							};
							continue; // Retry with new headers
						}
					}
					throw new ApiError('Unauthorized', 401, operation, {});
				}

				// Handle 403 Forbidden
				if (response.status === 403) {
					if (this.authProvider.onForbidden) {
						await this.authProvider.onForbidden();
					}
					throw new ApiError('Forbidden', 403, operation, {});
				}

				// Handle other errors
				if (!response.ok) {
					const errorData = await response.json().catch(() => ({}));
					throw new ApiError(
						errorData.error ?? `HTTP ${response.status}: ${response.statusText}`,
						response.status,
						operation,
						errorData
					);
				}

				const data = await response.json();
				return data as T;
			} catch (error) {
				// If it's already an ApiError, preserve it
				if (error instanceof ApiError) {
					lastError = error;
				} else {
					lastError = error instanceof Error ? error : new Error(String(error));
				}

				// Don't retry on auth errors (401, 403) or last attempt
				if (
					(lastError instanceof ApiError &&
						(lastError.status === 401 || lastError.status === 403)) ||
					attempt === maxAttempts
				) {
					console.error(`API request failed after ${attempt} attempts:`, lastError);
					throw lastError;
				}

				// Wait before retry
				const delay = this.config.retry?.delay ?? 1000;
				const backoffDelay =
					this.config.retry?.backoff === 'exponential' ? delay * Math.pow(2, attempt - 1) : delay;

				await new Promise((resolve) => setTimeout(resolve, backoffDelay));
			}
		}

		throw lastError;
	}

	/**
	 * Update the auth provider
	 *
	 * Useful for updating auth after token refresh in parent application.
	 * Note: Per specification, this should rarely be needed as auth is typically
	 * set at mount time and requires remount to change.
	 *
	 * @param authProvider - New authentication provider
	 */
	setAuthProvider(authProvider: AuthProvider): void {
		this.authProvider = authProvider;
	}

	/**
	 * Get current auth provider
	 *
	 * @returns The current AuthProvider instance
	 */
	getAuthProvider(): AuthProvider {
		return this.authProvider;
	}

	// =========================================================================
	// Node API Methods
	// =========================================================================

	/**
	 * Fetch all available node types
	 */
	async getAvailableNodes(): Promise<NodeMetadata[]> {
		const response = await this.request<NodesResponse>(
			'nodes.list',
			this.config.endpoints.nodes.list,
			undefined,
			{},
			'fetch available nodes'
		);

		if (!response.success || !response.data) {
			throw new Error(response.error ?? 'Failed to fetch available nodes');
		}

		return response.data;
	}

	/**
	 * Fetch nodes filtered by category
	 */
	async getNodesByCategory(category: string): Promise<NodeMetadata[]> {
		const response = await this.request<NodesResponse>(
			'nodes.byCategory',
			this.config.endpoints.nodes.byCategory,
			{ category },
			{},
			'fetch nodes by category'
		);

		if (!response.success || !response.data) {
			throw new Error(response.error ?? 'Failed to fetch nodes by category');
		}

		return response.data;
	}

	/**
	 * Fetch metadata for a specific node type
	 */
	async getNodeMetadata(nodeId: string): Promise<NodeMetadata> {
		const response = await this.request<ApiResponse<NodeMetadata>>(
			'nodes.metadata',
			this.config.endpoints.nodes.metadata,
			{ id: nodeId },
			{},
			'fetch node metadata'
		);

		if (!response.success || !response.data) {
			throw new Error(response.error ?? 'Failed to fetch node metadata');
		}

		return response.data;
	}

	// =========================================================================
	// Workflow API Methods
	// =========================================================================

	/**
	 * Save a new workflow
	 */
	async saveWorkflow(workflow: Workflow): Promise<Workflow> {
		const response = await this.request<WorkflowResponse>(
			'workflows.create',
			this.config.endpoints.workflows.create,
			undefined,
			{
				method: 'POST',
				body: JSON.stringify(workflow)
			},
			'save workflow'
		);

		if (!response.success || !response.data) {
			throw new Error(response.error ?? 'Failed to save workflow');
		}

		return response.data;
	}

	/**
	 * Update an existing workflow
	 */
	async updateWorkflow(workflowId: string, workflow: Partial<Workflow>): Promise<Workflow> {
		const response = await this.request<WorkflowResponse>(
			'workflows.update',
			this.config.endpoints.workflows.update,
			{ id: workflowId },
			{
				method: 'PUT',
				body: JSON.stringify(workflow)
			},
			'update workflow'
		);

		if (!response.success || !response.data) {
			throw new Error(response.error ?? 'Failed to update workflow');
		}

		return response.data;
	}

	/**
	 * Load a workflow by ID
	 */
	async loadWorkflow(workflowId: string): Promise<Workflow> {
		const response = await this.request<WorkflowResponse>(
			'workflows.get',
			this.config.endpoints.workflows.get,
			{ id: workflowId },
			{},
			'load workflow'
		);

		if (!response.success || !response.data) {
			throw new Error(response.error ?? 'Failed to load workflow');
		}

		return response.data;
	}

	/**
	 * List all workflows
	 */
	async listWorkflows(): Promise<Workflow[]> {
		const response = await this.request<WorkflowsResponse>(
			'workflows.list',
			this.config.endpoints.workflows.list,
			undefined,
			{},
			'list workflows'
		);

		if (!response.success || !response.data) {
			throw new Error(response.error ?? 'Failed to list workflows');
		}

		return response.data;
	}

	/**
	 * Delete a workflow
	 */
	async deleteWorkflow(workflowId: string): Promise<void> {
		const response = await this.request<ApiResponse<void>>(
			'workflows.delete',
			this.config.endpoints.workflows.delete,
			{ id: workflowId },
			{ method: 'DELETE' },
			'delete workflow'
		);

		if (!response.success) {
			throw new Error(response.error ?? 'Failed to delete workflow');
		}
	}

	/**
	 * Validate a workflow
	 */
	async validateWorkflow(workflow: Workflow): Promise<{ valid: boolean; errors: string[] }> {
		const response = await this.request<ApiResponse<{ valid: boolean; errors: string[] }>>(
			'workflows.validate',
			this.config.endpoints.workflows.validate,
			undefined,
			{
				method: 'POST',
				body: JSON.stringify(workflow)
			},
			'validate workflow'
		);

		if (!response.success || !response.data) {
			throw new Error(response.error ?? 'Failed to validate workflow');
		}

		return response.data;
	}

	/**
	 * Export a workflow as JSON string
	 */
	async exportWorkflow(workflowId: string): Promise<string> {
		const response = await this.request<ApiResponse<string>>(
			'workflows.export',
			this.config.endpoints.workflows.export,
			{ id: workflowId },
			{},
			'export workflow'
		);

		if (!response.success || !response.data) {
			throw new Error(response.error ?? 'Failed to export workflow');
		}

		return response.data;
	}

	/**
	 * Import a workflow from JSON
	 */
	async importWorkflow(workflowJson: string): Promise<Workflow> {
		const response = await this.request<WorkflowResponse>(
			'workflows.import',
			this.config.endpoints.workflows.import,
			undefined,
			{
				method: 'POST',
				body: JSON.stringify({ workflow: workflowJson })
			},
			'import workflow'
		);

		if (!response.success || !response.data) {
			throw new Error(response.error ?? 'Failed to import workflow');
		}

		return response.data;
	}

	// =========================================================================
	// Execution API Methods
	// =========================================================================

	/**
	 * Execute a workflow
	 */
	async executeWorkflow(
		workflowId: string,
		inputs?: Record<string, unknown>
	): Promise<ExecutionResult> {
		const response = await this.request<ApiResponse<ExecutionResult>>(
			'executions.execute',
			this.config.endpoints.executions.execute,
			{ id: workflowId },
			{
				method: 'POST',
				body: JSON.stringify({ inputs })
			},
			'execute workflow'
		);

		if (!response.success || !response.data) {
			throw new Error(response.error ?? 'Failed to execute workflow');
		}

		return response.data;
	}

	/**
	 * Get execution status
	 */
	async getExecutionStatus(executionId: string): Promise<ExecutionResult> {
		const response = await this.request<ApiResponse<ExecutionResult>>(
			'executions.status',
			this.config.endpoints.executions.status,
			{ id: executionId },
			{},
			'get execution status'
		);

		if (!response.success || !response.data) {
			throw new Error(response.error ?? 'Failed to get execution status');
		}

		return response.data;
	}

	/**
	 * Cancel a running execution
	 */
	async cancelExecution(executionId: string): Promise<void> {
		const response = await this.request<ApiResponse<void>>(
			'executions.cancel',
			this.config.endpoints.executions.cancel,
			{ id: executionId },
			{ method: 'POST' },
			'cancel execution'
		);

		if (!response.success) {
			throw new Error(response.error ?? 'Failed to cancel execution');
		}
	}

	/**
	 * Get execution logs
	 */
	async getExecutionLogs(executionId: string): Promise<string[]> {
		const response = await this.request<ApiResponse<string[]>>(
			'executions.logs',
			this.config.endpoints.executions.logs,
			{ id: executionId },
			{},
			'get execution logs'
		);

		if (!response.success || !response.data) {
			throw new Error(response.error ?? 'Failed to get execution logs');
		}

		return response.data;
	}

	// =========================================================================
	// Template API Methods
	// =========================================================================

	/**
	 * List available templates
	 */
	async listTemplates(): Promise<Workflow[]> {
		const response = await this.request<WorkflowsResponse>(
			'templates.list',
			this.config.endpoints.templates.list,
			undefined,
			{},
			'list templates'
		);

		if (!response.success || !response.data) {
			throw new Error(response.error ?? 'Failed to list templates');
		}

		return response.data;
	}

	/**
	 * Get a template by ID
	 */
	async getTemplate(templateId: string): Promise<Workflow> {
		const response = await this.request<WorkflowResponse>(
			'templates.get',
			this.config.endpoints.templates.get,
			{ id: templateId },
			{},
			'get template'
		);

		if (!response.success || !response.data) {
			throw new Error(response.error ?? 'Failed to get template');
		}

		return response.data;
	}

	// =========================================================================
	// System API Methods
	// =========================================================================

	/**
	 * Get system health status
	 */
	async getSystemHealth(): Promise<{ status: string; timestamp: number }> {
		const response = await this.request<ApiResponse<{ status: string; timestamp: number }>>(
			'system.health',
			this.config.endpoints.system.health,
			undefined,
			{},
			'get system health'
		);

		if (!response.success || !response.data) {
			throw new Error(response.error ?? 'Failed to get system health');
		}

		return response.data;
	}

	/**
	 * Get system configuration
	 */
	async getSystemConfig(): Promise<Record<string, unknown>> {
		const response = await this.request<ApiResponse<Record<string, unknown>>>(
			'system.config',
			this.config.endpoints.system.config,
			undefined,
			{},
			'get system config'
		);

		if (!response.success || !response.data) {
			throw new Error(response.error ?? 'Failed to get system config');
		}

		return response.data;
	}

	/**
	 * Get system version information
	 */
	async getSystemVersion(): Promise<{ version: string; build: string }> {
		const response = await this.request<ApiResponse<{ version: string; build: string }>>(
			'system.version',
			this.config.endpoints.system.version,
			undefined,
			{},
			'get system version'
		);

		if (!response.success || !response.data) {
			throw new Error(response.error ?? 'Failed to get system version');
		}

		return response.data;
	}
}
