/**
 * Workflow Store for FlowDrop (Svelte 5 Runes)
 *
 * Provides per-instance state management for workflows with dirty state
 * tracking and undo/redo history integration.
 *
 * The reactive state lives in the {@link WorkflowStore} class — one per
 * FlowDrop instance, created by `createFlowDropInstance()` and resolved in
 * components via `getInstance().workflow`. The module-level functions at the
 * bottom of this file are backward-compatible shims that delegate to the
 * page-default instance, so legacy single-instance imports keep working.
 *
 * @module stores/workflowStore
 */

import type { Workflow, WorkflowNode, WorkflowEdge } from '$lib/types';
import { DEFAULT_WORKFLOW_FORMAT } from '$lib/types/index.js';
import type { WorkflowChangeType } from '$lib/types/events.js';
import type { HistoryService } from '../services/historyService.js';
import { getDefaultInstance } from './instanceContainer.svelte.js';

type WorkflowMetadata = NonNullable<Workflow['metadata']>;

/**
 * Safely build updated workflow metadata, providing defaults for required fields.
 */
function buildMetadata(
  existing: Workflow['metadata'],
  updates?: Partial<WorkflowMetadata>
): WorkflowMetadata {
  return {
    version: existing?.version ?? '1.0',
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    author: existing?.author,
    tags: existing?.tags,
    versionId: existing?.versionId,
    updateNumber: existing?.updateNumber,
    format: existing?.format,
    ...updates
  };
}

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
    if (currentNode.data !== newNode.data) return true;
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

/**
 * Heal nodes that are missing `data.nodeId`.
 *
 * Node components derive their handle IDs from `data.nodeId` — a node without
 * it renders with zero handles and SvelteFlow silently drops every edge
 * anchored to it, making an intact graph look corrupted on the canvas.
 * `data.nodeId` always equals the node's own `id`, so it is safe to restore.
 */
function healMissingNodeIds(workflow: Workflow): Workflow {
  if (!workflow.nodes?.some((node) => !node.data.nodeId)) {
    return workflow;
  }

  return {
    ...workflow,
    nodes: workflow.nodes.map((node) =>
      node.data.nodeId ? node : { ...node, data: { ...node.data, nodeId: node.id } }
    )
  };
}

/**
 * Mutation actions for a {@link WorkflowStore}.
 *
 * Bound facade — safe to detach (`onclick={fd.workflow.actions.undo}`)
 * because every entry is bound to its store in the constructor.
 */
export interface WorkflowStoreActions {
  initialize: (workflow: Workflow) => void;
  updateWorkflow: (workflow: Workflow) => void;
  restoreFromHistory: (workflow: Workflow) => void;
  updateNodes: (nodes: WorkflowNode[]) => void;
  updateEdges: (edges: WorkflowEdge[]) => void;
  updateName: (name: string) => void;
  addNode: (node: WorkflowNode) => void;
  removeNode: (nodeId: string) => void;
  addEdge: (edge: WorkflowEdge) => void;
  removeEdge: (edgeId: string) => void;
  updateNode: (nodeId: string, updates: Partial<WorkflowNode>) => void;
  clear: () => void;
  updateMetadata: (metadata: Partial<Workflow['metadata']>) => void;
  batchUpdate: (updates: {
    nodes?: WorkflowNode[];
    edges?: WorkflowEdge[];
    name?: string;
    description?: string;
    metadata?: Partial<Workflow['metadata']>;
    config?: Record<string, unknown>;
  }) => void;
  swapNode: (updates: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    description?: string;
  }) => void;
  pushHistory: (description?: string, workflow?: Workflow) => void;
}

// =========================================================================
// WorkflowStore (per-instance reactive state)
// =========================================================================

/**
 * Per-instance workflow state with dirty tracking and history integration.
 *
 * All reads go through getters backed by `$state`, so reading them inside a
 * component template or `$derived` tracks reactively, exactly like the
 * legacy module-level functions did.
 */
export class WorkflowStore {
  /** Current workflow */
  #workflow = $state<Workflow | null>(null);

  /**
   * Monotonic edit version — bumps on every mutation action.
   *
   * Used for two purposes:
   * 1. O(1) dirty detection: isDirty = #editVersion !== #savedVersion
   * 2. Save verification protocol: include the version in the save request,
   *    backend echoes it back. If the echoed version doesn't match, the save
   *    didn't persist the version the client submitted.
   */
  #editVersion = $state<number>(0);

  /**
   * Edit version captured at the last successful save.
   * When #editVersion === #savedVersion, the workflow is clean.
   */
  #savedVersion = $state<number>(0);

  /** Callback for dirty state changes — set by the App component. */
  #onDirtyStateChange: ((isDirty: boolean) => void) | null = null;

  /** Callback for workflow changes — set by the App component. */
  #onWorkflowChange: ((workflow: Workflow, changeType: WorkflowChangeType) => void) | null = null;

  /**
   * Whether we're currently restoring from history (undo/redo).
   * When true, prevents pushing to history to avoid recursive loops.
   */
  #restoringFromHistory = false;

  /** Whether history recording is enabled (disable for bulk operations). */
  #historyEnabled = true;

  /** Undo/redo engine for this instance (constructor-injected). */
  readonly #history: HistoryService;

  /** Bound mutation facade — see {@link WorkflowStoreActions}. */
  readonly actions: WorkflowStoreActions;

  constructor(history: HistoryService) {
    this.#history = history;
    this.actions = Object.freeze({
      initialize: this.initialize.bind(this),
      updateWorkflow: this.updateWorkflow.bind(this),
      restoreFromHistory: this.restoreFromHistory.bind(this),
      updateNodes: this.updateNodes.bind(this),
      updateEdges: this.updateEdges.bind(this),
      updateName: this.updateName.bind(this),
      addNode: this.addNode.bind(this),
      removeNode: this.removeNode.bind(this),
      addEdge: this.addEdge.bind(this),
      removeEdge: this.removeEdge.bind(this),
      updateNode: this.updateNode.bind(this),
      clear: this.clear.bind(this),
      updateMetadata: this.updateMetadata.bind(this),
      batchUpdate: this.batchUpdate.bind(this),
      swapNode: this.swapNode.bind(this),
      pushHistory: this.pushHistory.bind(this)
    });
  }

  // -----------------------------------------------------------------------
  // Reactive getters
  // -----------------------------------------------------------------------

  /** The current workflow, or null when none is loaded. */
  get current(): Workflow | null {
    return this.#workflow;
  }

  /**
   * Whether there are unsaved changes.
   *
   * Reads both #editVersion and #savedVersion, so Svelte tracks them as
   * reactive dependencies — any component using this re-renders when dirty
   * state changes.
   */
  get isDirty(): boolean {
    return this.#editVersion !== this.#savedVersion;
  }

  /** The workflow ID, or null. */
  get id(): string | null {
    return this.#workflow?.id ?? null;
  }

  /** The workflow name, or 'Untitled Workflow'. */
  get name(): string {
    return this.#workflow?.name ?? 'Untitled Workflow';
  }

  /** The workflow nodes. */
  get nodes(): WorkflowNode[] {
    return this.#workflow?.nodes ?? [];
  }

  /** The workflow edges. */
  get edges(): WorkflowEdge[] {
    return this.#workflow?.edges ?? [];
  }

  /** The workflow metadata, with defaults. */
  get metadata(): WorkflowMetadata {
    return (
      this.#workflow?.metadata ?? {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        versionId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        updateNumber: 0
      }
    );
  }

  /** The workflow format string. */
  get format(): string {
    return this.#workflow?.metadata?.format ?? DEFAULT_WORKFLOW_FORMAT;
  }

  /** Workflow change summary (useful for triggering saves). */
  get changeSummary(): { nodes: WorkflowNode[]; edges: WorkflowEdge[]; name: string } {
    return {
      nodes: this.nodes,
      edges: this.edges,
      name: this.name
    };
  }

  /** Workflow validation state. */
  get validation(): {
    hasNodes: boolean;
    hasEdges: boolean;
    nodeCount: number;
    edgeCount: number;
    isValid: boolean;
  } {
    const nodes = this.nodes;
    const edges = this.edges;
    return {
      hasNodes: nodes.length > 0,
      hasEdges: edges.length > 0,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      isValid: nodes.length > 0 && edges.length >= 0
    };
  }

  /** Workflow metadata change summary. */
  get metadataChangeSummary(): { createdAt: string; updatedAt: string; version: string } {
    const metadata = this.metadata;
    return {
      createdAt: metadata.createdAt,
      updatedAt: metadata.updatedAt,
      version: metadata.version ?? '1.0.0'
    };
  }

  /**
   * Set of all handle IDs currently connected to edges.
   *
   * Used by node components to implement hideUnconnectedHandles.
   */
  get connectedHandles(): Set<string> {
    const handles = new Set<string>();

    this.edges.forEach((edge) => {
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

  /**
   * The current monotonic edit version.
   *
   * Use this for the save verification protocol:
   * 1. Before save: `const v = store.editVersion`
   * 2. Include `v` in the save request payload
   * 3. Backend echoes `v` in the response
   * 4. If echoed version matches: `store.markAsSaved()`
   * 5. If not: the save didn't persist the version you submitted — reset from backend response
   */
  get editVersion(): number {
    return this.#editVersion;
  }

  /** Whether history recording is enabled. */
  get historyEnabled(): boolean {
    return this.#historyEnabled;
  }

  /** Enable or disable history recording (e.g. for bulk operations). */
  set historyEnabled(enabled: boolean) {
    this.#historyEnabled = enabled;
  }

  // -----------------------------------------------------------------------
  // Callback setters & save protocol
  // -----------------------------------------------------------------------

  /** Set the dirty state change callback. */
  setOnDirtyStateChange(callback: ((isDirty: boolean) => void) | null): void {
    this.#onDirtyStateChange = callback;
  }

  /** Set the workflow change callback. */
  setOnWorkflowChange(
    callback: ((workflow: Workflow, changeType: WorkflowChangeType) => void) | null
  ): void {
    this.#onWorkflowChange = callback;
  }

  /**
   * Mark the current workflow state as saved.
   *
   * Captures the current edit version so isDirty becomes false.
   * Call this after a successful backend save.
   */
  markAsSaved(): void {
    const wasDirty = this.#editVersion !== this.#savedVersion;
    this.#savedVersion = this.#editVersion;
    if (wasDirty && this.#onDirtyStateChange) {
      this.#onDirtyStateChange(false);
    }
  }

  /**
   * Set the restoring from history flag.
   *
   * Used internally by the history store when performing undo/redo.
   */
  setRestoringFromHistory(restoring: boolean): void {
    this.#restoringFromHistory = restoring;
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  /**
   * Bump the edit version and notify dirty state change if needed.
   * Called by every mutation action.
   */
  #bumpVersion(): void {
    this.#editVersion++;
    // Dirty state just flipped from clean → dirty
    if (this.#editVersion - 1 === this.#savedVersion) {
      if (this.#onDirtyStateChange) {
        this.#onDirtyStateChange(true);
      }
    }
  }

  /**
   * Notify external listeners of a workflow change.
   * Does NOT bump the version — callers that mutate must call #bumpVersion() explicitly.
   */
  #notifyWorkflowChange(changeType: WorkflowChangeType): void {
    if (this.#workflow && this.#onWorkflowChange) {
      this.#onWorkflowChange(this.#workflow, changeType);
    }
  }

  /**
   * Push current state to history before making changes.
   *
   * @param description - Description of the change about to be made
   * @param workflow - Optional workflow to push (uses store state if not provided)
   */
  #pushToHistory(description?: string, workflow?: Workflow): void {
    if (!this.#historyEnabled || this.#restoringFromHistory) {
      return;
    }

    const workflowToPush = workflow ?? this.#workflow;
    if (workflowToPush) {
      this.#history.push(workflowToPush, { description });
    }
  }

  // -----------------------------------------------------------------------
  // Mutation actions
  // -----------------------------------------------------------------------

  /**
   * Initialize workflow (from load or new).
   *
   * This sets the initial saved snapshot, clears dirty state, and initializes history.
   */
  initialize(workflow: Workflow): void {
    workflow = healMissingNodeIds(workflow);
    this.#workflow = workflow;
    // Reset version counters — workflow is "clean" after initialization
    this.#editVersion = 0;
    this.#savedVersion = 0;
    if (this.#onDirtyStateChange) {
      this.#onDirtyStateChange(false);
    }
    // Initialize history with the loaded workflow
    this.#history.initialize(workflow);
  }

  /**
   * Update the entire workflow.
   *
   * Note: This is typically called from SvelteFlow sync and should not push to history
   * for every small change. History is pushed by specific actions or drag handlers.
   */
  updateWorkflow(workflow: Workflow): void {
    this.#workflow = workflow;
    this.#bumpVersion();
    this.#notifyWorkflowChange('metadata');
  }

  /**
   * Restore workflow from history (undo/redo).
   *
   * This bypasses history recording to prevent recursive loops.
   */
  restoreFromHistory(workflow: Workflow): void {
    this.#restoringFromHistory = true;
    this.#workflow = workflow;
    this.#bumpVersion();
    this.#notifyWorkflowChange('metadata');
    this.#restoringFromHistory = false;
  }

  /** Update nodes. */
  updateNodes(nodes: WorkflowNode[]): void {
    if (!this.#workflow) return;

    // Check if nodes have actually changed to prevent infinite loops
    if (!hasWorkflowDataChanged(this.#workflow, nodes, this.#workflow.edges)) {
      return;
    }

    // Generate unique version identifier
    const versionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.#workflow = {
      ...this.#workflow,
      nodes,
      metadata: buildMetadata(this.#workflow.metadata, {
        versionId,
        updateNumber: (this.#workflow.metadata?.updateNumber ?? 0) + 1
      })
    };
    this.#bumpVersion();
    this.#notifyWorkflowChange('node_move');
  }

  /** Update edges. */
  updateEdges(edges: WorkflowEdge[]): void {
    if (!this.#workflow) return;

    // Check if edges have actually changed to prevent infinite loops
    if (!hasWorkflowDataChanged(this.#workflow, this.#workflow.nodes, edges)) {
      return;
    }

    // Generate unique version identifier
    const versionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.#workflow = {
      ...this.#workflow,
      edges,
      metadata: buildMetadata(this.#workflow.metadata, {
        versionId,
        updateNumber: (this.#workflow.metadata?.updateNumber ?? 0) + 1
      })
    };
    this.#bumpVersion();
    this.#notifyWorkflowChange('edge_add');
  }

  /** Update workflow name. */
  updateName(name: string): void {
    if (!this.#workflow) return;
    this.#workflow = {
      ...this.#workflow,
      name,
      metadata: buildMetadata(this.#workflow.metadata)
    };
    this.#bumpVersion();
    this.#notifyWorkflowChange('name');
  }

  /** Add a node. */
  addNode(node: WorkflowNode): void {
    this.#pushToHistory('Add node');
    if (!this.#workflow) return;
    this.#workflow = {
      ...this.#workflow,
      nodes: [...this.#workflow.nodes, node],
      metadata: buildMetadata(this.#workflow.metadata)
    };
    this.#bumpVersion();
    this.#notifyWorkflowChange('node_add');
  }

  /**
   * Remove a node.
   *
   * This is an atomic operation that also removes connected edges.
   * A single undo will restore both the node and its edges.
   */
  removeNode(nodeId: string): void {
    this.#pushToHistory('Delete node');
    if (!this.#workflow) return;
    this.#workflow = {
      ...this.#workflow,
      nodes: this.#workflow.nodes.filter((node) => node.id !== nodeId),
      edges: this.#workflow.edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      ),
      metadata: buildMetadata(this.#workflow.metadata)
    };
    this.#bumpVersion();
    this.#notifyWorkflowChange('node_remove');
  }

  /** Add an edge. */
  addEdge(edge: WorkflowEdge): void {
    this.#pushToHistory('Add connection');
    if (!this.#workflow) return;
    this.#workflow = {
      ...this.#workflow,
      edges: [...this.#workflow.edges, edge],
      metadata: buildMetadata(this.#workflow.metadata)
    };
    this.#bumpVersion();
    this.#notifyWorkflowChange('edge_add');
  }

  /** Remove an edge. */
  removeEdge(edgeId: string): void {
    this.#pushToHistory('Delete connection');
    if (!this.#workflow) return;
    this.#workflow = {
      ...this.#workflow,
      edges: this.#workflow.edges.filter((edge) => edge.id !== edgeId),
      metadata: buildMetadata(this.#workflow.metadata)
    };
    this.#bumpVersion();
    this.#notifyWorkflowChange('edge_remove');
  }

  /**
   * Update a specific node.
   *
   * Used for config changes. Pushes to history for undo support.
   */
  updateNode(nodeId: string, updates: Partial<WorkflowNode>): void {
    this.#pushToHistory('Update node config');
    if (!this.#workflow) return;
    this.#workflow = {
      ...this.#workflow,
      nodes: this.#workflow.nodes.map((node) =>
        node.id === nodeId ? { ...node, ...updates } : node
      ),
      metadata: buildMetadata(this.#workflow.metadata)
    };
    this.#bumpVersion();
    this.#notifyWorkflowChange('node_config');
  }

  /**
   * Clear the workflow.
   *
   * Resets the workflow and clears history.
   */
  clear(): void {
    this.#workflow = null;
    this.#editVersion = 0;
    this.#savedVersion = 0;
    this.#history.clear();
    if (this.#onDirtyStateChange) {
      this.#onDirtyStateChange(false);
    }
  }

  /** Update workflow metadata. */
  updateMetadata(metadata: Partial<Workflow['metadata']>): void {
    if (!this.#workflow) return;
    this.#workflow = {
      ...this.#workflow,
      metadata: buildMetadata(this.#workflow.metadata, metadata)
    };
    this.#bumpVersion();
    this.#notifyWorkflowChange('metadata');
  }

  /**
   * Batch update nodes and edges.
   *
   * Useful for complex operations that update multiple things at once.
   * Creates a single history entry for the entire batch.
   */
  batchUpdate(updates: {
    nodes?: WorkflowNode[];
    edges?: WorkflowEdge[];
    name?: string;
    description?: string;
    metadata?: Partial<Workflow['metadata']>;
    config?: Record<string, unknown>;
  }): void {
    this.#pushToHistory('Batch update');
    if (!this.#workflow) return;
    this.#workflow = {
      ...this.#workflow,
      ...(updates.nodes && { nodes: updates.nodes }),
      ...(updates.edges && { edges: updates.edges }),
      ...(updates.name && { name: updates.name }),
      ...(updates.description !== undefined && {
        description: updates.description
      }),
      ...(updates.config !== undefined && { config: updates.config }),
      metadata: buildMetadata(this.#workflow.metadata, updates.metadata ?? undefined)
    };
    this.#bumpVersion();
    this.#notifyWorkflowChange('metadata');
  }

  /**
   * Swap a node — atomically replaces nodes and edges with a descriptive history entry.
   *
   * Unlike batchUpdate, this uses `"node_swap"` as the change type and
   * records a meaningful description for the undo history.
   */
  swapNode(updates: { nodes: WorkflowNode[]; edges: WorkflowEdge[]; description?: string }): void {
    this.#pushToHistory(updates.description ?? 'Swap node');
    if (!this.#workflow) return;
    this.#workflow = {
      ...this.#workflow,
      nodes: updates.nodes,
      edges: updates.edges,
      metadata: buildMetadata(this.#workflow.metadata)
    };
    this.#bumpVersion();
    this.#notifyWorkflowChange('node_swap');
  }

  /**
   * Push current state to history manually.
   *
   * Use this before operations that modify the workflow through other means
   * (e.g., drag operations handled by SvelteFlow directly).
   *
   * @param description - Description of the upcoming change
   * @param workflow - Optional workflow to push (uses store state if not provided)
   */
  pushHistory(description?: string, workflow?: Workflow): void {
    this.#pushToHistory(description, workflow);
  }
}

// =========================================================================
// Backward-compatible module API (delegates to the page-default instance)
// =========================================================================
// Browser-only, like the default instance itself. Components being migrated
// to `getInstance().workflow` should prefer the class getters above.

const def = (): WorkflowStore => getDefaultInstance().workflow;

/** Get the current workflow store value reactively. */
export function getWorkflowStore(): Workflow | null {
  return def().current;
}

/** Get the current dirty state reactively. */
export function getIsDirty(): boolean {
  return def().isDirty;
}

/** Get the workflow ID reactively. */
export function getWorkflowId(): string | null {
  return def().id;
}

/** Get the workflow name reactively. */
export function getWorkflowName(): string {
  return def().name;
}

/** Get the workflow nodes reactively. */
export function getWorkflowNodes(): WorkflowNode[] {
  return def().nodes;
}

/** Get the workflow edges reactively. */
export function getWorkflowEdges(): WorkflowEdge[] {
  return def().edges;
}

/** Get the workflow metadata reactively. */
export function getWorkflowMetadata(): WorkflowMetadata {
  return def().metadata;
}

/** Get the current workflow format reactively. */
export function getWorkflowFormat(): string {
  return def().format;
}

/** Get workflow change summary reactively (useful for triggering saves). */
export function getWorkflowChanged(): {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  name: string;
} {
  return def().changeSummary;
}

/** Get workflow validation state reactively. */
export function getWorkflowValidation(): {
  hasNodes: boolean;
  hasEdges: boolean;
  nodeCount: number;
  edgeCount: number;
  isValid: boolean;
} {
  return def().validation;
}

/** Get workflow metadata change summary reactively. */
export function getWorkflowMetadataChanged(): {
  createdAt: string;
  updatedAt: string;
  version: string;
} {
  return def().metadataChangeSummary;
}

/**
 * Get connected handles reactively.
 *
 * Provides a Set of all handle IDs that are currently connected to edges.
 * Used by node components to implement hideUnconnectedHandles functionality.
 */
export function getConnectedHandles(): Set<string> {
  return def().connectedHandles;
}

/** Set the dirty state change callback. */
export function setOnDirtyStateChange(callback: ((isDirty: boolean) => void) | null): void {
  def().setOnDirtyStateChange(callback);
}

/** Set the workflow change callback. */
export function setOnWorkflowChange(
  callback: ((workflow: Workflow, changeType: WorkflowChangeType) => void) | null
): void {
  def().setOnWorkflowChange(callback);
}

/**
 * Mark the current workflow state as saved.
 *
 * Captures the current edit version so isDirty becomes false.
 * Call this after a successful backend save.
 */
export function markAsSaved(): void {
  def().markAsSaved();
}

/** Check if there are unsaved changes (non-reactive version for plain TS). */
export function isDirty(): boolean {
  return def().isDirty;
}

/** Get the current edit version (see WorkflowStore.editVersion for the protocol). */
export function getEditVersion(): number {
  return def().editVersion;
}

/** Enable or disable history recording. */
export function setHistoryEnabled(enabled: boolean): void {
  def().historyEnabled = enabled;
}

/** Check if history recording is enabled. */
export function isHistoryEnabled(): boolean {
  return def().historyEnabled;
}

/** Set the restoring from history flag (used internally by the history store). */
export function setRestoringFromHistory(restoring: boolean): void {
  def().setRestoringFromHistory(restoring);
}

/** Get the current workflow (non-reactive version for plain TS). */
export function getWorkflow(): Workflow | null {
  return def().current;
}

/**
 * Actions for updating the workflow (page-default instance).
 *
 * All actions that modify the workflow will trigger dirty state updates
 * and emit change events. Explicit forwarding object (not a re-export) so
 * the call shape — and `vi.mock`ability — matches the pre-class API.
 */
export const workflowActions: WorkflowStoreActions = {
  initialize: (workflow) => def().initialize(workflow),
  updateWorkflow: (workflow) => def().updateWorkflow(workflow),
  restoreFromHistory: (workflow) => def().restoreFromHistory(workflow),
  updateNodes: (nodes) => def().updateNodes(nodes),
  updateEdges: (edges) => def().updateEdges(edges),
  updateName: (name) => def().updateName(name),
  addNode: (node) => def().addNode(node),
  removeNode: (nodeId) => def().removeNode(nodeId),
  addEdge: (edge) => def().addEdge(edge),
  removeEdge: (edgeId) => def().removeEdge(edgeId),
  updateNode: (nodeId, updates) => def().updateNode(nodeId, updates),
  clear: () => def().clear(),
  updateMetadata: (metadata) => def().updateMetadata(metadata),
  batchUpdate: (updates) => def().batchUpdate(updates),
  swapNode: (updates) => def().swapNode(updates),
  pushHistory: (description, workflow) => def().pushHistory(description, workflow)
};
