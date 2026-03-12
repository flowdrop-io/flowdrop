/**
 * History Service for FlowDrop
 *
 * Provides undo/redo functionality for the workflow editor using snapshot-based history.
 * Supports debounced drag operations and configurable history limits.
 *
 * @module services/historyService
 */

import type { Workflow } from "../types/index.js";
import { DEFAULT_BEHAVIOR_SETTINGS } from "../types/settings.js";
import { logger } from "../utils/logger.js";

// =========================================================================
// Types
// =========================================================================

/**
 * Represents a single entry in the history stack
 */
export interface HistoryEntry {
  /** Deep clone of the workflow state at this point */
  snapshot: Workflow;
  /** Timestamp when the entry was created */
  timestamp: number;
  /** Human-readable description of the change (e.g., "Add node", "Delete edge") */
  description?: string;
}

/**
 * Current state of the history service
 */
export interface HistoryState {
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Current position in the history stack */
  currentIndex: number;
  /** Total number of entries in the history stack */
  historyLength: number;
  /** Whether a transaction is currently active */
  isInTransaction: boolean;
}

/**
 * Options for pushing a new state to history
 */
export interface PushOptions {
  /** Description of the change for debugging/display */
  description?: string;
  /** Whether to skip adding this to history (used internally for undo/redo) */
  skipHistory?: boolean;
}

// =========================================================================
// History Service Class
// =========================================================================

/**
 * Manages undo/redo history for workflow state
 *
 * Uses a snapshot-based approach where each history entry contains
 * a complete copy of the workflow state. This trades memory for simplicity
 * and reliability.
 *
 * @example
 * ```typescript
 * const historyService = new HistoryService();
 *
 * // Initialize with current workflow
 * historyService.initialize(workflow);
 *
 * // Push state before making changes
 * historyService.push(workflow, { description: "Add node" });
 *
 * // Undo/Redo
 * const previousState = historyService.undo();
 * const nextState = historyService.redo();
 * ```
 */
export class HistoryService {
  /** Stack of history entries */
  private undoStack: HistoryEntry[] = [];

  /** Stack of redo entries (cleared when new changes are made) */
  private redoStack: HistoryEntry[] = [];

  /** Maximum number of entries to keep in history */
  private maxEntries: number;

  /** Flag to track if we're in a transaction (batch operation) */
  private inTransaction: boolean = false;

  /** Snapshot captured at transaction start */
  private transactionSnapshot: Workflow | null = null;

  /** Description for the transaction */
  private transactionDescription: string | null = null;

  /** Callbacks to notify when history state changes */
  private changeCallbacks: Set<(state: HistoryState) => void> = new Set();

  /**
   * Creates a new HistoryService instance
   *
   * @param maxEntries - Maximum number of history entries to keep (default: 50)
   */
  constructor(maxEntries: number = DEFAULT_BEHAVIOR_SETTINGS.undoHistoryLimit) {
    this.maxEntries = maxEntries;
  }

  // =========================================================================
  // Public Methods
  // =========================================================================

  /**
   * Initialize the history with the current workflow state
   *
   * This clears any existing history and sets the initial state.
   * Should be called when a workflow is first loaded.
   *
   * @param workflow - The initial workflow state
   */
  initialize(workflow: Workflow): void {
    this.undoStack = [];
    this.redoStack = [];
    this.inTransaction = false;
    this.transactionSnapshot = null;
    this.transactionDescription = null;

    // Push the initial state as the first entry
    this.undoStack.push({
      snapshot: this.cloneWorkflow(workflow),
      timestamp: Date.now(),
      description: "Initial state",
    });

    this.notifyChange();
  }

  /**
   * Push the current state to history before making changes
   *
   * Call this BEFORE modifying the workflow to capture the "before" state.
   * The redo stack is cleared when new changes are pushed.
   *
   * @param workflow - The current workflow state (before changes)
   * @param options - Options for this history entry
   */
  push(workflow: Workflow, options: PushOptions = {}): void {
    // Skip if we're in a transaction (we'll push at commit)
    if (this.inTransaction) {
      return;
    }

    // Skip if explicitly requested
    if (options.skipHistory) {
      return;
    }

    this.pushInternal(workflow, options.description);
  }

  /**
   * Undo the last change
   *
   * Returns the previous workflow state, or null if at the beginning of history.
   *
   * @returns The previous workflow state, or null if cannot undo
   */
  undo(): Workflow | null {
    // Need at least 2 entries to undo (initial + 1 change)
    if (this.undoStack.length <= 1) {
      return null;
    }

    // Pop the current state and push to redo stack
    const current = this.undoStack.pop();
    if (current) {
      this.redoStack.push(current);
    }

    // Return the new current state (the one before the change)
    const previous = this.undoStack[this.undoStack.length - 1];
    this.notifyChange();

    return previous ? this.cloneWorkflow(previous.snapshot) : null;
  }

  /**
   * Redo the last undone change
   *
   * Returns the next workflow state, or null if at the end of history.
   *
   * @returns The next workflow state, or null if cannot redo
   */
  redo(): Workflow | null {
    if (this.redoStack.length === 0) {
      return null;
    }

    // Pop from redo stack and push to undo stack
    const next = this.redoStack.pop();
    if (next) {
      this.undoStack.push(next);
      this.notifyChange();
      return this.cloneWorkflow(next.snapshot);
    }

    return null;
  }

  /**
   * Start a transaction for grouping multiple changes
   *
   * All changes made during a transaction are combined into a single undo entry.
   * Useful for operations like "delete node" which also removes connected edges.
   *
   * @param workflow - The current workflow state (before changes)
   * @param description - Description for the combined change
   */
  startTransaction(workflow: Workflow, description?: string): void {
    if (this.inTransaction) {
      logger.warn(
        "HistoryService: Transaction already in progress, ignoring startTransaction",
      );
      return;
    }

    this.inTransaction = true;
    this.transactionSnapshot = this.cloneWorkflow(workflow);
    this.transactionDescription = description ?? null;
  }

  /**
   * Commit the current transaction
   *
   * Pushes the state captured at transaction start to the history stack.
   */
  commitTransaction(): void {
    if (!this.inTransaction || !this.transactionSnapshot) {
      logger.warn(
        "HistoryService: No transaction in progress, ignoring commitTransaction",
      );
      return;
    }

    // Push the snapshot captured at transaction start
    this.pushInternal(
      this.transactionSnapshot,
      this.transactionDescription ?? undefined,
    );

    // Clear transaction state
    this.inTransaction = false;
    this.transactionSnapshot = null;
    this.transactionDescription = null;
  }

  /**
   * Cancel the current transaction without committing
   *
   * Discards the transaction without adding to history.
   */
  cancelTransaction(): void {
    this.inTransaction = false;
    this.transactionSnapshot = null;
    this.transactionDescription = null;
  }

  /**
   * Clear all history
   *
   * Resets the history stack. Optionally keeps the current state as initial.
   *
   * @param currentWorkflow - If provided, keeps this as the initial state
   */
  clear(currentWorkflow?: Workflow): void {
    this.undoStack = [];
    this.redoStack = [];
    this.inTransaction = false;
    this.transactionSnapshot = null;
    this.transactionDescription = null;

    if (currentWorkflow) {
      this.undoStack.push({
        snapshot: this.cloneWorkflow(currentWorkflow),
        timestamp: Date.now(),
        description: "Initial state",
      });
    }

    this.notifyChange();
  }

  /**
   * Get the current history state
   *
   * @returns The current state of the history service
   */
  getState(): HistoryState {
    return {
      canUndo: this.undoStack.length > 1,
      canRedo: this.redoStack.length > 0,
      currentIndex: this.undoStack.length - 1,
      historyLength: this.undoStack.length + this.redoStack.length,
      isInTransaction: this.inTransaction,
    };
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 1;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Subscribe to history state changes
   *
   * @param callback - Function to call when history state changes
   * @returns Unsubscribe function
   */
  subscribe(callback: (state: HistoryState) => void): () => void {
    this.changeCallbacks.add(callback);

    // Immediately notify with current state
    callback(this.getState());

    return () => {
      this.changeCallbacks.delete(callback);
    };
  }

  /**
   * Update the maximum number of history entries
   *
   * @param maxEntries - New maximum number of entries
   */
  setMaxEntries(maxEntries: number): void {
    this.maxEntries = maxEntries;
    this.trimHistory();
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  /**
   * Internal method to push a state to history
   */
  private pushInternal(workflow: Workflow, description?: string): void {
    // Clear redo stack when making new changes
    this.redoStack = [];

    // Add new entry
    this.undoStack.push({
      snapshot: this.cloneWorkflow(workflow),
      timestamp: Date.now(),
      description,
    });

    // Trim history if over limit
    this.trimHistory();

    this.notifyChange();
  }

  /**
   * Trim history to stay within maxEntries limit.
   * A maxEntries of 0 means unlimited (no trimming).
   */
  private trimHistory(): void {
    if (this.maxEntries <= 0) return;
    while (this.undoStack.length > this.maxEntries) {
      this.undoStack.shift();
    }
  }

  /**
   * Create a deep clone of a workflow
   *
   * Uses JSON parse/stringify to properly strip non-serializable values
   * like functions (e.g., onConfigOpen callbacks) that are added to nodes
   * at runtime but shouldn't be persisted in history.
   */
  private cloneWorkflow(workflow: Workflow): Workflow {
    // Always use JSON parse/stringify to strip functions and other non-serializable values
    // structuredClone would fail on workflows containing callback functions
    return JSON.parse(JSON.stringify(workflow));
  }

  /**
   * Notify all subscribers of state changes
   */
  private notifyChange(): void {
    const state = this.getState();
    this.changeCallbacks.forEach((callback) => callback(state));
  }
}

// =========================================================================
// Singleton Instance
// =========================================================================

/**
 * Singleton instance of the history service
 *
 * Use this for the main workflow editor. For isolated instances,
 * create a new HistoryService directly.
 */
export const historyService = new HistoryService();
