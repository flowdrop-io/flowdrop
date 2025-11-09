import { writable, derived } from 'svelte/store';
import type { Workflow, WorkflowNode, WorkflowEdge } from '$lib/types';

// Global workflow state
export const workflowStore = writable<Workflow | null>(null);

// Derived stores for individual workflow properties
export const workflowId = derived(workflowStore, ($workflow) => $workflow?.id || null);
export const workflowName = derived(
	workflowStore,
	($workflow) => $workflow?.name || 'Untitled Workflow'
);
export const workflowNodes = derived(workflowStore, ($workflow) => $workflow?.nodes || []);
export const workflowEdges = derived(workflowStore, ($workflow) => $workflow?.edges || []);
export const workflowMetadata = derived(
	workflowStore,
	($workflow) =>
		$workflow?.metadata || {
			version: '1.0.0',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			versionId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			updateNumber: 0
		}
);

// Helper function to check if workflow data has actually changed
function hasWorkflowDataChanged(
	currentWorkflow: Workflow | null,
	newNodes: WorkflowNode[],
	newEdges: WorkflowEdge[]
): boolean {
	if (!currentWorkflow) return true;

	// Check if nodes have changed
	if (currentWorkflow.nodes.length !== newNodes.length) return true;

	for (let i = 0; i < newNodes.length; i++) {
		const currentNode = currentWorkflow.nodes[i];
		const newNode = newNodes[i];

		if (!currentNode || !newNode) return true;
		if (currentNode.id !== newNode.id) return true;
		if (
			currentNode.position.x !== newNode.position.x ||
			currentNode.position.y !== newNode.position.y
		)
			return true;
		if (JSON.stringify(currentNode.data) !== JSON.stringify(newNode.data)) return true;
	}

	// Check if edges have changed
	if (currentWorkflow.edges.length !== newEdges.length) return true;

	for (let i = 0; i < newEdges.length; i++) {
		const currentEdge = currentWorkflow.edges[i];
		const newEdge = newEdges[i];

		if (!currentEdge || !newEdge) return true;
		if (currentEdge.id !== newEdge.id) return true;
		if (currentEdge.source !== newEdge.source || currentEdge.target !== newEdge.target) return true;
	}

	return false;
}

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
	updateNodes: (nodes: WorkflowNode[]) => {
		workflowStore.update(($workflow) => {
			if (!$workflow) return null;

			// Check if nodes have actually changed to prevent infinite loops
			if (!hasWorkflowDataChanged($workflow, nodes, $workflow.edges)) {
				return $workflow;
			}

			// Generate unique version identifier
			const versionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

			return {
				...$workflow,
				nodes,
				metadata: {
					...$workflow.metadata,
					updatedAt: new Date().toISOString(),
					versionId,
					updateNumber: ($workflow.metadata?.updateNumber || 0) + 1
				}
			};
		});
	},

	// Update edges
	updateEdges: (edges: WorkflowEdge[]) => {
		workflowStore.update(($workflow) => {
			if (!$workflow) return null;

			// Check if edges have actually changed to prevent infinite loops
			if (!hasWorkflowDataChanged($workflow, $workflow.nodes, edges)) {
				return $workflow;
			}

			// Generate unique version identifier
			const versionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

			return {
				...$workflow,
				edges,
				metadata: {
					...$workflow.metadata,
					updatedAt: new Date().toISOString(),
					versionId,
					updateNumber: ($workflow.metadata?.updateNumber || 0) + 1
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
	addNode: (node: WorkflowNode) => {
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
				nodes: $workflow.nodes.filter((node) => node.id !== nodeId),
				edges: $workflow.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
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
				edges: $workflow.edges.filter((edge) => edge.id !== edgeId),
				metadata: {
					...$workflow.metadata,
					updatedAt: new Date().toISOString()
				}
			};
		});
	},

	// Update a specific node
	updateNode: (nodeId: string, updates: Partial<WorkflowNode>) => {
		workflowStore.update(($workflow) => {
			if (!$workflow) return null;
			return {
				...$workflow,
				nodes: $workflow.nodes.map((node) => (node.id === nodeId ? { ...node, ...updates } : node)),
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
	},

	// Update workflow metadata
	updateMetadata: (metadata: Partial<Workflow['metadata']>) => {
		workflowStore.update(($workflow) => {
			if (!$workflow) return null;
			return {
				...$workflow,
				metadata: {
					...$workflow.metadata,
					...metadata,
					updatedAt: new Date().toISOString()
				}
			};
		});
	},

	// Batch update nodes and edges (useful for complex operations)
	batchUpdate: (updates: {
		nodes?: WorkflowNode[];
		edges?: WorkflowEdge[];
		name?: string;
		description?: string;
		metadata?: Partial<Workflow['metadata']>;
	}) => {
		workflowStore.update(($workflow) => {
			if (!$workflow) return null;
			return {
				...$workflow,
				...(updates.nodes && { nodes: updates.nodes }),
				...(updates.edges && { edges: updates.edges }),
				...(updates.name && { name: updates.name }),
				...(updates.description !== undefined && { description: updates.description }),
				metadata: {
					...$workflow.metadata,
					...(updates.metadata && { ...updates.metadata }),
					updatedAt: new Date().toISOString()
				}
			};
		});
	}
};

// Derived store for workflow changes (useful for triggering saves)
export const workflowChanged = derived(
	[workflowNodes, workflowEdges, workflowName],
	([nodes, edges, name]) => ({ nodes, edges, name })
);

// Derived store for workflow validation
export const workflowValidation = derived([workflowNodes, workflowEdges], ([nodes, edges]) => ({
	hasNodes: nodes.length > 0,
	hasEdges: edges.length > 0,
	nodeCount: nodes.length,
	edgeCount: edges.length,
	isValid: nodes.length > 0 && edges.length >= 0
}));

// Derived store for workflow metadata changes
export const workflowMetadataChanged = derived(workflowMetadata, (metadata) => ({
	createdAt: metadata.createdAt,
	updatedAt: metadata.updatedAt,
	version: metadata.version || '1.0.0'
}));
