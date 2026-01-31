/**
 * Mock API responses for testing
 *
 * Predefined API responses to use with MSW or fetch mocks.
 */

import type { ApiResponse } from '$lib/types';
import { testNodesList } from './nodes.js';
import { testWorkflows } from './workflows.js';

/**
 * Success response wrapper
 */
export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
	return {
		success: true,
		data,
		...(message && { message })
	};
}

/**
 * Error response wrapper
 */
export function errorResponse(error: string, code?: string): ApiResponse<never> {
	return {
		success: false,
		error,
		...(code && { code })
	};
}

/**
 * Mock responses for node API
 */
export const mockNodeResponses = {
	list: successResponse(testNodesList, 'Found 6 node types'),

	listByCategory: (category: string) =>
		successResponse(
			testNodesList.filter((node) => node.category === category),
			`Found ${testNodesList.filter((n) => n.category === category).length} node types`
		),

	get: (id: string) => {
		const node = testNodesList.find((n) => n.id === id);
		return node ? successResponse(node) : errorResponse('Node not found', 'NOT_FOUND');
	},

	notFound: errorResponse('Node not found', 'NOT_FOUND'),

	serverError: errorResponse('Internal server error', 'INTERNAL_ERROR')
};

/**
 * Mock responses for workflow API
 */
export const mockWorkflowResponses = {
	list: successResponse(Object.values(testWorkflows), 'Found 4 workflows'),

	get: (id: string) => {
		const workflow = Object.values(testWorkflows).find((w) => w.id === id);
		return workflow ? successResponse(workflow) : errorResponse('Workflow not found', 'NOT_FOUND');
	},

	created: (workflow: typeof testWorkflows.simple) =>
		successResponse({ ...workflow, id: `new-${Date.now()}` }, 'Workflow created successfully'),

	updated: (workflow: typeof testWorkflows.simple) =>
		successResponse(workflow, 'Workflow updated successfully'),

	deleted: successResponse(null, 'Workflow deleted successfully'),

	notFound: errorResponse('Workflow not found', 'NOT_FOUND'),

	validationError: errorResponse('Workflow validation failed', 'VALIDATION_ERROR')
};

/**
 * Mock responses for port config API
 */
export const mockPortConfigResponse = successResponse({
	version: '1.0.0',
	defaultDataType: 'string',
	dataTypes: [
		{
			id: 'trigger',
			name: 'Trigger',
			description: 'Control flow',
			color: 'var(--fd-node-purple)',
			category: 'basic',
			enabled: true
		},
		{
			id: 'string',
			name: 'String',
			description: 'Text data',
			color: 'var(--fd-node-emerald)',
			category: 'basic',
			enabled: true
		},
		{
			id: 'number',
			name: 'Number',
			description: 'Numeric data',
			color: 'var(--fd-node-blue)',
			category: 'numeric',
			enabled: true
		},
		{
			id: 'boolean',
			name: 'Boolean',
			description: 'True/false values',
			color: 'var(--fd-node-orange)',
			category: 'logical',
			enabled: true
		},
		{
			id: 'json',
			name: 'JSON',
			description: 'Structured data',
			color: 'var(--fd-node-amber)',
			category: 'complex',
			enabled: true
		},
		{
			id: 'mixed',
			name: 'Mixed',
			description: 'Any data type',
			color: 'var(--fd-node-slate)',
			category: 'special',
			enabled: true
		}
	],
	compatibilityRules: []
});

/**
 * Mock responses for pipeline API
 */
export const mockPipelineResponses = {
	list: successResponse(
		[
			{
				id: 'pipeline-1',
				workflow_id: testWorkflows.simple.id,
				status: 'completed',
				created: '2024-01-01T00:00:00Z',
				updated: '2024-01-01T00:05:00Z'
			}
		],
		'Found 1 pipeline execution'
	),

	get: (id: string) =>
		successResponse({
			status: 'running',
			jobs: [
				{
					id: `${id}-job-1`,
					node_id: 'node-input',
					status: 'completed',
					execution_count: 1,
					started: '2024-01-01T00:00:00Z',
					completed: '2024-01-01T00:00:01Z',
					execution_time: 1000
				}
			],
			node_statuses: {
				'node-input': {
					status: 'completed',
					last_executed: '2024-01-01T00:00:01Z',
					execution_time: 1000
				}
			},
			job_status_summary: {
				total: 1,
				pending: 0,
				running: 0,
				completed: 1,
				failed: 0,
				cancelled: 0
			}
		}),

	executed: (pipelineId: string) =>
		successResponse(
			{
				pipeline_id: pipelineId,
				status: 'running',
				message: 'Pipeline execution started'
			},
			'Pipeline execution started'
		)
};

/**
 * Mock health check response
 */
export const mockHealthResponse = {
	status: 'healthy',
	timestamp: new Date().toISOString(),
	version: '1.0.0',
	service: 'FlowDrop API',
	uptime: 3600
};

/**
 * Collection of all mock responses
 */
export const mockApiResponses = {
	nodes: mockNodeResponses,
	workflows: mockWorkflowResponses,
	portConfig: mockPortConfigResponse,
	pipelines: mockPipelineResponses,
	health: mockHealthResponse
};
