/**
 * Unit Tests - Template Resolver Utility
 */

import { describe, it, expect } from 'vitest';
import {
	resolveVariablePath,
	resolveTemplate,
	buildNodeContext
} from '$lib/utils/templateResolver.js';
import { createTestNode } from '../../utils/index.js';

describe('templateResolver', () => {
	describe('resolveVariablePath', () => {
		it('should resolve top-level properties', () => {
			const context = {
				id: 'node-123',
				type: 'default',
				metadata: { id: 'llm-node', name: 'LLM' },
				config: {}
			};

			expect(resolveVariablePath(context, 'id')).toBe('node-123');
			expect(resolveVariablePath(context, 'type')).toBe('default');
		});

		it('should resolve nested properties with dot notation', () => {
			const context = {
				id: 'node-123',
				type: 'default',
				metadata: { id: 'llm-node', name: 'LLM Node' },
				config: { apiKey: 'secret-key' }
			};

			expect(resolveVariablePath(context, 'metadata.id')).toBe('llm-node');
			expect(resolveVariablePath(context, 'metadata.name')).toBe('LLM Node');
			expect(resolveVariablePath(context, 'config.apiKey')).toBe('secret-key');
		});

		it('should return undefined for non-existent paths', () => {
			const context = {
				id: 'node-123',
				type: 'default',
				metadata: { id: 'llm-node' },
				config: {}
			};

			expect(resolveVariablePath(context, 'nonexistent')).toBeUndefined();
			expect(resolveVariablePath(context, 'metadata.nonexistent')).toBeUndefined();
		});

		it('should handle null values in path', () => {
			const context = {
				id: 'node-123',
				type: 'default',
				metadata: null,
				config: {}
			};

			expect(resolveVariablePath(context, 'metadata.id')).toBeUndefined();
		});
	});

	describe('resolveTemplate', () => {
		it('should replace variables with mapped values', () => {
			const context = {
				id: 'node-123',
				type: 'default',
				metadata: { id: 'llm-node', name: 'LLM', description: 'test', category: 'ai', version: '1.0', inputs: [], outputs: [] },
				config: {}
			};
			const mapping = { nodeTypeId: 'metadata.id', instanceId: 'id' };

			const result = resolveTemplate(
				'/api/nodes/{nodeTypeId}/options/{instanceId}',
				mapping,
				context
			);

			expect(result).toBe('/api/nodes/llm-node/options/node-123');
		});

		it('should URL-encode values', () => {
			const context = {
				id: 'node with spaces',
				type: 'default',
				metadata: { id: 'special/chars', name: 'test', description: 'test', category: 'ai', version: '1.0', inputs: [], outputs: [] },
				config: {}
			};

			const result = resolveTemplate('/api/{id}', { id: 'id' }, context);

			expect(result).toBe('/api/node%20with%20spaces');
		});

		it('should resolve unmapped variables directly from context', () => {
			const context = {
				id: 'node-123',
				type: 'default',
				metadata: { id: 'llm-node', name: 'test', description: 'test', category: 'ai', version: '1.0', inputs: [], outputs: [] },
				config: {},
				workflowId: 'workflow-456'
			};

			const result = resolveTemplate('/api/{workflowId}/nodes', undefined, context);

			expect(result).toBe('/api/workflow-456/nodes');
		});

		it('should leave unresolved variables in place', () => {
			const context = {
				id: 'node-123',
				type: 'default',
				metadata: { id: 'llm-node', name: 'test', description: 'test', category: 'ai', version: '1.0', inputs: [], outputs: [] },
				config: {}
			};

			const result = resolveTemplate('/api/{unknown}/nodes', undefined, context);

			expect(result).toBe('/api/{unknown}/nodes');
		});
	});

	describe('buildNodeContext', () => {
		it('should build context from WorkflowNode', () => {
			const node = createTestNode({
				id: 'test-node-1',
				type: 'simple',
				data: {
					label: 'Test',
					config: { setting: 'value' },
					metadata: {
						id: 'test_node',
						name: 'Test Node',
						description: 'A test node',
						category: 'processing',
						version: '1.0.0',
						inputs: [],
						outputs: []
					}
				}
			});

			const context = buildNodeContext(node, 'workflow-123');

			expect(context.id).toBe('test-node-1');
			expect(context.type).toBe('simple');
			expect(context.metadata.id).toBe('test_node');
			expect(context.config.setting).toBe('value');
			expect(context.workflowId).toBe('workflow-123');
		});

		it('should work without workflowId', () => {
			const node = createTestNode({ id: 'node-1' });

			const context = buildNodeContext(node);

			expect(context.id).toBe('node-1');
			expect(context.workflowId).toBeUndefined();
		});
	});
});
