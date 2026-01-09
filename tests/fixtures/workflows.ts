/**
 * Test fixtures for workflows
 *
 * Reusable workflow data for testing.
 */

import type { Workflow } from '$lib/types';

/**
 * Empty workflow
 */
export const emptyWorkflow: Workflow = {
	id: 'test-workflow-empty',
	name: 'Empty Workflow',
	description: 'A workflow with no nodes',
	nodes: [],
	edges: [],
	metadata: {
		version: '1.0.0',
		createdAt: '2024-01-01T00:00:00Z',
		updatedAt: '2024-01-01T00:00:00Z',
		versionId: 'v1-empty',
		updateNumber: 0
	}
};

/**
 * Simple workflow with two connected nodes
 */
export const simpleWorkflow: Workflow = {
	id: 'test-workflow-simple',
	name: 'Simple Workflow',
	description: 'A workflow with two connected nodes',
	nodes: [
		{
			id: 'node-input',
			type: 'default',
			position: { x: 100, y: 100 },
			data: {
				label: 'Input Node',
				config: {
					value: 'test input'
				},
				metadata: {
					id: 'text_input',
					name: 'Text Input',
					description: 'Input node for testing',
					category: 'inputs',
					version: '1.0.0',
					type: 'default',
					inputs: [],
					outputs: [
						{
							id: 'value',
							name: 'Value',
							type: 'output',
							dataType: 'string'
						}
					],
					configSchema: {
						type: 'object',
						properties: {
							value: {
								type: 'string',
								title: 'Value',
								default: ''
							}
						}
					}
				}
			}
		},
		{
			id: 'node-output',
			type: 'default',
			position: { x: 400, y: 100 },
			data: {
				label: 'Output Node',
				config: {},
				metadata: {
					id: 'text_output',
					name: 'Text Output',
					description: 'Output node for testing',
					category: 'outputs',
					version: '1.0.0',
					type: 'default',
					inputs: [
						{
							id: 'value',
							name: 'Value',
							type: 'input',
							dataType: 'string',
							required: true
						}
					],
					outputs: [],
					configSchema: {
						type: 'object',
						properties: {}
					}
				}
			}
		}
	],
	edges: [
		{
			id: 'edge-1',
			source: 'node-input',
			target: 'node-output',
			sourceHandle: 'value',
			targetHandle: 'value'
		}
	],
	metadata: {
		version: '1.0.0',
		createdAt: '2024-01-01T00:00:00Z',
		updatedAt: '2024-01-01T00:00:00Z',
		versionId: 'v1-simple',
		updateNumber: 0
	}
};

/**
 * Complex workflow with multiple nodes and branches
 */
export const complexWorkflow: Workflow = {
	id: 'test-workflow-complex',
	name: 'Complex Workflow',
	description: 'A workflow with branching and multiple node types',
	nodes: [
		{
			id: 'node-start',
			type: 'terminal',
			position: { x: 100, y: 100 },
			data: {
				label: 'Start',
				config: {},
				metadata: {
					id: 'start',
					name: 'Start',
					description: 'Workflow start point',
					category: 'control',
					version: '1.0.0',
					type: 'terminal',
					inputs: [],
					outputs: [
						{
							id: 'trigger',
							name: 'Trigger',
							type: 'output',
							dataType: 'trigger'
						}
					],
					configSchema: {
						type: 'object',
						properties: {}
					}
				}
			}
		},
		{
			id: 'node-gateway',
			type: 'gateway',
			position: { x: 300, y: 100 },
			data: {
				label: 'Branch Decision',
				config: {
					branches: [
						{
							name: 'branch-a',
							label: 'Branch A',
							condition: 'value > 10'
						},
						{
							name: 'branch-b',
							label: 'Branch B',
							condition: 'value <= 10'
						}
					]
				},
				metadata: {
					id: 'gateway',
					name: 'Gateway',
					description: 'Conditional branching',
					category: 'control',
					version: '1.0.0',
					type: 'gateway',
					inputs: [
						{
							id: 'input',
							name: 'Input',
							type: 'input',
							dataType: 'mixed',
							required: true
						}
					],
					outputs: [],
					configSchema: {
						type: 'object',
						properties: {
							branches: {
								type: 'array',
								title: 'Branches'
							}
						}
					}
				}
			}
		},
		{
			id: 'node-end-a',
			type: 'terminal',
			position: { x: 500, y: 50 },
			data: {
				label: 'End A',
				config: {},
				metadata: {
					id: 'end',
					name: 'End',
					description: 'Workflow end point',
					category: 'control',
					version: '1.0.0',
					type: 'terminal',
					inputs: [
						{
							id: 'trigger',
							name: 'Trigger',
							type: 'input',
							dataType: 'trigger',
							required: true
						}
					],
					outputs: [],
					configSchema: {
						type: 'object',
						properties: {}
					}
				}
			}
		},
		{
			id: 'node-end-b',
			type: 'terminal',
			position: { x: 500, y: 150 },
			data: {
				label: 'End B',
				config: {},
				metadata: {
					id: 'end',
					name: 'End',
					description: 'Workflow end point',
					category: 'control',
					version: '1.0.0',
					type: 'terminal',
					inputs: [
						{
							id: 'trigger',
							name: 'Trigger',
							type: 'input',
							dataType: 'trigger',
							required: true
						}
					],
					outputs: [],
					configSchema: {
						type: 'object',
						properties: {}
					}
				}
			}
		}
	],
	edges: [
		{
			id: 'edge-1',
			source: 'node-start',
			target: 'node-gateway',
			sourceHandle: 'trigger',
			targetHandle: 'input'
		},
		{
			id: 'edge-2',
			source: 'node-gateway',
			target: 'node-end-a',
			sourceHandle: 'branch-a',
			targetHandle: 'trigger'
		},
		{
			id: 'edge-3',
			source: 'node-gateway',
			target: 'node-end-b',
			sourceHandle: 'branch-b',
			targetHandle: 'trigger'
		}
	],
	metadata: {
		version: '1.0.0',
		createdAt: '2024-01-01T00:00:00Z',
		updatedAt: '2024-01-01T00:00:00Z',
		versionId: 'v1-complex',
		updateNumber: 0,
		tags: ['test', 'complex', 'branching']
	}
};

/**
 * Workflow with cyclic dependency (for testing validation)
 */
export const cyclicWorkflow: Workflow = {
	id: 'test-workflow-cyclic',
	name: 'Cyclic Workflow',
	description: 'A workflow with a cycle (invalid)',
	nodes: [
		{
			id: 'node-a',
			type: 'default',
			position: { x: 100, y: 100 },
			data: {
				label: 'Node A',
				config: {},
				metadata: {
					id: 'processor',
					name: 'Processor',
					description: 'Processing node',
					category: 'processing',
					version: '1.0.0',
					type: 'default',
					inputs: [
						{
							id: 'input',
							name: 'Input',
							type: 'input',
							dataType: 'string'
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
					}
				}
			}
		},
		{
			id: 'node-b',
			type: 'default',
			position: { x: 300, y: 100 },
			data: {
				label: 'Node B',
				config: {},
				metadata: {
					id: 'processor',
					name: 'Processor',
					description: 'Processing node',
					category: 'processing',
					version: '1.0.0',
					type: 'default',
					inputs: [
						{
							id: 'input',
							name: 'Input',
							type: 'input',
							dataType: 'string'
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
					}
				}
			}
		}
	],
	edges: [
		{
			id: 'edge-1',
			source: 'node-a',
			target: 'node-b',
			sourceHandle: 'output',
			targetHandle: 'input'
		},
		{
			id: 'edge-2',
			source: 'node-b',
			target: 'node-a',
			sourceHandle: 'output',
			targetHandle: 'input'
		}
	],
	metadata: {
		version: '1.0.0',
		createdAt: '2024-01-01T00:00:00Z',
		updatedAt: '2024-01-01T00:00:00Z',
		versionId: 'v1-cyclic',
		updateNumber: 0
	}
};

/**
 * Collection of all test workflows
 */
export const testWorkflows = {
	empty: emptyWorkflow,
	simple: simpleWorkflow,
	complex: complexWorkflow,
	cyclic: cyclicWorkflow
};
