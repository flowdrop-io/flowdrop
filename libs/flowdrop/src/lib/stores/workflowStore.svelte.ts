/**
 * Workflow Store for FlowDrop (Svelte 5 Runes)
 *
 * Provides global state management for workflows with dirty state tracking
 * and undo/redo history integration.
 *
 * **Important: Single-instance only.** This store uses module-level singletons.
 * Only one FlowDrop editor instance per page is supported. Mounting multiple
 * FlowDrop editors on the same page will cause them to share workflow state.
 *
 * @module stores/workflowStore
 */

import type { Workflow, WorkflowNode, WorkflowEdge } from "$lib/types";
import { DEFAULT_WORKFLOW_FORMAT } from "$lib/types/index.js";
import type { WorkflowChangeType } from "$lib/types/events.js";
import { historyService } from "../services/historyService.js";

type WorkflowMetadata = NonNullable<Workflow["metadata"]>;

/**
 * Safely build updated workflow metadata, providing defaults for required fields.
 */
function buildMetadata(
  existing: Workflow["metadata"],
  updates?: Partial<WorkflowMetadata>,
): WorkflowMetadata {
  return {
    version: existing?.version ?? "1.0",
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    author: existing?.author,
    tags: existing?.tags,
    versionId: existing?.versionId,
    updateNumber: existing?.updateNumber,
    format: existing?.format,
    ...updates,
  };
}

// =========================================================================
// Core Workflow State (Svelte 5 Runes)
// =========================================================================

/** Global workflow state */
let workflowState = $state<Workflow | null>(null);

// =========================================================================
// Dirty State Tracking
// =========================================================================

/**
 * State for tracking if there are unsaved changes
 *
 * This is set to true whenever the workflow changes after initialization.
 * It can be reset to false by calling markAsSaved().
 */
let isDirtyState = $state<boolean>(false);

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
 * Flag to track if we're currently restoring from history (undo/redo)
 *
 * When true, prevents pushing to history to avoid recursive loops.
 */
let isRestoringFromHistory = false;

/**
 * Flag to track if history recording is enabled
 *
 * Can be disabled for bulk operations or when history is not needed.
 */
let historyEnabled = true;

// =========================================================================
// Getter Functions (Reactive State Access)
// =========================================================================

/**
 * Get the current workflow store value reactively
 *
 * @returns The current workflow or null
 */
export function getWorkflowStore(): Workflow | null {
  return workflowState;
}

/**
 * Get the current dirty state reactively
 *
 * @returns true if there are unsaved changes
 */
export function getIsDirty(): boolean {
  return isDirtyState;
}

/**
 * Get the workflow ID reactively
 *
 * @returns The workflow ID or null
 */
export function getWorkflowId(): string | null {
  return workflowState?.id ?? null;
}

/**
 * Get the workflow name reactively
 *
 * @returns The workflow name or 'Untitled Workflow'
 */
export function getWorkflowName(): string {
  return workflowState?.name ?? "Untitled Workflow";
}

/**
 * Get the workflow nodes reactively
 *
 * @returns Array of workflow nodes
 */
export function getWorkflowNodes(): WorkflowNode[] {
  return workflowState?.nodes ?? [];
}

/**
 * Get the workflow edges reactively
 *
 * @returns Array of workflow edges
 */
export function getWorkflowEdges(): WorkflowEdge[] {
  return workflowState?.edges ?? [];
}

/**
 * Get the workflow metadata reactively
 *
 * @returns The workflow metadata with defaults
 */
export function getWorkflowMetadata(): WorkflowMetadata {
  return (
    workflowState?.metadata ?? {
      version: "1.0.0",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      versionId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      updateNumber: 0,
    }
  );
}

/**
 * Get the current workflow format reactively
 *
 * @returns The workflow format string
 */
export function getWorkflowFormat(): string {
  return workflowState?.metadata?.format ?? DEFAULT_WORKFLOW_FORMAT;
}

/**
 * Get workflow change summary reactively (useful for triggering saves)
 *
 * @returns Object with nodes, edges, and name
 */
export function getWorkflowChanged(): {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  name: string;
} {
  return {
    nodes: getWorkflowNodes(),
    edges: getWorkflowEdges(),
    name: getWorkflowName(),
  };
}

/**
 * Get workflow validation state reactively
 *
 * @returns Validation info object
 */
export function getWorkflowValidation(): {
  hasNodes: boolean;
  hasEdges: boolean;
  nodeCount: number;
  edgeCount: number;
  isValid: boolean;
} {
  const nodes = getWorkflowNodes();
  const edges = getWorkflowEdges();
  return {
    hasNodes: nodes.length > 0,
    hasEdges: edges.length > 0,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    isValid: nodes.length > 0 && edges.length >= 0,
  };
}

/**
 * Get workflow metadata change summary reactively
 *
 * @returns Metadata change info
 */
export function getWorkflowMetadataChanged(): {
  createdAt: string;
  updatedAt: string;
  version: string;
} {
  const metadata = getWorkflowMetadata();
  return {
    createdAt: metadata.createdAt,
    updatedAt: metadata.updatedAt,
    version: metadata.version ?? "1.0.0",
  };
}

/**
 * Get connected handles reactively
 *
 * Provides a Set of all handle IDs that are currently connected to edges.
 * Used by node components to implement hideUnconnectedHandles functionality.
 *
 * @example
 * ```typescript
 * import { getConnectedHandles } from '$lib/stores/workflowStore.svelte.js';
 *
 * // Check if a specific handle is connected
 * const isConnected = getConnectedHandles().has('node-1-input-data');
 * ```
 */
export function getConnectedHandles(): Set<string> {
  const edges = getWorkflowEdges();
  const handles = new Set<string>();

  edges.forEach((edge) => {
    // Add source handle (output port)
    if (edge.sourceHandle) {
      handles.add(edge.sourceHandle);
    }
    // Add target handle (input port)
    if (edge.targetHandle) {
      handles.add(edge.targetHandle);
    }
  });

  return handles;
}

// =========================================================================
// Callback Setters
// =========================================================================

/**
 * Set the dirty state change callback
 *
 * @param callback - Function to call when dirty state changes
 */
export function setOnDirtyStateChange(
  callback: ((isDirty: boolean) => void) | null,
): void {
  onDirtyStateChangeCallback = callback;
}

/**
 * Set the workflow change callback
 *
 * @param callback - Function to call when workflow changes
 */
export function setOnWorkflowChange(
  callback:
    | ((workflow: Workflow, changeType: WorkflowChangeType) => void)
    | null,
): void {
  onWorkflowChangeCallback = callback;
}

// =========================================================================
// Internal Helpers
// =========================================================================

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
        config: n.data.config,
      },
    })),
    edges: workflow.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    })),
  };

  return JSON.stringify(toSnapshot);
}

/**
 * Update dirty state based on current workflow
 *
 * Compares current workflow with saved snapshot.
 */
function updateDirtyState(): void {
  const currentSnapshot = createSnapshot(workflowState);
  const newIsDirty = currentSnapshot !== savedSnapshot;

  if (newIsDirty !== isDirtyState) {
    isDirtyState = newIsDirty;
    if (onDirtyStateChangeCallback) {
      onDirtyStateChangeCallback(newIsDirty);
    }
  }
}

/**
 * Mark the workflow change and update dirty state
 *
 * @param changeType - The type of change that occurred
 */
function notifyWorkflowChange(changeType: WorkflowChangeType): void {
  if (workflowState && onWorkflowChangeCallback) {
    onWorkflowChangeCallback(workflowState, changeType);
  }
  updateDirtyState();
}

/**
 * Mark the current workflow state as saved
 *
 * Clears the dirty state by updating the saved snapshot.
 */
export function markAsSaved(): void {
  savedSnapshot = createSnapshot(workflowState);
  isDirtyState = false;
  if (onDirtyStateChangeCallback) {
    onDirtyStateChangeCallback(false);
  }
}

/**
 * Check if there are unsaved changes (non-reactive version for plain TS)
 *
 * @returns true if there are unsaved changes
 */
export function isDirty(): boolean {
  return isDirtyState;
}

/**
 * Enable or disable history recording
 *
 * Useful for bulk operations where you don't want individual history entries.
 *
 * @param enabled - Whether history should be recorded
 */
export function setHistoryEnabled(enabled: boolean): void {
  historyEnabled = enabled;
}

/**
 * Check if history recording is enabled
 *
 * @returns true if history is being recorded
 */
export function isHistoryEnabled(): boolean {
  return historyEnabled;
}

/**
 * Set the restoring from history flag
 *
 * Used internally by the history store when performing undo/redo.
 *
 * @param restoring - Whether we're currently restoring from history
 */
export function setRestoringFromHistory(restoring: boolean): void {
  isRestoringFromHistory = restoring;
}

/**
 * Push current state to history before making changes
 *
 * @param description - Description of the change about to be made
 * @param workflow - Optional workflow to push (uses store if not provided)
 */
function pushToHistory(description?: string, workflow?: Workflow): void {
  if (!historyEnabled || isRestoringFromHistory) {
    return;
  }

  const workflowToPush = workflow ?? workflowState;
  if (workflowToPush) {
    historyService.push(workflowToPush, { description });
  }
}

/**
 * Get the current workflow (non-reactive version for plain TS)
 *
 * @returns The current workflow or null
 */
export function getWorkflow(): Workflow | null {
  return workflowState;
}

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
  newEdges: WorkflowEdge[],
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
    if (JSON.stringify(currentNode.data) !== JSON.stringify(newNode.data))
      return true;
  }

  // Check if edges have changed
  if (currentWorkflow.edges.length !== newEdges.length) return true;

  for (let i = 0; i < newEdges.length; i++) {
    const currentEdge = currentWorkflow.edges[i];
    const newEdge = newEdges[i];

    if (!currentEdge || !newEdge) return true;
    if (currentEdge.id !== newEdge.id) return true;
    if (
      currentEdge.source !== newEdge.source ||
      currentEdge.target !== newEdge.target
    )
      return true;
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
   * This sets the initial saved snapshot, clears dirty state, and initializes history.
   */
  initialize: (workflow: Workflow) => {
    workflowState = workflow;
    // Set the saved snapshot - workflow is "clean" after initialization
    savedSnapshot = createSnapshot(workflow);
    isDirtyState = false;
    if (onDirtyStateChangeCallback) {
      onDirtyStateChangeCallback(false);
    }
    // Initialize history with the loaded workflow
    historyService.initialize(workflow);
  },

  /**
   * Update the entire workflow
   *
   * Note: This is typically called from SvelteFlow sync and should not push to history
   * for every small change. History is pushed by specific actions or drag handlers.
   */
  updateWorkflow: (workflow: Workflow) => {
    workflowState = workflow;
    notifyWorkflowChange("metadata");
  },

  /**
   * Restore workflow from history (undo/redo)
   *
   * This bypasses history recording to prevent recursive loops.
   */
  restoreFromHistory: (workflow: Workflow) => {
    isRestoringFromHistory = true;
    workflowState = workflow;
    notifyWorkflowChange("metadata");
    isRestoringFromHistory = false;
  },

  /**
   * Update nodes
   */
  updateNodes: (nodes: WorkflowNode[]) => {
    if (!workflowState) return;

    // Check if nodes have actually changed to prevent infinite loops
    if (!hasWorkflowDataChanged(workflowState, nodes, workflowState.edges)) {
      return;
    }

    // Generate unique version identifier
    const versionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    workflowState = {
      ...workflowState,
      nodes,
      metadata: buildMetadata(workflowState.metadata, {
        versionId,
        updateNumber: (workflowState.metadata?.updateNumber ?? 0) + 1,
      }),
    };
    notifyWorkflowChange("node_move");
  },

  /**
   * Update edges
   */
  updateEdges: (edges: WorkflowEdge[]) => {
    if (!workflowState) return;

    // Check if edges have actually changed to prevent infinite loops
    if (!hasWorkflowDataChanged(workflowState, workflowState.nodes, edges)) {
      return;
    }

    // Generate unique version identifier
    const versionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    workflowState = {
      ...workflowState,
      edges,
      metadata: buildMetadata(workflowState.metadata, {
        versionId,
        updateNumber: (workflowState.metadata?.updateNumber ?? 0) + 1,
      }),
    };
    notifyWorkflowChange("edge_add");
  },

  /**
   * Update workflow name
   */
  updateName: (name: string) => {
    if (!workflowState) return;
    workflowState = {
      ...workflowState,
      name,
      metadata: buildMetadata(workflowState.metadata),
    };
    notifyWorkflowChange("name");
  },

  /**
   * Add a node
   */
  addNode: (node: WorkflowNode) => {
    pushToHistory("Add node");
    if (!workflowState) return;
    workflowState = {
      ...workflowState,
      nodes: [...workflowState.nodes, node],
      metadata: buildMetadata(workflowState.metadata),
    };
    notifyWorkflowChange("node_add");
  },

  /**
   * Remove a node
   *
   * This is an atomic operation that also removes connected edges.
   * A single undo will restore both the node and its edges.
   */
  removeNode: (nodeId: string) => {
    pushToHistory("Delete node");
    if (!workflowState) return;
    workflowState = {
      ...workflowState,
      nodes: workflowState.nodes.filter((node) => node.id !== nodeId),
      edges: workflowState.edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId,
      ),
      metadata: buildMetadata(workflowState.metadata),
    };
    notifyWorkflowChange("node_remove");
  },

  /**
   * Add an edge
   */
  addEdge: (edge: WorkflowEdge) => {
    pushToHistory("Add connection");
    if (!workflowState) return;
    workflowState = {
      ...workflowState,
      edges: [...workflowState.edges, edge],
      metadata: buildMetadata(workflowState.metadata),
    };
    notifyWorkflowChange("edge_add");
  },

  /**
   * Remove an edge
   */
  removeEdge: (edgeId: string) => {
    pushToHistory("Delete connection");
    if (!workflowState) return;
    workflowState = {
      ...workflowState,
      edges: workflowState.edges.filter((edge) => edge.id !== edgeId),
      metadata: buildMetadata(workflowState.metadata),
    };
    notifyWorkflowChange("edge_remove");
  },

  /**
   * Update a specific node
   *
   * Used for config changes. Pushes to history for undo support.
   */
  updateNode: (nodeId: string, updates: Partial<WorkflowNode>) => {
    pushToHistory("Update node config");
    if (!workflowState) return;
    workflowState = {
      ...workflowState,
      nodes: workflowState.nodes.map((node) =>
        node.id === nodeId ? { ...node, ...updates } : node,
      ),
      metadata: buildMetadata(workflowState.metadata),
    };
    notifyWorkflowChange("node_config");
  },

  /**
   * Clear the workflow
   *
   * Resets the workflow and clears history.
   */
  clear: () => {
    workflowState = null;
    savedSnapshot = null;
    isDirtyState = false;
    historyService.clear();
    if (onDirtyStateChangeCallback) {
      onDirtyStateChangeCallback(false);
    }
  },

  /**
   * Update workflow metadata
   */
  updateMetadata: (metadata: Partial<Workflow["metadata"]>) => {
    if (!workflowState) return;
    workflowState = {
      ...workflowState,
      metadata: buildMetadata(workflowState.metadata, metadata),
    };
    notifyWorkflowChange("metadata");
  },

  /**
   * Batch update nodes and edges
   *
   * Useful for complex operations that update multiple things at once.
   * Creates a single history entry for the entire batch.
   */
  batchUpdate: (updates: {
    nodes?: WorkflowNode[];
    edges?: WorkflowEdge[];
    name?: string;
    description?: string;
    metadata?: Partial<Workflow["metadata"]>;
  }) => {
    pushToHistory("Batch update");
    if (!workflowState) return;
    workflowState = {
      ...workflowState,
      ...(updates.nodes && { nodes: updates.nodes }),
      ...(updates.edges && { edges: updates.edges }),
      ...(updates.name && { name: updates.name }),
      ...(updates.description !== undefined && {
        description: updates.description,
      }),
      metadata: buildMetadata(
        workflowState.metadata,
        updates.metadata ?? undefined,
      ),
    };
    notifyWorkflowChange("metadata");
  },

  /**
   * Swap a node — atomically replaces nodes and edges with a descriptive history entry.
   *
   * Unlike batchUpdate, this uses `"node_swap"` as the change type and
   * records a meaningful description for the undo history.
   */
  swapNode: (updates: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    description?: string;
  }) => {
    pushToHistory(updates.description ?? "Swap node");
    if (!workflowState) return;
    workflowState = {
      ...workflowState,
      nodes: updates.nodes,
      edges: updates.edges,
      metadata: buildMetadata(workflowState.metadata),
    };
    notifyWorkflowChange("node_swap");
  },

  /**
   * Push current state to history manually
   *
   * Use this before operations that modify the workflow through other means
   * (e.g., drag operations handled by SvelteFlow directly).
   *
   * @param description - Description of the upcoming change
   * @param workflow - Optional workflow to push (uses store state if not provided)
   */
  pushHistory: (description?: string, workflow?: Workflow) => {
    pushToHistory(description, workflow);
  },
};
