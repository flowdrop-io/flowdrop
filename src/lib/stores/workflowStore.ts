/**
 * Workflow Store for FlowDrop
 *
 * Provides global state management for workflows with dirty state tracking.
 *
 * @module stores/workflowStore
 */

import { writable, derived, get } from 'svelte/store';
import type { Workflow, WorkflowNode, WorkflowEdge } from '$lib/types';
import type { WorkflowChangeType } from '$lib/types/events.js';

// =========================================================================
// Core Workflow Store
// =========================================================================

/** Global workflow state */
export const workflowStore = writable<Workflow | null>(null);

// =========================================================================
// Dirty State Tracking
// =========================================================================

/**
 * Store for tracking if there are unsaved changes
 *
 * This is set to true whenever the workflow changes after initialization.
 * It can be reset to false by calling markAsSaved().
 */
export const isDirtyStore = writable<boolean>(false);

/**
 * Snapshot of the workflow when it was last saved
 *
 * Used to compare current state with saved state.
 */
let savedSnapshot: string | null = null;

/**
 * Callback for dirty state changes
 *
 * Set by the App component to notify parent application.
 */
let onDirtyStateChangeCallback: ((isDirty: boolean) => void) | null = null;

/**
 * Callback for workflow changes
 *
 * Set by the App component to notify parent application.
 */
let onWorkflowChangeCallback:
	| ((workflow: Workflow, changeType: WorkflowChangeType) => void)
	| null = null;

/**
 * Set the dirty state change callback
 *
 * @param callback - Function to call when dirty state changes
 */
export function setOnDirtyStateChange(callback: ((isDirty: boolean) => void) | null): void {
	onDirtyStateChangeCallback = callback;
}

/**
 * Set the workflow change callback
 *
 * @param callback - Function to call when workflow changes
 */
export function setOnWorkflowChange(
	callback: ((workflow: Workflow, changeType: WorkflowChangeType) => void) | null
): void {
	onWorkflowChangeCallback = callback;
}

/**
 * Create a snapshot of the workflow for comparison
 *
 * @param workflow - The workflow to snapshot
 * @returns A JSON string representation for comparison
 */
function createSnapshot(workflow: Workflow | null): string | null {
	if (!workflow) return null;

	// Only include the parts that matter for "dirty" detection
	const toSnapshot = {
		name: workflow.name,
		description: workflow.description,
		nodes: workflow.nodes.map((n) => ({
			id: n.id,
			position: n.position,
			data: {
				label: n.data.label,
				config: n.data.config
			}
		})),
		edges: workflow.edges.map((e) => ({
			id: e.id,
			source: e.source,
			target: e.target,
			sourceHandle: e.sourceHandle,
			targetHandle: e.targetHandle
		}))
	};

	return JSON.stringify(toSnapshot);
}

/**
 * Update dirty state based on current workflow
 *
 * Compares current workflow with saved snapshot.
 */
function updateDirtyState(): void {
	const currentWorkflow = get(workflowStore);
	const currentSnapshot = createSnapshot(currentWorkflow);
	const isDirty = currentSnapshot !== savedSnapshot;

	const previousDirty = get(isDirtyStore);
	if (isDirty !== previousDirty) {
		isDirtyStore.set(isDirty);
		if (onDirtyStateChangeCallback) {
			onDirtyStateChangeCallback(isDirty);
		}
	}
}

/**
 * Mark the workflow change and update dirty state
 *
 * @param changeType - The type of change that occurred
 */
function notifyWorkflowChange(changeType: WorkflowChangeType): void {
	const workflow = get(workflowStore);
	if (workflow && onWorkflowChangeCallback) {
		onWorkflowChangeCallback(workflow, changeType);
	}
	updateDirtyState();
}

/**
 * Mark the current workflow state as saved
 *
 * Clears the dirty state by updating the saved snapshot.
 */
export function markAsSaved(): void {
	const currentWorkflow = get(workflowStore);
	savedSnapshot = createSnapshot(currentWorkflow);
	isDirtyStore.set(false);
	if (onDirtyStateChangeCallback) {
		onDirtyStateChangeCallback(false);
	}
}

/**
 * Check if there are unsaved changes
 *
 * @returns true if there are unsaved changes
 */
export function isDirty(): boolean {
	return get(isDirtyStore);
}

/**
 * Get the current workflow
 *
 * @returns The current workflow or null
 */
export function getWorkflow(): Workflow | null {
	return get(workflowStore);
}

// =========================================================================
// Derived Stores
// =========================================================================

/** Derived store for workflow ID */
export const workflowId = derived(workflowStore, ($workflow) => $workflow?.id ?? null);

/** Derived store for workflow name */
export const workflowName = derived(
	workflowStore,
	($workflow) => $workflow?.name ?? 'Untitled Workflow'
);

/** Derived store for workflow nodes */
export const workflowNodes = derived(workflowStore, ($workflow) => $workflow?.nodes ?? []);

/** Derived store for workflow edges */
export const workflowEdges = derived(workflowStore, ($workflow) => $workflow?.edges ?? []);

/** Derived store for workflow metadata */
export const workflowMetadata = derived(
	workflowStore,
	($workflow) =>
		$workflow?.metadata ?? {
			version: '1.0.0',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			versionId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			updateNumber: 0
		}
);

// =========================================================================
// Helper Functions
// =========================================================================

/**
 * Check if workflow data has actually changed
 *
 * Used to prevent unnecessary updates and infinite loops.
 */
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

// =========================================================================
// Workflow Actions
// =========================================================================

/**
 * Actions for updating the workflow
 *
 * All actions that modify the workflow will trigger dirty state updates
 * and emit change events.
 */
export const workflowActions = {
	/**
	 * Initialize workflow (from load or new)
	 *
	 * This sets the initial saved snapshot and clears dirty state.
	 */
	initialize: (workflow: Workflow) => {
		workflowStore.set(workflow);
		// Set the saved snapshot - workflow is "clean" after initialization
		savedSnapshot = createSnapshot(workflow);
		isDirtyStore.set(false);
		if (onDirtyStateChangeCallback) {
			onDirtyStateChangeCallback(false);
		}
	},

	/**
	 * Update the entire workflow
	 */
	updateWorkflow: (workflow: Workflow) => {
		workflowStore.set(workflow);
		notifyWorkflowChange('metadata');
	},

	/**
	 * Update nodes
	 */
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
					updateNumber: ($workflow.metadata?.updateNumber ?? 0) + 1
				}
			};
		});
		notifyWorkflowChange('node_move');
	},

	/**
	 * Update edges
	 */
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
					updateNumber: ($workflow.metadata?.updateNumber ?? 0) + 1
				}
			};
		});
		notifyWorkflowChange('edge_add');
	},

	/**
	 * Update workflow name
	 */
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
		notifyWorkflowChange('name');
	},

	/**
	 * Add a node
	 */
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
		notifyWorkflowChange('node_add');
	},

	/**
	 * Remove a node
	 */
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
		notifyWorkflowChange('node_remove');
	},

	/**
	 * Add an edge
	 */
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
		notifyWorkflowChange('edge_add');
	},

	/**
	 * Remove an edge
	 */
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
		notifyWorkflowChange('edge_remove');
	},

	/**
	 * Update a specific node
	 */
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
		notifyWorkflowChange('node_config');
	},

	/**
	 * Clear the workflow
	 */
	clear: () => {
		workflowStore.set(null);
		savedSnapshot = null;
		isDirtyStore.set(false);
		if (onDirtyStateChangeCallback) {
			onDirtyStateChangeCallback(false);
		}
	},

	/**
	 * Update workflow metadata
	 */
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
		notifyWorkflowChange('metadata');
	},

	/**
	 * Batch update nodes and edges
	 *
	 * Useful for complex operations that update multiple things at once.
	 */
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
		notifyWorkflowChange('metadata');
	}
};

// =========================================================================
// Additional Derived Stores
// =========================================================================

/** Derived store for workflow changes (useful for triggering saves) */
export const workflowChanged = derived(
	[workflowNodes, workflowEdges, workflowName],
	([nodes, edges, name]) => ({ nodes, edges, name })
);

/** Derived store for workflow validation */
export const workflowValidation = derived([workflowNodes, workflowEdges], ([nodes, edges]) => ({
	hasNodes: nodes.length > 0,
	hasEdges: edges.length > 0,
	nodeCount: nodes.length,
	edgeCount: edges.length,
	isValid: nodes.length > 0 && edges.length >= 0
}));

/** Derived store for workflow metadata changes */
export const workflowMetadataChanged = derived(workflowMetadata, (metadata) => ({
	createdAt: metadata.createdAt,
	updatedAt: metadata.updatedAt,
	version: metadata.version ?? '1.0.0'
}));
