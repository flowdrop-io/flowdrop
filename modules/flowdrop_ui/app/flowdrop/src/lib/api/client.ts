/**
 * API Client for FlowDrop Workflow Library
 */

import type {
	NodeMetadata,
	Workflow,
	ExecutionResult,
	ApiResponse,
	NodesResponse,
	WorkflowResponse,
	WorkflowsResponse,
	PortConfig
} from '../types/index.js';

/**
 * HTTP API client for FlowDrop
 */
export class FlowDropApiClient {
	private baseUrl: string;
	private headers: Record<string, string>;

	constructor(baseUrl: string, apiKey?: string) {
		this.baseUrl = baseUrl.replace(/\/$/, '');
		this.headers = {
			'Content-Type': 'application/json'
		};

		if (apiKey) {
			this.headers['Authorization'] = `Bearer ${apiKey}`;
		}
	}

	/**
	 * Make HTTP request with error handling
	 */
	private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
		const url = `${this.baseUrl}${endpoint}`;
		const config: RequestInit = {
			headers: this.headers,
			...options
		};

		try {
			const response = await fetch(url, config);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const data = await response.json();
			return data as T;
		} catch (error) {
			console.error('API request failed:', error);
			throw new Error(
				`API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Fetch available node types and their metadata
	 */
	async getAvailableNodes(): Promise<NodeMetadata[]> {
		const response = await this.request<NodesResponse>('/api/flowdrop/nodes');

		if (!response.success || !response.data) {
			throw new Error(response.error || 'Failed to fetch available nodes');
		}

		return response.data;
	}

	/**
	 * Fetch nodes by category
	 */
	async getNodesByCategory(category: string): Promise<NodeMetadata[]> {
		const response = await this.request<NodesResponse>(
			`/api/nodes?category=${encodeURIComponent(category)}`
		);

		if (!response.success || !response.data) {
			throw new Error(response.error || 'Failed to fetch nodes by category');
		}

		return response.data;
	}

	/**
	 * Fetch a specific node's metadata
	 */
	async getNodeMetadata(nodeId: string): Promise<NodeMetadata> {
		const response = await this.request<ApiResponse<NodeMetadata>>(
			`/api/nodes/${encodeURIComponent(nodeId)}`
		);

		if (!response.success || !response.data) {
			throw new Error(response.error || 'Failed to fetch node metadata');
		}

		return response.data;
	}

	/**
	 * Save a workflow
	 */
	async saveWorkflow(workflow: Workflow): Promise<Workflow> {
		const response = await this.request<WorkflowResponse>('/api/flowdrop/workflows', {
			method: 'POST',
			body: JSON.stringify(workflow)
		});

		if (!response.success || !response.data) {
			throw new Error(response.error || 'Failed to save workflow');
		}

		return response.data;
	}

	/**
	 * Update an existing workflow
	 */
	async updateWorkflow(workflowId: string, workflow: Partial<Workflow>): Promise<Workflow> {
		const response = await this.request<WorkflowResponse>(
			`/api/workflows/${encodeURIComponent(workflowId)}`,
			{
				method: 'PUT',
				body: JSON.stringify(workflow)
			}
		);

		if (!response.success || !response.data) {
			throw new Error(response.error || 'Failed to update workflow');
		}

		return response.data;
	}

	/**
	 * Load a workflow by ID
	 */
	async loadWorkflow(workflowId: string): Promise<Workflow> {
		const response = await this.request<WorkflowResponse>(
			`/api/workflows/${encodeURIComponent(workflowId)}`
		);

		if (!response.success || !response.data) {
			throw new Error(response.error || 'Failed to load workflow');
		}

		return response.data;
	}

	/**
	 * List all workflows
	 */
	async listWorkflows(): Promise<Workflow[]> {
		const response = await this.request<WorkflowsResponse>('/api/flowdrop/workflows');

		if (!response.success || !response.data) {
			throw new Error(response.error || 'Failed to list workflows');
		}

		return response.data;
	}

	/**
	 * Delete a workflow
	 */
	async deleteWorkflow(workflowId: string): Promise<void> {
		const response = await this.request<ApiResponse<void>>(
			`/api/workflows/${encodeURIComponent(workflowId)}`,
			{
				method: 'DELETE'
			}
		);

		if (!response.success) {
			throw new Error(response.error || 'Failed to delete workflow');
		}
	}

	/**
	 * Execute a workflow
	 */
	async executeWorkflow(
		workflowId: string,
		inputs?: Record<string, unknown>
	): Promise<ExecutionResult> {
		const response = await this.request<ApiResponse<ExecutionResult>>(
			`/api/workflows/${encodeURIComponent(workflowId)}/execute`,
			{
				method: 'POST',
				body: JSON.stringify({ inputs })
			}
		);

		if (!response.success || !response.data) {
			throw new Error(response.error || 'Failed to execute workflow');
		}

		return response.data;
	}

	/**
	 * Get execution status
	 */
	async getExecutionStatus(executionId: string): Promise<ExecutionResult> {
		const response = await this.request<ApiResponse<ExecutionResult>>(
			`/api/executions/${encodeURIComponent(executionId)}`
		);

		if (!response.success || !response.data) {
			throw new Error(response.error || 'Failed to get execution status');
		}

		return response.data;
	}

	/**
	 * Cancel workflow execution
	 */
	async cancelExecution(executionId: string): Promise<void> {
		const response = await this.request<ApiResponse<void>>(
			`/api/executions/${encodeURIComponent(executionId)}/cancel`,
			{
				method: 'POST'
			}
		);

		if (!response.success) {
			throw new Error(response.error || 'Failed to cancel execution');
		}
	}

	/**
	 * Get execution logs
	 */
	async getExecutionLogs(executionId: string): Promise<string[]> {
		const response = await this.request<ApiResponse<string[]>>(
			`/api/executions/${encodeURIComponent(executionId)}/logs`
		);

		if (!response.success || !response.data) {
			throw new Error(response.error || 'Failed to get execution logs');
		}

		return response.data;
	}

	/**
	 * Validate workflow configuration
	 */
	async validateWorkflow(workflow: Workflow): Promise<{ valid: boolean; errors: string[] }> {
		const response = await this.request<ApiResponse<{ valid: boolean; errors: string[] }>>(
			'/api/flowdrop/workflows/validate',
			{
				method: 'POST',
				body: JSON.stringify(workflow)
			}
		);

		if (!response.success || !response.data) {
			throw new Error(response.error || 'Failed to validate workflow');
		}

		return response.data;
	}

	/**
	 * Export workflow as JSON
	 */
	async exportWorkflow(workflowId: string): Promise<string> {
		const response = await this.request<ApiResponse<string>>(
			`/api/workflows/${encodeURIComponent(workflowId)}/export`
		);

		if (!response.success || !response.data) {
			throw new Error(response.error || 'Failed to export workflow');
		}

		return response.data;
	}

	/**
	 * Import workflow from JSON
	 */
	async importWorkflow(workflowJson: string): Promise<Workflow> {
		const response = await this.request<WorkflowResponse>('/api/flowdrop/workflows/import', {
			method: 'POST',
			body: JSON.stringify({ workflow: workflowJson })
		});

		if (!response.success || !response.data) {
			throw new Error(response.error || 'Failed to import workflow');
		}

		return response.data;
	}

	/**
	 * Fetch port configuration
	 */
	async getPortConfig(): Promise<PortConfig> {
		const response = await this.request<ApiResponse<PortConfig>>('/api/flowdrop/port-config');

		if (!response.success || !response.data) {
			throw new Error(response.error || 'Failed to fetch port configuration');
		}

		return response.data;
	}

	/**
	 * Fetch pipeline data including job information and status
	 */
	async getPipelineData(pipelineId: string): Promise<{
		status: string;
		jobs: Array<Record<string, unknown>>;
		node_statuses: Record<string, { status: string; [key: string]: unknown }>;
		job_status_summary: {
			total: number;
			pending: number;
			running: number;
			completed: number;
			failed: number;
			cancelled: number;
		};
	}> {
		const response = await this.request<{
			status: string;
			jobs: Array<Record<string, unknown>>;
			node_statuses: Record<string, { status: string; [key: string]: unknown }>;
			job_status_summary: {
				total: number;
				pending: number;
				running: number;
				completed: number;
				failed: number;
				cancelled: number;
			};
		}>(`/api/flowdrop/pipeline/${encodeURIComponent(pipelineId)}`);

		return response;
	}
}
