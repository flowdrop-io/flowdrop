/**
 * Test helper utilities for FlowDrop
 *
 * Shared utilities to make test writing easier and more consistent.
 */

import type { Workflow, WorkflowNode, WorkflowEdge, NodeMetadata } from '$lib/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a minimal test workflow
 */
export function createTestWorkflow(overrides?: Partial<Workflow>): Workflow {
	return {
		id: uuidv4(),
		name: 'Test Workflow',
		description: 'A workflow for testing',
		nodes: [],
		edges: [],
		metadata: {
			version: '1.0.0',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			versionId: `${Date.now()}-test`,
			updateNumber: 0
		},
		...overrides
	};
}

/**
 * Create a test node
 */
export function createTestNode(overrides?: Partial<WorkflowNode>): WorkflowNode {
	const id = overrides?.id || `node-${uuidv4()}`;
	return {
		id,
		type: 'default',
		position: { x: 100, y: 100 },
		data: {
			label: 'Test Node',
			config: {},
			metadata: createTestNodeMetadata()
		},
		...overrides
	};
}

/**
 * Create a test edge
 */
export function createTestEdge(overrides?: Partial<WorkflowEdge>): WorkflowEdge {
	return {
		id: `edge-${uuidv4()}`,
		source: 'node-1',
		target: 'node-2',
		sourceHandle: 'output',
		targetHandle: 'input',
		...overrides
	};
}

/**
 * Create test node metadata
 */
export function createTestNodeMetadata(overrides?: Partial<NodeMetadata>): NodeMetadata {
	return {
		id: 'test_node',
		name: 'Test Node',
		description: 'A node for testing',
		category: 'processing',
		version: '1.0.0',
		type: 'default',
		inputs: [
			{
				id: 'input',
				name: 'Input',
				type: 'input',
				dataType: 'string',
				required: false
			}
		],
		outputs: [
			{
				id: 'output',
				name: 'Output',
				type: 'output',
				dataType: 'string'
			}
		],
		configSchema: {
			type: 'object',
			properties: {}
		},
		...overrides
	};
}

/**
 * Wait for a condition to be true
 *
 * Useful for async operations in tests.
 */
export async function waitFor(
	condition: () => boolean,
	options: { timeout?: number; interval?: number } = {}
): Promise<void> {
	const { timeout = 5000, interval = 50 } = options;
	const startTime = Date.now();

	while (!condition()) {
		if (Date.now() - startTime > timeout) {
			throw new Error('Timeout waiting for condition');
		}
		await new Promise((resolve) => setTimeout(resolve, interval));
	}
}

/**
 * Flush all pending promises
 *
 * Useful for ensuring all async operations complete.
 */
export async function flushPromises(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Mock fetch response
 */
export function mockFetchResponse<T>(
	data: T,
	options: { status?: number; ok?: boolean } = {}
): Response {
	const { status = 200, ok = true } = options;
	return {
		ok,
		status,
		statusText: ok ? 'OK' : 'Error',
		headers: new Headers({ 'content-type': 'application/json' }),
		json: async () => ({ success: ok, data }),
		text: async () => JSON.stringify({ success: ok, data }),
		clone: () => mockFetchResponse(data, options)
	} as Response;
}

/**
 * Mock fetch error
 */
export function mockFetchError(message: string, status = 500): Response {
	return {
		ok: false,
		status,
		statusText: 'Error',
		headers: new Headers({ 'content-type': 'application/json' }),
		json: async () => ({ success: false, error: message }),
		text: async () => JSON.stringify({ success: false, error: message }),
		clone: () => mockFetchError(message, status)
	} as Response;
}

/**
 * Create a mock endpoint config for testing
 */
export function createMockEndpointConfig(baseUrl = '/api/flowdrop') {
	return {
		baseUrl,
		endpoints: {
			nodes: {
				list: '/nodes',
				get: '/nodes/{id}'
			},
			workflows: {
				list: '/workflows',
				get: '/workflows/{id}',
				create: '/workflows',
				update: '/workflows/{id}',
				delete: '/workflows/{id}'
			},
			portConfig: '/port-config'
		},
		timeout: 30000
	};
}

/**
 * Create a spy that tracks all calls
 */
export function createCallTracker<T extends (...args: unknown[]) => unknown>() {
	const calls: Array<{ args: unknown[]; result?: unknown; error?: Error }> = [];

	const spy = ((...args: unknown[]) => {
		try {
			const result = undefined; // Override in actual implementation
			calls.push({ args, result });
			return result;
		} catch (error) {
			calls.push({ args, error: error as Error });
			throw error;
		}
	}) as T;

	return {
		spy,
		calls,
		callCount: () => calls.length,
		lastCall: () => calls[calls.length - 1],
		reset: () => calls.splice(0, calls.length)
	};
}
