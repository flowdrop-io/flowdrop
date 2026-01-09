/**
 * Unit Tests - Workflow Storage Service
 *
 * Tests for in-memory workflow storage (CRUD operations).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
	saveWorkflow,
	updateWorkflow,
	getWorkflow,
	getWorkflows,
	deleteWorkflow,
	getWorkflowCount,
	initializeSampleWorkflows
} from '$lib/services/workflowStorage.js';
import { createTestWorkflow, createTestNode } from '../../utils/index.js';

describe('Workflow Storage Service', () => {
	beforeEach(async () => {
		// Clear all workflows before each test by deleting them
		const workflows = await getWorkflows();
		for (const workflow of workflows) {
			await deleteWorkflow(workflow.id);
		}
	});

	describe('saveWorkflow', () => {
		it('should save a new workflow', async () => {
			const { id: _id, ...workflowData } = createTestWorkflow();

			const saved = await saveWorkflow(workflowData);

			expect(saved).toHaveProperty('id');
			expect(saved.id).toBeTruthy();
			expect(saved.name).toBe(workflowData.name);
			expect(saved.nodes).toEqual(workflowData.nodes);
			expect(saved.edges).toEqual(workflowData.edges);
		});

		it('should generate unique ID for each workflow', async () => {
			const { id: _id1, ...workflow1 } = createTestWorkflow();
			const { id: _id2, ...workflow2 } = createTestWorkflow();

			const saved1 = await saveWorkflow(workflow1);
			const saved2 = await saveWorkflow(workflow2);

			expect(saved1.id).not.toBe(saved2.id);
		});

		it('should add metadata with timestamps', async () => {
			const { id: _id, ...workflowData } = createTestWorkflow();

			const saved = await saveWorkflow(workflowData);

			expect(saved.metadata).toBeDefined();
			expect(saved.metadata?.version).toBe('1.0.0');
			expect(saved.metadata?.createdAt).toBeDefined();
			expect(saved.metadata?.updatedAt).toBeDefined();
		});

		it('should preserve provided metadata', async () => {
			const { id: _id, ...workflowData } = createTestWorkflow({
				metadata: {
					version: '1.0.0',
					createdAt: '2024-01-01T00:00:00Z',
					updatedAt: '2024-01-01T00:00:00Z',
					author: 'Test Author',
					tags: ['test', 'sample']
				}
			});

			const saved = await saveWorkflow(workflowData);

			expect(saved.metadata?.author).toBe('Test Author');
			expect(saved.metadata?.tags).toEqual(['test', 'sample']);
		});

		it('should save workflow with nodes and edges', async () => {
			const node1 = createTestNode({ id: 'node-1' });
			const node2 = createTestNode({ id: 'node-2' });
			const { id: _id, ...workflowData } = createTestWorkflow({
				nodes: [node1, node2],
				edges: [
					{
						id: 'edge-1',
						source: 'node-1',
						target: 'node-2',
						sourceHandle: 'output',
						targetHandle: 'input'
					}
				]
			});

			const saved = await saveWorkflow(workflowData);

			expect(saved.nodes).toHaveLength(2);
			expect(saved.edges).toHaveLength(1);
		});
	});

	describe('updateWorkflow', () => {
		it('should update an existing workflow', async () => {
			const { id: _id, ...workflowData } = createTestWorkflow({ name: 'Original' });
			const saved = await saveWorkflow(workflowData);

			const updated = await updateWorkflow(saved.id, { name: 'Updated' });

			expect(updated).not.toBeNull();
			expect(updated?.name).toBe('Updated');
			expect(updated?.id).toBe(saved.id);
		});

		it('should return null for non-existent workflow', async () => {
			const updated = await updateWorkflow('non-existent', { name: 'Test' });
			expect(updated).toBeNull();
		});

		it('should preserve workflow ID', async () => {
			const { id: _id, ...workflowData } = createTestWorkflow();
			const saved = await saveWorkflow(workflowData);

			const updated = await updateWorkflow(saved.id, {
				id: 'different-id',
				name: 'Updated'
			} as never);

			expect(updated?.id).toBe(saved.id);
			expect(updated?.id).not.toBe('different-id');
		});

		it('should update timestamp on update', async () => {
			const { id: _id, ...workflowData } = createTestWorkflow();
			const saved = await saveWorkflow(workflowData);
			const originalUpdatedAt = saved.metadata?.updatedAt;

			// Small delay to ensure timestamp changes
			await new Promise((resolve) => setTimeout(resolve, 10));

			const updated = await updateWorkflow(saved.id, { name: 'Updated' });

			expect(updated?.metadata?.updatedAt).not.toBe(originalUpdatedAt);
		});

		it('should preserve createdAt timestamp', async () => {
			const { id: _id, ...workflowData } = createTestWorkflow();
			const saved = await saveWorkflow(workflowData);
			const originalCreatedAt = saved.metadata?.createdAt;

			const updated = await updateWorkflow(saved.id, { name: 'Updated' });

			expect(updated?.metadata?.createdAt).toBe(originalCreatedAt);
		});

		it('should update nodes and edges', async () => {
			const { id: _id, ...workflowData } = createTestWorkflow();
			const saved = await saveWorkflow(workflowData);

			const newNode = createTestNode({ id: 'new-node' });
			const updated = await updateWorkflow(saved.id, {
				nodes: [newNode]
			});

			expect(updated?.nodes).toHaveLength(1);
			expect(updated?.nodes[0].id).toBe('new-node');
		});

		it('should preserve metadata fields not being updated', async () => {
			const { id: _id, ...workflowData } = createTestWorkflow({
				metadata: {
					version: '1.0.0',
					createdAt: '2024-01-01T00:00:00Z',
					updatedAt: '2024-01-01T00:00:00Z',
					author: 'Original Author',
					tags: ['original']
				}
			});
			const saved = await saveWorkflow(workflowData);

			const updated = await updateWorkflow(saved.id, { name: 'Updated' });

			expect(updated?.metadata?.author).toBe('Original Author');
			expect(updated?.metadata?.tags).toEqual(['original']);
		});
	});

	describe('getWorkflow', () => {
		it('should retrieve a workflow by ID', async () => {
			const { id: _id, ...workflowData } = createTestWorkflow();
			const saved = await saveWorkflow(workflowData);

			const retrieved = await getWorkflow(saved.id);

			expect(retrieved).not.toBeNull();
			expect(retrieved?.id).toBe(saved.id);
			expect(retrieved?.name).toBe(saved.name);
		});

		it('should return null for non-existent workflow', async () => {
			const retrieved = await getWorkflow('non-existent');
			expect(retrieved).toBeNull();
		});

		it('should retrieve complete workflow data', async () => {
			const node = createTestNode();
			const { id: _id, ...workflowData } = createTestWorkflow({
				nodes: [node],
				edges: []
			});
			const saved = await saveWorkflow(workflowData);

			const retrieved = await getWorkflow(saved.id);

			expect(retrieved?.nodes).toHaveLength(1);
			expect(retrieved?.nodes[0]).toEqual(node);
		});
	});

	describe('getWorkflows', () => {
		it('should retrieve all workflows', async () => {
			const { id: _id1, ...workflow1 } = createTestWorkflow();
			const { id: _id2, ...workflow2 } = createTestWorkflow();

			await saveWorkflow(workflow1);
			await saveWorkflow(workflow2);

			const workflows = await getWorkflows();

			expect(workflows).toHaveLength(2);
		});

		it('should return empty array when no workflows exist', async () => {
			const workflows = await getWorkflows();
			expect(workflows).toEqual([]);
		});

		it('should filter workflows by search term (name)', async () => {
			const { id: _id1, ...workflow1 } = createTestWorkflow({ name: 'Chat Workflow' });
			const { id: _id2, ...workflow2 } = createTestWorkflow({ name: 'Image Processor' });

			await saveWorkflow(workflow1);
			await saveWorkflow(workflow2);

			const workflows = await getWorkflows({ search: 'chat' });

			expect(workflows).toHaveLength(1);
			expect(workflows[0].name).toBe('Chat Workflow');
		});

		it('should filter workflows by search term (description)', async () => {
			const { id: _id1, ...workflow1 } = createTestWorkflow({
				description: 'Process chat messages'
			});
			const { id: _id2, ...workflow2 } = createTestWorkflow({
				description: 'Generate images'
			});

			await saveWorkflow(workflow1);
			await saveWorkflow(workflow2);

			const workflows = await getWorkflows({ search: 'chat' });

			expect(workflows).toHaveLength(1);
		});

		it('should filter workflows by search term (tags)', async () => {
			const { id: _id1, ...workflow1 } = createTestWorkflow({
				metadata: {
					version: '1.0.0',
					createdAt: '2024-01-01T00:00:00Z',
					updatedAt: '2024-01-01T00:00:00Z',
					tags: ['ai', 'chat']
				}
			});
			const { id: _id2, ...workflow2 } = createTestWorkflow({
				metadata: {
					version: '1.0.0',
					createdAt: '2024-01-01T00:00:00Z',
					updatedAt: '2024-01-01T00:00:00Z',
					tags: ['image', 'processing']
				}
			});

			await saveWorkflow(workflow1);
			await saveWorkflow(workflow2);

			const workflows = await getWorkflows({ search: 'chat' });

			expect(workflows).toHaveLength(1);
			expect(workflows[0].metadata?.tags).toContain('chat');
		});

		it('should apply limit to results', async () => {
			for (let i = 0; i < 5; i++) {
				const { id: _id, ...workflow } = createTestWorkflow();
				await saveWorkflow(workflow);
			}

			const workflows = await getWorkflows({ limit: 3 });

			expect(workflows).toHaveLength(3);
		});

		it('should apply offset to results', async () => {
			const ids: string[] = [];
			for (let i = 0; i < 5; i++) {
				const { id: _id, ...workflow } = createTestWorkflow();
				const saved = await saveWorkflow(workflow);
				ids.push(saved.id);
			}

			const workflows = await getWorkflows({ offset: 2, limit: 2 });

			expect(workflows).toHaveLength(2);
		});

		it('should sort workflows by updated date (newest first)', async () => {
			const { id: _id1, ...workflow1 } = createTestWorkflow();
			const saved1 = await saveWorkflow(workflow1);

			await new Promise((resolve) => setTimeout(resolve, 10));

			const { id: _id2, ...workflow2 } = createTestWorkflow();
			const saved2 = await saveWorkflow(workflow2);

			const workflows = await getWorkflows();

			expect(workflows[0].id).toBe(saved2.id); // Newest first
			expect(workflows[1].id).toBe(saved1.id);
		});

		it('should handle pagination with search', async () => {
			for (let i = 0; i < 5; i++) {
				const { id: _id, ...workflow } = createTestWorkflow({
					name: `Test Workflow ${i}`
				});
				await saveWorkflow(workflow);
			}

			const workflows = await getWorkflows({
				search: 'test',
				limit: 2,
				offset: 1
			});

			expect(workflows).toHaveLength(2);
		});
	});

	describe('deleteWorkflow', () => {
		it('should delete an existing workflow', async () => {
			const { id: _id, ...workflowData } = createTestWorkflow();
			const saved = await saveWorkflow(workflowData);

			const deleted = await deleteWorkflow(saved.id);

			expect(deleted).toBe(true);

			const retrieved = await getWorkflow(saved.id);
			expect(retrieved).toBeNull();
		});

		it('should return false for non-existent workflow', async () => {
			const deleted = await deleteWorkflow('non-existent');
			expect(deleted).toBe(false);
		});

		it('should not affect other workflows', async () => {
			const { id: _id1, ...workflow1 } = createTestWorkflow();
			const { id: _id2, ...workflow2 } = createTestWorkflow();

			const saved1 = await saveWorkflow(workflow1);
			const saved2 = await saveWorkflow(workflow2);

			await deleteWorkflow(saved1.id);

			const remaining = await getWorkflows();
			expect(remaining).toHaveLength(1);
			expect(remaining[0].id).toBe(saved2.id);
		});
	});

	describe('getWorkflowCount', () => {
		it('should return 0 when no workflows exist', async () => {
			const count = await getWorkflowCount();
			expect(count).toBe(0);
		});

		it('should return correct count of workflows', async () => {
			for (let i = 0; i < 3; i++) {
				const { id: _id, ...workflow } = createTestWorkflow();
				await saveWorkflow(workflow);
			}

			const count = await getWorkflowCount();
			expect(count).toBe(3);
		});

		it('should update count after deletion', async () => {
			const { id: _id, ...workflowData } = createTestWorkflow();
			const saved = await saveWorkflow(workflowData);

			let count = await getWorkflowCount();
			expect(count).toBe(1);

			await deleteWorkflow(saved.id);

			count = await getWorkflowCount();
			expect(count).toBe(0);
		});
	});

	describe('initializeSampleWorkflows', () => {
		it('should create sample workflow when none exist', async () => {
			await initializeSampleWorkflows();

			const count = await getWorkflowCount();
			expect(count).toBe(1);

			const workflows = await getWorkflows();
			expect(workflows[0].name).toBe('Sample Chat Workflow');
		});

		it('should not create samples if workflows already exist', async () => {
			const { id: _id, ...workflowData } = createTestWorkflow();
			await saveWorkflow(workflowData);

			await initializeSampleWorkflows();

			const count = await getWorkflowCount();
			expect(count).toBe(1); // Only the one we created
		});

		it('should create workflow with metadata', async () => {
			await initializeSampleWorkflows();

			const workflows = await getWorkflows();
			const sample = workflows[0];

			expect(sample.metadata).toBeDefined();
			expect(sample.metadata?.author).toBe('System');
			expect(sample.metadata?.tags).toContain('sample');
		});
	});
});
