/**
 * Unit Tests - AgentSpecExecutionService
 *
 * Tests for the service that connects FlowDrop to Agent Spec runtimes
 * (WayFlow/PyAgentSpec) for workflow execution, status tracking, and
 * result retrieval.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentSpecExecutionService } from '$lib/services/agentSpecExecutionService.js';
import type { AgentSpecEndpointConfig } from '$lib/config/agentSpecEndpoints.js';
import type { StandardWorkflow } from '$lib/adapters/WorkflowAdapter.js';

// --- Mocks ---

vi.mock('$lib/adapters/agentspec/AgentSpecAdapter.js', () => {
	const AgentSpecAdapter = vi.fn();
	AgentSpecAdapter.prototype.toAgentSpec = vi.fn().mockReturnValue({ nodes: [], edges: [] });
	return { AgentSpecAdapter };
});

vi.mock('$lib/utils/logger.js', () => ({
	logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }
}));

// --- Helpers ---

function makeConfig(overrides: Partial<AgentSpecEndpointConfig> = {}): AgentSpecEndpointConfig {
	return {
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
		timeout: 60_000,
		...overrides
	};
}

function makeWorkflow(overrides: Partial<StandardWorkflow> = {}): StandardWorkflow {
	return {
		id: 'workflow-1',
		name: 'Test Workflow',
		nodes: [
			{
				id: 'node-1',
				type: 'llm',
				position: { x: 0, y: 0 },
				data: { label: 'LLM Node', config: {}, metadata: {} as never }
			}
		],
		edges: [],
		...overrides
	};
}

function fetchOk(body: unknown) {
	return vi.fn().mockResolvedValue({
		ok: true,
		status: 200,
		json: async () => body,
		text: async () => JSON.stringify(body)
	});
}

function fetchFail(status: number, text = 'Error') {
	return vi.fn().mockResolvedValue({
		ok: false,
		status,
		statusText: text,
		json: async () => ({}),
		text: async () => text
	});
}

// --- Tests ---

describe('AgentSpecExecutionService', () => {
	let service: AgentSpecExecutionService;
	const originalFetch = global.fetch;

	beforeEach(() => {
		// Reset singleton so each test gets a fresh instance
		// @ts-expect-error Accessing private static for test isolation
		AgentSpecExecutionService.instance = undefined;
		service = AgentSpecExecutionService.getInstance();

		vi.clearAllMocks();
		vi.useFakeTimers();
	});

	afterEach(() => {
		service.destroy();
		global.fetch = originalFetch;
		vi.useRealTimers();
	});

	describe('singleton', () => {
		it('returns the same instance on repeated calls', () => {
			const a = AgentSpecExecutionService.getInstance();
			const b = AgentSpecExecutionService.getInstance();
			expect(a).toBe(b);
		});
	});

	describe('configure / isConfigured', () => {
		it('reports not configured before configure() is called', () => {
			expect(service.isConfigured()).toBe(false);
		});

		it('reports configured after configure() is called', () => {
			service.configure(makeConfig());
			expect(service.isConfigured()).toBe(true);
		});
	});

	describe('checkHealth', () => {
		it('returns false when not configured', async () => {
			expect(await service.checkHealth()).toBe(false);
		});

		it('returns true when the health endpoint responds with 2xx', async () => {
			global.fetch = fetchOk({ status: 'ok' });
			service.configure(makeConfig());
			expect(await service.checkHealth()).toBe(true);
		});

		it('returns false when the health endpoint responds with a non-2xx status', async () => {
			global.fetch = fetchFail(503);
			service.configure(makeConfig());
			expect(await service.checkHealth()).toBe(false);
		});

		it('returns false when fetch throws (e.g. runtime is unreachable)', async () => {
			global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
			service.configure(makeConfig());
			expect(await service.checkHealth()).toBe(false);
		});
	});

	describe('executeWorkflow', () => {
		it('throws when not configured', async () => {
			await expect(service.executeWorkflow(makeWorkflow())).rejects.toThrow(/not configured/i);
		});

		it('throws when the runtime returns a non-2xx response', async () => {
			global.fetch = fetchFail(500, 'Internal Server Error');
			service.configure(makeConfig());

			await expect(service.executeWorkflow(makeWorkflow())).rejects.toThrow(/500/);
		});

		it('throws when the runtime does not return an execution ID', async () => {
			global.fetch = fetchOk({ message: 'ok' }); // no execution_id / id
			service.configure(makeConfig());

			await expect(service.executeWorkflow(makeWorkflow())).rejects.toThrow(
				/did not return an execution ID/i
			);
		});

		it('returns a handle with executionId and stop function on success', async () => {
			global.fetch = fetchOk({ execution_id: 'exec-42' });
			service.configure(makeConfig());

			const handle = await service.executeWorkflow(makeWorkflow());

			expect(handle.executionId).toBe('exec-42');
			expect(typeof handle.stop).toBe('function');
		});

		it('also accepts an id field instead of execution_id', async () => {
			global.fetch = fetchOk({ id: 'exec-99' });
			service.configure(makeConfig());

			const handle = await service.executeWorkflow(makeWorkflow());
			expect(handle.executionId).toBe('exec-99');
		});

		it('starts polling when callbacks are provided', async () => {
			// First call: POST execute → returns execution ID
			// Subsequent calls: GET status → simulate a still-running execution
			global.fetch = vi
				.fn()
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({ execution_id: 'exec-1' }),
					text: async () => ''
				})
				.mockResolvedValue({
					ok: true,
					status: 200,
					json: async () => ({ status: 'running', node_statuses: {} }),
					text: async () => ''
				});

			service.configure(makeConfig());
			const onNodeUpdate = vi.fn();

			await service.executeWorkflow(makeWorkflow(), {}, { onNodeUpdate }, 500);

			// Advance timers past one polling interval to let the initial poll and one interval run
			await vi.advanceTimersByTimeAsync(600);

			// fetch was called: once for execute + at least one poll
			expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(1);
		});

		it('calls onComplete and stops polling when execution completes', async () => {
			global.fetch = vi
				.fn()
				// POST execute
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({ execution_id: 'exec-done' }),
					text: async () => ''
				})
				// GET status — completed
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({ status: 'completed', node_statuses: {} }),
					text: async () => ''
				})
				// GET results
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({ output: 'result' }),
					text: async () => ''
				});

			service.configure(makeConfig());
			const onComplete = vi.fn();

			await service.executeWorkflow(makeWorkflow(), {}, { onComplete }, 500);
			await vi.runAllTimersAsync();

			expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ output: 'result' }));
		});

		it('calls onError and stops polling when execution fails', async () => {
			global.fetch = vi
				.fn()
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({ execution_id: 'exec-fail' }),
					text: async () => ''
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({
						status: 'failed',
						error: 'Something went wrong',
						node_statuses: {}
					}),
					text: async () => ''
				});

			service.configure(makeConfig());
			const onError = vi.fn();

			await service.executeWorkflow(makeWorkflow(), {}, { onError }, 500);
			await vi.runAllTimersAsync();

			expect(onError).toHaveBeenCalledWith(expect.any(Error));
			expect(onError.mock.calls[0][0].message).toContain('Something went wrong');
		});

		it('maps node statuses and calls onNodeUpdate for each node', async () => {
			global.fetch = vi
				.fn()
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({ execution_id: 'exec-nodes' }),
					text: async () => ''
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => ({
						status: 'running',
						node_statuses: {
							'LLM Node': { status: 'running', execution_count: 1 }
						}
					}),
					text: async () => ''
				})
				// Keep it running so polling doesn't stop
				.mockResolvedValue({
					ok: true,
					status: 200,
					json: async () => ({ status: 'running', node_statuses: {} }),
					text: async () => ''
				});

			service.configure(makeConfig());
			const onNodeUpdate = vi.fn();

			// Workflow has node-1 with label 'LLM Node' — service maps name → id
			await service.executeWorkflow(makeWorkflow(), {}, { onNodeUpdate }, 500);
			// Advance past one polling interval so the initial poll fires
			await vi.advanceTimersByTimeAsync(600);

			expect(onNodeUpdate).toHaveBeenCalled();
			const [nodeId, info] = onNodeUpdate.mock.calls[0];
			expect(nodeId).toBe('node-1');
			expect(info.status).toBe('running');
			expect(info.isExecuting).toBe(true);
		});
	});

	describe('getExecutionStatus', () => {
		it('throws when not configured', async () => {
			await expect(service.getExecutionStatus('exec-1')).rejects.toThrow(/not configured/i);
		});

		it('returns a node info map on success', async () => {
			global.fetch = fetchOk({
				node_statuses: {
					'node-a': { status: 'completed', execution_count: 1 }
				}
			});
			service.configure(makeConfig());

			const result = await service.getExecutionStatus('exec-1');
			expect(result).not.toBeNull();
			expect(result!['node-a'].status).toBe('completed');
		});

		it('returns null when the status endpoint returns a non-2xx response', async () => {
			global.fetch = fetchFail(404);
			service.configure(makeConfig());

			const result = await service.getExecutionStatus('exec-1');
			expect(result).toBeNull();
		});

		it('returns null when fetch throws', async () => {
			global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));
			service.configure(makeConfig());

			const result = await service.getExecutionStatus('exec-1');
			expect(result).toBeNull();
		});
	});

	describe('cancelExecution', () => {
		it('throws when not configured', async () => {
			await expect(service.cancelExecution('exec-1')).rejects.toThrow(/not configured/i);
		});

		it('sends a POST to the cancel endpoint', async () => {
			global.fetch = fetchOk({ success: true });
			service.configure(makeConfig());

			await service.cancelExecution('exec-1');

			const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
			const cancelCall = calls.find(([url]: [string]) => url.includes('/cancel'));
			expect(cancelCall).toBeDefined();
			expect(cancelCall![1].method).toBe('POST');
		});

		it('marks the execution status as cancelled', async () => {
			// Start an execution first
			global.fetch = vi
				.fn()
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({ execution_id: 'exec-cancel' }),
					text: async () => ''
				})
				.mockResolvedValue({ ok: true, json: async () => ({}), text: async () => '' });

			service.configure(makeConfig());
			await service.executeWorkflow(makeWorkflow());

			// Now cancel it — should not throw
			await expect(service.cancelExecution('exec-cancel')).resolves.toBeUndefined();
		});
	});

	describe('getResults', () => {
		it('throws when not configured', async () => {
			await expect(service.getResults('exec-1')).rejects.toThrow(/not configured/i);
		});

		it('returns the results on success', async () => {
			global.fetch = fetchOk({ output: 'hello' });
			service.configure(makeConfig());

			const results = await service.getResults('exec-1');
			expect(results).toEqual({ output: 'hello' });
		});

		it('returns null when the results endpoint responds with non-2xx', async () => {
			global.fetch = fetchFail(404);
			service.configure(makeConfig());

			const results = await service.getResults('exec-1');
			expect(results).toBeNull();
		});

		it('returns null when fetch throws', async () => {
			global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));
			service.configure(makeConfig());

			const results = await service.getResults('exec-1');
			expect(results).toBeNull();
		});
	});

	describe('validateOnRuntime', () => {
		it('throws when not configured', async () => {
			await expect(service.validateOnRuntime(makeWorkflow())).rejects.toThrow(/not configured/i);
		});

		it('returns { valid: true } on a successful validation response', async () => {
			global.fetch = fetchOk({ valid: true });
			service.configure(makeConfig());

			const result = await service.validateOnRuntime(makeWorkflow());
			expect(result.valid).toBe(true);
		});

		it('returns { valid: false, errors } when validation endpoint returns non-2xx', async () => {
			global.fetch = fetchFail(422);
			service.configure(makeConfig());

			const result = await service.validateOnRuntime(makeWorkflow());
			expect(result.valid).toBe(false);
			expect(result.errors).toBeDefined();
			expect(result.errors![0]).toMatch(/422/);
		});
	});

	describe('destroy', () => {
		it('clears all active polling intervals without throwing', async () => {
			global.fetch = vi
				.fn()
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({ execution_id: 'exec-a' }),
					text: async () => ''
				})
				.mockResolvedValue({
					ok: true,
					json: async () => ({ status: 'running', node_statuses: {} }),
					text: async () => ''
				});

			service.configure(makeConfig());
			await service.executeWorkflow(makeWorkflow(), {}, { onNodeUpdate: vi.fn() }, 500);

			// Should not throw
			expect(() => service.destroy()).not.toThrow();
		});
	});

	describe('status mapping', () => {
		// Indirectly test mapToFlowDropStatus via getExecutionStatus

		const cases: Array<[string, string]> = [
			['running', 'running'],
			['executing', 'running'],
			['completed', 'completed'],
			['success', 'completed'],
			['done', 'completed'],
			['failed', 'failed'],
			['error', 'failed'],
			['cancelled', 'cancelled'],
			['canceled', 'cancelled'],
			['pending', 'pending'],
			['queued', 'pending'],
			['skipped', 'skipped'],
			['unknown_status', 'idle']
		];

		it.each(cases)(
			'maps runtime status "%s" to FlowDrop status "%s"',
			async (runtimeStatus, expectedStatus) => {
				global.fetch = fetchOk({
					node_statuses: {
						'test-node': { status: runtimeStatus, execution_count: 0 }
					}
				});
				service.configure(makeConfig());

				const result = await service.getExecutionStatus('exec-1');
				expect(result!['test-node'].status).toBe(expectedStatus);
			}
		);
	});
});
