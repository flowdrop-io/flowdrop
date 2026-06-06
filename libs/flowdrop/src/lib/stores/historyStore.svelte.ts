/**
 * History Store for FlowDrop (Svelte 5 Runes)
 *
 * Provides reactive Svelte 5 rune-based bindings for a history service.
 * Exposes undo/redo state and actions for the workflow editor.
 *
 * The reactive state lives in the {@link HistoryStore} class — one per
 * FlowDrop instance, created by `createFlowDropInstance()` and resolved in
 * components via `getInstance().historyBindings`. The module-level functions
 * at the bottom are backward-compatible shims that delegate to the
 * page-default instance.
 *
 * @module stores/historyStore
 */

import { HistoryService, type HistoryState, type PushOptions } from '../services/historyService.js';
import type { Workflow } from '../types/index.js';
import { getDefaultInstance } from './instanceContainer.svelte.js';

/**
 * Undo/redo actions for a {@link HistoryStore}.
 *
 * Bound facade — safe to detach (`onclick={fd.historyBindings.actions.undo}`)
 * because every entry is bound to its store in the constructor.
 */
export interface HistoryStoreActions {
  initialize: (workflow: Workflow) => void;
  pushState: (workflow: Workflow, options?: PushOptions) => void;
  undo: () => boolean;
  redo: () => boolean;
  startTransaction: (workflow: Workflow, description?: string) => void;
  commitTransaction: () => void;
  cancelTransaction: () => void;
  clear: (currentWorkflow?: Workflow) => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  getState: () => HistoryState;
}

// =========================================================================
// HistoryStore (per-instance reactive bindings)
// =========================================================================

/**
 * Reactive rune bindings around a {@link HistoryService}.
 *
 * Subscribes to the service on construction; call {@link cleanup} when the
 * owning instance is destroyed to release the subscription.
 */
export class HistoryStore {
  /** Reactive snapshot of the history service state. */
  #state = $state<HistoryState>({
    canUndo: false,
    canRedo: false,
    currentIndex: 0,
    historyLength: 0,
    isInTransaction: false
  });

  /**
   * Callback for when workflow state is restored from history.
   * Invoked when undo/redo operations return a workflow.
   */
  #onRestore: ((workflow: Workflow) => void) | null = null;

  /** Unsubscribe handle for the service subscription. */
  readonly #unsubscribe: () => void;

  /** The underlying (non-reactive) history service. */
  readonly #service: HistoryService;

  /** Bound action facade — see {@link HistoryStoreActions}. */
  readonly actions: HistoryStoreActions;

  constructor(service: HistoryService) {
    this.#service = service;
    this.#unsubscribe = service.subscribe((state) => {
      this.#state = state;
    });
    this.actions = Object.freeze({
      initialize: this.initialize.bind(this),
      pushState: this.pushState.bind(this),
      undo: this.undo.bind(this),
      redo: this.redo.bind(this),
      startTransaction: this.startTransaction.bind(this),
      commitTransaction: this.commitTransaction.bind(this),
      cancelTransaction: this.cancelTransaction.bind(this),
      clear: this.clear.bind(this),
      canUndo: () => this.#service.canUndo(),
      canRedo: () => this.#service.canRedo(),
      getState: () => this.#state
    });
  }

  // -----------------------------------------------------------------------
  // Reactive getters
  // -----------------------------------------------------------------------

  /**
   * The current history state snapshot.
   *
   * Use this for binding to UI elements like undo/redo buttons.
   *
   * @example
   * ```svelte
   * <script>
   *   const fd = getInstance();
   *   const state = $derived(fd.historyBindings.state);
   * </script>
   *
   * <button disabled={!state.canUndo} onclick={fd.historyBindings.actions.undo}>
   *   Undo
   * </button>
   * ```
   */
  get state(): HistoryState {
    return this.#state;
  }

  /** Whether undo is currently available (reactive). */
  get canUndo(): boolean {
    return this.#state.canUndo;
  }

  /** Whether redo is currently available (reactive). */
  get canRedo(): boolean {
    return this.#state.canRedo;
  }

  // -----------------------------------------------------------------------
  // Wiring & lifecycle
  // -----------------------------------------------------------------------

  /**
   * Set the callback for restoring workflow state.
   *
   * This callback is invoked when undo/redo operations return a workflow.
   * Use this to update the workflow store or other state management.
   */
  setOnRestoreCallback(callback: ((workflow: Workflow) => void) | null): void {
    this.#onRestore = callback;
  }

  /**
   * Release the history service subscription.
   * Called by the owning instance's destroy(); safe to call repeatedly.
   */
  cleanup(): void {
    this.#unsubscribe();
  }

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  /** Initialize history with the current workflow (resets history). */
  initialize(workflow: Workflow): void {
    this.#service.initialize(workflow);
  }

  /**
   * Push the current state to history before making changes.
   *
   * Call this BEFORE modifying the workflow to capture the "before" state.
   */
  pushState(workflow: Workflow, options?: PushOptions): void {
    this.#service.push(workflow, options);
  }

  /**
   * Undo the last change.
   *
   * Restores the previous workflow state and invokes the restore callback.
   *
   * @returns true if undo was successful, false if at beginning of history
   */
  undo(): boolean {
    const previousState = this.#service.undo();
    if (previousState && this.#onRestore) {
      this.#onRestore(previousState);
      return true;
    }
    return previousState !== null;
  }

  /**
   * Redo the last undone change.
   *
   * Restores the next workflow state and invokes the restore callback.
   *
   * @returns true if redo was successful, false if at end of history
   */
  redo(): boolean {
    const nextState = this.#service.redo();
    if (nextState && this.#onRestore) {
      this.#onRestore(nextState);
      return true;
    }
    return false;
  }

  /**
   * Start a transaction for grouping multiple changes.
   *
   * All changes during a transaction are combined into a single undo entry.
   */
  startTransaction(workflow: Workflow, description?: string): void {
    this.#service.startTransaction(workflow, description);
  }

  /** Commit the current transaction. */
  commitTransaction(): void {
    this.#service.commitTransaction();
  }

  /** Cancel the current transaction without committing. */
  cancelTransaction(): void {
    this.#service.cancelTransaction();
  }

  /**
   * Clear all history.
   *
   * @param currentWorkflow - If provided, keeps this as the initial state
   */
  clear(currentWorkflow?: Workflow): void {
    this.#service.clear(currentWorkflow);
  }
}

// =========================================================================
// Backward-compatible module API (delegates to the page-default instance)
// =========================================================================

const def = (): HistoryStore => getDefaultInstance().historyBindings;

/** Get the current history state snapshot (page-default instance). */
export function getHistoryState(): HistoryState {
  return def().state;
}

/** Convenience getter for canUndo state. */
export function getCanUndo(): boolean {
  return def().canUndo;
}

/** Convenience getter for canRedo state. */
export function getCanRedo(): boolean {
  return def().canRedo;
}

/**
 * Set the callback for restoring workflow state (page-default instance).
 */
export function setOnRestoreCallback(callback: ((workflow: Workflow) => void) | null): void {
  def().setOnRestoreCallback(callback);
}

/**
 * Clean up the page-default instance's history subscription.
 *
 * Call this when tearing down the history store (e.g., in tests or on app
 * unmount) to prevent memory leaks.
 */
export function cleanupHistorySubscription(): void {
  def().cleanup();
}

/**
 * History actions for undo/redo operations (page-default instance).
 *
 * Explicit forwarding object (not a re-export) so the call shape — and
 * `vi.mock`ability — matches the pre-class API.
 */
export const historyActions: HistoryStoreActions = {
  initialize: (workflow) => def().initialize(workflow),
  pushState: (workflow, options) => def().pushState(workflow, options),
  undo: () => def().undo(),
  redo: () => def().redo(),
  startTransaction: (workflow, description) => def().startTransaction(workflow, description),
  commitTransaction: () => def().commitTransaction(),
  cancelTransaction: () => def().cancelTransaction(),
  clear: (currentWorkflow) => def().clear(currentWorkflow),
  canUndo: () => def().actions.canUndo(),
  canRedo: () => def().actions.canRedo(),
  getState: () => def().state
};

// =========================================================================
// Re-exports
// =========================================================================

export type { HistoryEntry, HistoryState, PushOptions } from '../services/historyService.js';
export { HistoryService, historyService } from '../services/historyService.js';
