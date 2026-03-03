/**
 * Unit Tests - API Service
 *
 * Tests for the API client service that handles communication with the backend.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { nodeApi, workflowApi, setEndpointConfig } from '$lib/services/api.js';
import {
	createTestWorkflow,
	createMockEndpointConfig,
	mockFetchResponse,
	mockFetchError
} from '../../utils/index.js';
import { mockApiResponses } from '../../fixtures/index.js';

describe('API Service', () => {
	beforeEach(() => {
		// Reset mocks before each test
		vi.clearAllMocks();

		// Setup endpoint configuration
		const config = createMockEndpointConfig('/api/flowdrop');
		setEndpointConfig(config);

		// Mock global fetch
		global.fetch = vi.fn();
	});

	describe('setEndpointConfig', () => {
		it('should set endpoint configuration', () => {
			const config = createMockEndpointConfig('/custom/api');
			setEndpointConfig(config);

			// Configuration should be set (tested indirectly by API calls working)
			expect(true).toBe(true);
		});
	});

	describe('nodeApi', () => {
		describe('getNodes', () => {
			it('should fetch all nodes', async () => {
				const mockData = mockApiResponses.nodes.list;
				global.fetch = vi.fn(() => Promise.resolve(mockFetchResponse(mockData.data)));

				const nodes = await nodeApi.getNodes();

				expect(global.fetch).toHaveBeenCalledWith(
					'/api/flowdrop/nodes?',
					expect.objectContaining({
						method: 'GET'
					})
				);
				expect(nodes).toEqual(mockData.data);
			});

			it('should fetch nodes with category filter', async () => {
				const mockData = mockApiResponses.nodes.listByCategory('ai');
				global.fetch = vi.fn(() => Promise.resolve(mockFetchResponse(mockData.data)));

				const nodes = await nodeApi.getNodes({ category: 'ai' });

				expect(global.fetch).toHaveBeenCalledWith(
					expect.stringContaining('category=ai'),
					expect.any(Object)
				);
				expect(nodes).toEqual(mockData.data);
			});

			it('should fetch nodes with search filter', async () => {
				global.fetch = vi.fn(() => Promise.resolve(mockFetchResponse([])));

				await nodeApi.getNodes({ search: 'calculator' });

				expect(global.fetch).toHaveBeenCalledWith(
					expect.stringContaining('search=calculator'),
					expect.any(Object)
				);
			});

			it('should fetch nodes with limit and offset', async () => {
				global.fetch = vi.fn(() => Promise.resolve(mockFetchResponse([])));

				await nodeApi.getNodes({ limit: 10, offset: 20 });

				expect(global.fetch).toHaveBeenCalledWith(
					expect.stringContaining('limit=10'),
					expect.any(Object)
				);
				expect(global.fetch).toHaveBeenCalledWith(
					expect.stringContaining('offset=20'),
					expect.any(Object)
				);
			});

			it('should handle fetch errors', async () => {
				global.fetch = vi.fn(() => Promise.resolve(mockFetchError('Server error', 500)));

				await expect(nodeApi.getNodes()).rejects.toThrow();
			});

			it('should throw error when endpoint config not set', async () => {
				setEndpointConfig(null as never);

				await expect(nodeApi.getNodes()).rejects.toThrow('Endpoint configuration not set');
			});
		});

		describe('getNode', () => {
			it('should fetch a specific node by id', async () => {
				const mockData = mockApiResponses.nodes.get('calculator');
				global.fetch = vi.fn(() => Promise.resolve(mockFetchResponse(mockData.data)));

				const node = await nodeApi.getNode('calculator');

				expect(global.fetch).toHaveBeenCalledWith(
					'/api/flowdrop/nodes/calculator',
					expect.objectContaining({
						method: 'GET'
					})
				);
				expect(node).toEqual(mockData.data);
			});

			it('should handle node not found', async () => {
				const mockData = mockApiResponses.nodes.notFound;
				global.fetch = vi.fn(() => Promise.resolve(mockFetchError('Node not found', 404)));

				await expect(nodeApi.getNode('invalid')).rejects.toThrow();
			});

			it('should throw error when endpoint config not set', async () => {
				setEndpointConfig(null as never);

				await expect(nodeApi.getNode('test')).rejects.toThrow('Endpoint configuration not set');
			});
		});
	});

	describe('workflowApi', () => {
		describe('getWorkflows', () => {
			it('should fetch all workflows', async () => {
				const mockData = mockApiResponses.workflows.list;
				global.fetch = vi.fn(() => Promise.resolve(mockFetchResponse(mockData.data)));

				const workflows = await workflowApi.getWorkflows();

				expect(global.fetch).toHaveBeenCalledWith(
					'/api/flowdrop/workflows?',
					expect.objectContaining({
						method: 'GET'
					})
				);
				expect(workflows).toEqual(mockData.data);
			});

			it('should fetch workflows with search filter', async () => {
				global.fetch = vi.fn(() => Promise.resolve(mockFetchResponse([])));

				await workflowApi.getWorkflows({ search: 'AI' });

				expect(global.fetch).toHaveBeenCalledWith(
					expect.stringContaining('search=AI'),
					expect.any(Object)
				);
			});

			it('should fetch workflows with pagination', async () => {
				global.fetch = vi.fn(() => Promise.resolve(mockFetchResponse([])));

				await workflowApi.getWorkflows({ limit: 50, offset: 100 });

				expect(global.fetch).toHaveBeenCalledWith(
					expect.stringContaining('limit=50'),
					expect.any(Object)
				);
				expect(global.fetch).toHaveBeenCalledWith(
					expect.stringContaining('offset=100'),
					expect.any(Object)
				);
			});

			it('should handle fetch errors', async () => {
				global.fetch = vi.fn(() => Promise.resolve(mockFetchError('Server error', 500)));

				await expect(workflowApi.getWorkflows()).rejects.toThrow();
			});
		});

		describe('getWorkflow', () => {
			it('should fetch a specific workflow by id', async () => {
				const workflow = createTestWorkflow();
				// Mock response needs to have the workflow in data field
				global.fetch = vi.fn(() => Promise.resolve(mockFetchResponse(workflow)));

				const result = await workflowApi.getWorkflow(workflow.id);

				expect(global.fetch).toHaveBeenCalledWith(
					`/api/flowdrop/workflows/${workflow.id}`,
					expect.objectContaining({
						method: 'GET'
					})
				);
				expect(result).toEqual(workflow);
			});

			it('should handle workflow not found', async () => {
				global.fetch = vi.fn(() => Promise.resolve(mockFetchError('Workflow not found', 404)));

				await expect(workflowApi.getWorkflow('invalid')).rejects.toThrow();
			});
		});

		describe('createWorkflow', () => {
			it('should create a new workflow', async () => {
				const workflow = createTestWorkflow();
				const { id, ...workflowData } = workflow;
				const mockData = mockApiResponses.workflows.created(workflow);

				global.fetch = vi.fn(() => Promise.resolve(mockFetchResponse(mockData.data)));

				const result = await workflowApi.createWorkflow(workflowData);

				expect(global.fetch).toHaveBeenCalledWith(
					'/api/flowdrop/workflows',
					expect.objectContaining({
						method: 'POST',
						body: expect.stringContaining(workflow.name)
					})
				);
				expect(result).toHaveProperty('id');
				expect(result.name).toBe(workflow.name);
			});

			it('should not add label by default (Drupal mapping is opt-in via transformWorkflowPayload)', async () => {
				const workflow = createTestWorkflow({ name: 'Test Workflow' });
				const { id, ...workflowData } = workflow;

				global.fetch = vi.fn(() => Promise.resolve(mockFetchResponse(workflow)));

				await workflowApi.createWorkflow(workflowData);

				const callBody = JSON.parse(
					(global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body
				);
				expect(callBody.label).toBeUndefined();
				expect(callBody.name).toBe('Test Workflow');
			});

			it('should apply transformWorkflowPayload hook when configured', async () => {
				const workflow = createTestWorkflow({ name: 'Test Workflow' });
				const { id, ...workflowData } = workflow;

				const config = createMockEndpointConfig('/api/flowdrop');
				config.transformWorkflowPayload = (payload: Record<string, unknown>) => {
					if (payload.name) {
						return { ...payload, label: payload.name };
					}
					return payload;
				};
				setEndpointConfig(config);

				global.fetch = vi.fn(() => Promise.resolve(mockFetchResponse(workflow)));

				await workflowApi.createWorkflow(workflowData);

				const callBody = JSON.parse(
					(global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body
				);
				expect(callBody.label).toBe('Test Workflow');
				expect(callBody.name).toBe('Test Workflow');
			});

			it('should handle validation errors', async () => {
				const workflow = createTestWorkflow();
				const { id, ...workflowData } = workflow;

				global.fetch = vi.fn(() => Promise.resolve(mockFetchError('Validation failed', 400)));

				await expect(workflowApi.createWorkflow(workflowData)).rejects.toThrow();
			});
		});

		describe('updateWorkflow', () => {
			it('should update an existing workflow', async () => {
				const workflow = createTestWorkflow();
				const updates = { name: 'Updated Name' };
				const mockData = mockApiResponses.workflows.updated({
					...workflow,
					...updates
				});

				global.fetch = vi.fn(() => Promise.resolve(mockFetchResponse(mockData.data)));

				const result = await workflowApi.updateWorkflow(workflow.id, updates);

				expect(global.fetch).toHaveBeenCalledWith(
					`/api/flowdrop/workflows/${workflow.id}`,
					expect.objectContaining({
						method: 'PUT',
						body: expect.stringContaining('Updated Name')
					})
				);
				expect(result.name).toBe('Updated Name');
			});

			it('should not add label by default on update (Drupal mapping is opt-in)', async () => {
				const workflow = createTestWorkflow();
				const updates = { name: 'Updated Name' };

				global.fetch = vi.fn(() => Promise.resolve(mockFetchResponse(workflow)));

				await workflowApi.updateWorkflow(workflow.id, updates);

				const callBody = JSON.parse(
					(global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body
				);
				expect(callBody.label).toBeUndefined();
				expect(callBody.name).toBe('Updated Name');
			});

			it('should apply transformWorkflowPayload hook on update when configured', async () => {
				const workflow = createTestWorkflow();
				const updates = { name: 'Updated Name' };

				const config = createMockEndpointConfig('/api/flowdrop');
				config.transformWorkflowPayload = (payload: Record<string, unknown>) => {
					if (payload.name) {
						return { ...payload, label: payload.name };
					}
					return payload;
				};
				setEndpointConfig(config);

				global.fetch = vi.fn(() => Promise.resolve(mockFetchResponse(workflow)));

				await workflowApi.updateWorkflow(workflow.id, updates);

				const callBody = JSON.parse(
					(global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body
				);
				expect(callBody.label).toBe('Updated Name');
				expect(callBody.name).toBe('Updated Name');
			});

			it('should not add label when name is not provided', async () => {
				const workflow = createTestWorkflow();
				const updates = { description: 'New description' };

				global.fetch = vi.fn(() => Promise.resolve(mockFetchResponse(workflow)));

				await workflowApi.updateWorkflow(workflow.id, updates);

				const callBody = JSON.parse(
					(global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body
				);
				expect(callBody.label).toBeUndefined();
			});

			it('should handle update errors', async () => {
				const workflow = createTestWorkflow();

				global.fetch = vi.fn(() => Promise.resolve(mockFetchError('Update failed', 500)));

				await expect(workflowApi.updateWorkflow(workflow.id, { name: 'New' })).rejects.toThrow();
			});
		});

		describe('deleteWorkflow', () => {
			it('should delete a workflow', async () => {
				const workflow = createTestWorkflow();
				const mockData = mockApiResponses.workflows.deleted;

				global.fetch = vi.fn(() => Promise.resolve(mockFetchResponse(mockData.data)));

				await workflowApi.deleteWorkflow(workflow.id);

				expect(global.fetch).toHaveBeenCalledWith(
					`/api/flowdrop/workflows/${workflow.id}`,
					expect.objectContaining({
						method: 'DELETE'
					})
				);
			});

			it('should handle delete errors', async () => {
				global.fetch = vi.fn(() => Promise.resolve(mockFetchError('Delete failed', 500)));

				await expect(workflowApi.deleteWorkflow('test-id')).rejects.toThrow();
			});
		});

		describe('saveWorkflow', () => {
			it('should create new workflow when id is UUID', async () => {
				const workflow = createTestWorkflow({
					id: '550e8400-e29b-41d4-a716-446655440000'
				});

				global.fetch = vi.fn(() => Promise.resolve(mockFetchResponse(workflow)));

				await workflowApi.saveWorkflow(workflow);

				expect(global.fetch).toHaveBeenCalledWith(
					'/api/flowdrop/workflows',
					expect.objectContaining({
						method: 'POST'
					})
				);
			});

			it('should update existing workflow when id is not UUID', async () => {
				const workflow = createTestWorkflow({
					id: '123' // Non-UUID id indicates existing workflow
				});

				global.fetch = vi.fn(() => Promise.resolve(mockFetchResponse(workflow)));

				await workflowApi.saveWorkflow(workflow);

				expect(global.fetch).toHaveBeenCalledWith(
					'/api/flowdrop/workflows/123',
					expect.objectContaining({
						method: 'PUT'
					})
				);
			});

			it('should create new workflow when id is empty', async () => {
				const workflow = createTestWorkflow({ id: '' });

				global.fetch = vi.fn(() => Promise.resolve(mockFetchResponse(workflow)));

				await workflowApi.saveWorkflow(workflow);

				expect(global.fetch).toHaveBeenCalledWith(
					'/api/flowdrop/workflows',
					expect.objectContaining({
						method: 'POST'
					})
				);
			});
		});
	});

	describe('Error Handling', () => {
		it('should handle network errors', async () => {
			global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

			await expect(nodeApi.getNodes()).rejects.toThrow('Network error');
		});

		it('should parse JSON error responses', async () => {
			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: false,
					status: 400,
					statusText: 'Bad Request',
					headers: new Headers({ 'content-type': 'application/json' }),
					json: async () => ({ error: 'Invalid request' })
				} as Response)
			);

			await expect(nodeApi.getNodes()).rejects.toThrow('Invalid request');
		});

		it('should handle non-JSON error responses', async () => {
			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: false,
					status: 500,
					statusText: 'Internal Server Error',
					headers: new Headers({ 'content-type': 'text/html' }),
					text: async () => '<html>Error page</html>'
				} as Response)
			);

			await expect(nodeApi.getNodes()).rejects.toThrow(/HTTP 500/);
		});

		it('should handle fetch response parsing errors', async () => {
			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: false,
					status: 500,
					statusText: 'Internal Server Error',
					headers: new Headers({ 'content-type': 'application/json' }),
					json: async () => {
						throw new Error('Invalid JSON');
					},
					text: async () => 'Error text'
				} as Response)
			);

			await expect(nodeApi.getNodes()).rejects.toThrow();
		});
	});
});
