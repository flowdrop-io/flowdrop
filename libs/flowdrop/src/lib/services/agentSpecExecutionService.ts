/**
 * Agent Spec Execution Service
 *
 * Connects FlowDrop to Agent Spec runtimes (WayFlow/PyAgentSpec) for
 * workflow execution, status tracking, and result retrieval.
 *
 * Follows the same singleton pattern as NodeExecutionService.
 */

import type { NodeExecutionInfo, NodeExecutionStatus } from '../types/index.js';
import type { StandardWorkflow } from '../adapters/WorkflowAdapter.js';
import type { AgentSpecEndpointConfig } from '../config/agentSpecEndpoints.js';
import { buildAgentSpecUrl, getAgentSpecAuthHeaders } from '../config/agentSpecEndpoints.js';
import { AgentSpecAdapter } from '../adapters/agentspec/AgentSpecAdapter.js';

/** Execution state tracked per active execution */
interface ExecutionState {
	id: string;
	status: 'running' | 'completed' | 'failed' | 'cancelled';
	startedAt: string;
	nodeStatuses: Record<string, NodeExecutionInfo>;
	pollingInterval?: ReturnType<typeof setInterval>;
}

/** Result returned when starting an execution */
export interface AgentSpecExecutionHandle {
	/** Unique execution ID from the runtime */
	executionId: string;
	/** Stop polling and clean up */
	stop: () => void;
}

/**
 * Service for executing FlowDrop workflows on Agent Spec runtimes.
 *
 * @example
 * ```typescript
 * const service = AgentSpecExecutionService.getInstance();
 * service.configure(myRuntimeConfig);
 *
 * // Check runtime availability
 * const healthy = await service.checkHealth();
 *
 * // Execute a workflow
 * const handle = await service.executeWorkflow(workflow, inputs, {
 *   onNodeUpdate: (nodeId, info) => updateNodeVisual(nodeId, info),
 *   onComplete: (results) => showResults(results),
 *   onError: (error) => showError(error)
 * });
 *
 * // Cancel if needed
 * await service.cancelExecution(handle.executionId);
 * ```
 */
export class AgentSpecExecutionService {
	private static instance: AgentSpecExecutionService;
	private config: AgentSpecEndpointConfig | null = null;
	private adapter: AgentSpecAdapter;
	private activeExecutions: Map<string, ExecutionState> = new Map();

	private constructor() {
		this.adapter = new AgentSpecAdapter();
	}

	public static getInstance(): AgentSpecExecutionService {
		if (!AgentSpecExecutionService.instance) {
			AgentSpecExecutionService.instance = new AgentSpecExecutionService();
		}
		return AgentSpecExecutionService.instance;
	}

	/**
	 * Configure the runtime connection.
	 */
	configure(config: AgentSpecEndpointConfig): void {
		this.config = config;
	}

	/**
	 * Check if the service has been configured with a runtime.
	 */
	isConfigured(): boolean {
		return this.config !== null;
	}

	/**
	 * Check runtime health.
	 */
	async checkHealth(): Promise<boolean> {
		if (!this.config) return false;

		try {
			const url = buildAgentSpecUrl(this.config, this.config.endpoints.health);
			const response = await fetch(url, {
				headers: getAgentSpecAuthHeaders(this.config),
				signal: AbortSignal.timeout(5000)
			});
			return response.ok;
		} catch {
			return false;
		}
	}

	/**
	 * Execute a FlowDrop workflow on the Agent Spec runtime.
	 *
	 * 1. Converts StandardWorkflow → AgentSpecFlow using the adapter
	 * 2. POSTs the flow JSON to the runtime
	 * 3. Starts polling for execution status
	 * 4. Maps runtime node statuses to FlowDrop's NodeExecutionInfo
	 */
	async executeWorkflow(
		workflow: StandardWorkflow,
		inputs?: Record<string, unknown>,
		callbacks?: {
			onNodeUpdate?: (nodeId: string, info: NodeExecutionInfo) => void;
			onComplete?: (results: Record<string, unknown>) => void;
			onError?: (error: Error) => void;
		},
		pollingIntervalMs = 2000
	): Promise<AgentSpecExecutionHandle> {
		this.ensureConfigured();

		// Convert to Agent Spec format
		const agentSpecFlow = this.adapter.toAgentSpec(workflow);

		// POST to runtime
		const url = buildAgentSpecUrl(this.getConfig(), this.getConfig().endpoints.execute);
		const response = await fetch(url, {
			method: 'POST',
			headers: getAgentSpecAuthHeaders(this.getConfig()),
			body: JSON.stringify({
				flow: agentSpecFlow,
				inputs: inputs || {}
			}),
			signal: AbortSignal.timeout(this.getConfig().timeout || 60000)
		});

		if (!response.ok) {
			const errorText = await response.text().catch(() => 'Unknown error');
			throw new Error(`Agent Spec runtime error (${response.status}): ${errorText}`);
		}

		const result = await response.json();
		const executionId = result.execution_id || result.id;

		if (!executionId) {
			throw new Error('Runtime did not return an execution ID');
		}

		// Track execution
		const state: ExecutionState = {
			id: executionId,
			status: 'running',
			startedAt: new Date().toISOString(),
			nodeStatuses: {}
		};
		this.activeExecutions.set(executionId, state);

		// Build node name → FlowDrop node ID mapping for status updates
		const nameToNodeId = new Map<string, string>();
		for (const node of workflow.nodes) {
			const label = node.data.label || node.id;
			nameToNodeId.set(label, node.id);
		}

		// Start polling
		const stop = () => this.stopPolling(executionId);

		if (callbacks) {
			this.startPolling(
				executionId,
				nameToNodeId,
				callbacks.onNodeUpdate,
				callbacks.onComplete,
				callbacks.onError,
				pollingIntervalMs
			);
		}

		return { executionId, stop };
	}

	/**
	 * Get current execution status.
	 */
	async getExecutionStatus(executionId: string): Promise<Record<string, NodeExecutionInfo> | null> {
		this.ensureConfigured();

		try {
			const url = buildAgentSpecUrl(this.getConfig(), this.getConfig().endpoints.status, {
				id: executionId
			});
			const response = await fetch(url, {
				headers: getAgentSpecAuthHeaders(this.getConfig())
			});

			if (!response.ok) return null;

			const data = await response.json();
			return this.mapRuntimeStatusToNodeInfo(data);
		} catch {
			return null;
		}
	}

	/**
	 * Cancel a running execution.
	 */
	async cancelExecution(executionId: string): Promise<void> {
		this.ensureConfigured();

		this.stopPolling(executionId);

		const url = buildAgentSpecUrl(this.getConfig(), this.getConfig().endpoints.cancel, {
			id: executionId
		});

		await fetch(url, {
			method: 'POST',
			headers: getAgentSpecAuthHeaders(this.getConfig())
		});

		const state = this.activeExecutions.get(executionId);
		if (state) {
			state.status = 'cancelled';
		}
	}

	/**
	 * Get execution results.
	 */
	async getResults(executionId: string): Promise<Record<string, unknown> | null> {
		this.ensureConfigured();

		try {
			const url = buildAgentSpecUrl(this.getConfig(), this.getConfig().endpoints.results, {
				id: executionId
			});
			const response = await fetch(url, {
				headers: getAgentSpecAuthHeaders(this.getConfig())
			});

			if (!response.ok) return null;
			return await response.json();
		} catch {
			return null;
		}
	}

	/**
	 * Validate a workflow against the runtime.
	 */
	async validateOnRuntime(workflow: StandardWorkflow): Promise<{
		valid: boolean;
		errors?: string[];
	}> {
		this.ensureConfigured();

		const agentSpecFlow = this.adapter.toAgentSpec(workflow);
		const url = buildAgentSpecUrl(this.getConfig(), this.getConfig().endpoints.validate);

		const response = await fetch(url, {
			method: 'POST',
			headers: getAgentSpecAuthHeaders(this.getConfig()),
			body: JSON.stringify(agentSpecFlow)
		});

		if (!response.ok) {
			return { valid: false, errors: [`Runtime validation failed: ${response.status}`] };
		}

		return await response.json();
	}

	/**
	 * Clean up all active executions.
	 */
	destroy(): void {
		for (const [id] of this.activeExecutions) {
			this.stopPolling(id);
		}
		this.activeExecutions.clear();
	}

	// ========================================================================
	// Private
	// ========================================================================

	private ensureConfigured(): void {
		if (!this.config) {
			throw new Error(
				'AgentSpecExecutionService not configured. Call configure() with runtime endpoint config first.'
			);
		}
	}

	/** Get the config, throwing if not configured */
	private getConfig(): AgentSpecEndpointConfig {
		this.ensureConfigured();
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		return this.config!;
	}

	private startPolling(
		executionId: string,
		nameToNodeId: Map<string, string>,
		onNodeUpdate?: (nodeId: string, info: NodeExecutionInfo) => void,
		onComplete?: (results: Record<string, unknown>) => void,
		onError?: (error: Error) => void,
		intervalMs = 2000
	): void {
		const state = this.activeExecutions.get(executionId);
		if (!state) return;

		const poll = async () => {
			try {
				const url = buildAgentSpecUrl(this.getConfig(), this.getConfig().endpoints.status, {
					id: executionId
				});
				const response = await fetch(url, {
					headers: getAgentSpecAuthHeaders(this.getConfig())
				});

				if (!response.ok) {
					throw new Error(`Status check failed: ${response.status}`);
				}

				const data = await response.json();
				const executionStatus = data.status || data.execution_status;

				// Map node statuses
				const nodeStatuses = data.node_statuses || data.nodes || {};
				for (const [nodeName, status] of Object.entries(nodeStatuses)) {
					const nodeId = nameToNodeId.get(nodeName) || nodeName;
					const info = this.mapSingleNodeStatus(status as Record<string, unknown>);
					state.nodeStatuses[nodeId] = info;
					onNodeUpdate?.(nodeId, info);
				}

				// Check if execution is done
				if (executionStatus === 'completed' || executionStatus === 'success') {
					state.status = 'completed';
					this.stopPolling(executionId);

					const results = await this.getResults(executionId);
					onComplete?.(results || {});
				} else if (executionStatus === 'failed' || executionStatus === 'error') {
					state.status = 'failed';
					this.stopPolling(executionId);

					const errorMsg = data.error || data.message || 'Execution failed';
					onError?.(new Error(errorMsg));
				} else if (executionStatus === 'cancelled') {
					state.status = 'cancelled';
					this.stopPolling(executionId);
				}
			} catch (error) {
				// Don't stop polling on transient errors — let it retry
				console.error('[AgentSpecExecution] Polling error:', error);
			}
		};

		// Initial poll immediately, then at interval
		poll();
		state.pollingInterval = setInterval(poll, intervalMs);
	}

	private stopPolling(executionId: string): void {
		const state = this.activeExecutions.get(executionId);
		if (state?.pollingInterval) {
			clearInterval(state.pollingInterval);
			state.pollingInterval = undefined;
		}
	}

	private mapRuntimeStatusToNodeInfo(
		data: Record<string, unknown>
	): Record<string, NodeExecutionInfo> {
		const result: Record<string, NodeExecutionInfo> = {};
		const nodeStatuses = (data.node_statuses || data.nodes || {}) as Record<
			string,
			Record<string, unknown>
		>;

		for (const [nodeName, status] of Object.entries(nodeStatuses)) {
			result[nodeName] = this.mapSingleNodeStatus(status);
		}

		return result;
	}

	private mapSingleNodeStatus(status: Record<string, unknown>): NodeExecutionInfo {
		const runtimeStatus = (status.status || status.state || 'idle') as string;

		return {
			status: this.mapToFlowDropStatus(runtimeStatus),
			executionCount: (status.execution_count as number) || 0,
			isExecuting: runtimeStatus === 'running' || runtimeStatus === 'executing',
			lastExecuted: status.started_at as string | undefined,
			lastExecutionDuration: status.duration_ms as number | undefined,
			lastError: status.error as string | undefined
		};
	}

	private mapToFlowDropStatus(runtimeStatus: string): NodeExecutionStatus {
		switch (runtimeStatus) {
			case 'running':
			case 'executing':
				return 'running';
			case 'completed':
			case 'success':
			case 'done':
				return 'completed';
			case 'failed':
			case 'error':
				return 'failed';
			case 'cancelled':
			case 'canceled':
				return 'cancelled';
			case 'pending':
			case 'queued':
				return 'pending';
			case 'skipped':
				return 'skipped';
			default:
				return 'idle';
		}
	}
}

/** Singleton instance */
export const agentSpecExecutionService = AgentSpecExecutionService.getInstance();
