import { writable, derived } from 'svelte/store';
import type { Workflow, WorkflowNodeType, WorkflowEdge } from '$lib/types';

// Global workflow state
export const workflowStore = writable<Workflow | null>(null);

// Derived stores for individual workflow properties
export const workflowId = derived(workflowStore, ($workflow) => $workflow?.id || null);
export const workflowName = derived(workflowStore, ($workflow) => $workflow?.name || 'Untitled Workflow');
export const workflowNodes = derived(workflowStore, ($workflow) => $workflow?.nodes || []);
export const workflowEdges = derived(workflowStore, ($workflow) => $workflow?.edges || []);
export const workflowMetadata = derived(workflowStore, ($workflow) => $workflow?.metadata || {
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString()
});

// Actions for updating the workflow
export const workflowActions = {
	// Initialize workflow
	initialize: (workflow: Workflow) => {
		workflowStore.set(workflow);
	},

	// Update the entire workflow
	updateWorkflow: (workflow: Workflow) => {
		workflowStore.set(workflow);
	},

	// Update nodes
	updateNodes: (nodes: WorkflowNodeType[]) => {
		workflowStore.update(($workflow) => {
			if (!$workflow) return null;
			return {
				...$workflow,
				nodes,
				metadata: {
					...$workflow.metadata,
					updatedAt: new Date().toISOString()
				}
			};
		});
	},

	// Update edges
	updateEdges: (edges: WorkflowEdge[]) => {
		workflowStore.update(($workflow) => {
			if (!$workflow) return null;
			return {
				...$workflow,
				edges,
				metadata: {
					...$workflow.metadata,
					updatedAt: new Date().toISOString()
				}
			};
		});
	},

	// Update workflow name
	updateName: (name: string) => {
		workflowStore.update(($workflow) => {
			if (!$workflow) return null;
			return {
				...$workflow,
				name,
				metadata: {
					...$workflow.metadata,
					updatedAt: new Date().toISOString()
				}
			};
		});
	},

	// Add a node
	addNode: (node: WorkflowNodeType) => {
		workflowStore.update(($workflow) => {
			if (!$workflow) return null;
			return {
				...$workflow,
				nodes: [...$workflow.nodes, node],
				metadata: {
					...$workflow.metadata,
					updatedAt: new Date().toISOString()
				}
			};
		});
	},

	// Remove a node
	removeNode: (nodeId: string) => {
		workflowStore.update(($workflow) => {
			if (!$workflow) return null;
			return {
				...$workflow,
				nodes: $workflow.nodes.filter(node => node.id !== nodeId),
				edges: $workflow.edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId),
				metadata: {
					...$workflow.metadata,
					updatedAt: new Date().toISOString()
				}
			};
		});
	},

	// Add an edge
	addEdge: (edge: WorkflowEdge) => {
		workflowStore.update(($workflow) => {
			if (!$workflow) return null;
			return {
				...$workflow,
				edges: [...$workflow.edges, edge],
				metadata: {
					...$workflow.metadata,
					updatedAt: new Date().toISOString()
				}
			};
		});
	},

	// Remove an edge
	removeEdge: (edgeId: string) => {
		workflowStore.update(($workflow) => {
			if (!$workflow) return null;
			return {
				...$workflow,
				edges: $workflow.edges.filter(edge => edge.id !== edgeId),
				metadata: {
					...$workflow.metadata,
					updatedAt: new Date().toISOString()
				}
			};
		});
	},

	// Update a specific node
	updateNode: (nodeId: string, updates: Partial<WorkflowNodeType>) => {
		workflowStore.update(($workflow) => {
			if (!$workflow) return null;
			return {
				...$workflow,
				nodes: $workflow.nodes.map(node => 
					node.id === nodeId ? { ...node, ...updates } : node
				),
				metadata: {
					...$workflow.metadata,
					updatedAt: new Date().toISOString()
				}
			};
		});
	},

	// Clear the workflow
	clear: () => {
		workflowStore.set(null);
	}
};

// Derived store for workflow changes (useful for triggering saves)
export const workflowChanged = derived(
	[workflowNodes, workflowEdges, workflowName],
	([nodes, edges, name]) => ({ nodes, edges, name }),
	({ nodes, edges, name }) => ({ nodes, edges, name })
);
