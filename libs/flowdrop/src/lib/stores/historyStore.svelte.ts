/**
 * History Store for FlowDrop (Svelte 5 Runes)
 *
 * Provides reactive Svelte 5 rune-based bindings for the history service.
 * Exposes undo/redo state and actions for the workflow editor.
 *
 * @module stores/historyStore
 */

import { historyService, type HistoryState, type PushOptions } from '../services/historyService.js';
import type { Workflow } from '../types/index.js';

// =========================================================================
// Reactive State (Runes)
// =========================================================================

/**
 * Internal reactive state for history, powered by $state.
 */
let historyState = $state<HistoryState>({
	canUndo: false,
	canRedo: false,
	currentIndex: 0,
	historyLength: 0,
	isInTransaction: false
});

// Subscribe to history service changes and update the rune state.
// The unsubscribe function is stored so it can be called via
// cleanupHistorySubscription() when the store is torn down.
const _unsubscribeHistoryService = historyService.subscribe((state) => {
	historyState = state;
});

/**
 * Clean up the historyService subscription created at module initialisation.
 * Call this when tearing down the history store (e.g., in tests or on app
 * unmount) to prevent memory leaks.
 */
export function cleanupHistorySubscription(): void {
	_unsubscribeHistoryService();
}

// =========================================================================
// Reactive Getters
// =========================================================================

/**
 * Get the current history state snapshot.
 *
 * Use this for binding to UI elements like undo/redo buttons.
 *
 * @example
 * ```svelte
 * <script>
 *   import { getHistoryState } from "$lib/stores/historyStore.svelte.js";
 *
 *   const state = $derived(getHistoryState());
 * </script>
 *
 * <button disabled={!state.canUndo} onclick={historyActions.undo}>
 *   Undo
 * </button>
 * ```
 */
export function getHistoryState(): HistoryState {
	return historyState;
}

/**
 * Convenience getter for canUndo state.
 *
 * @returns Whether undo is currently available
 */
export function getCanUndo(): boolean {
	return historyState.canUndo;
}

/**
 * Convenience getter for canRedo state.
 *
 * @returns Whether redo is currently available
 */
export function getCanRedo(): boolean {
	return historyState.canRedo;
}

// =========================================================================
// History Actions
// =========================================================================

/**
 * Callback for when workflow state is restored from history
 *
 * Set this to handle the restored workflow state (e.g., update the workflow store)
 */
let onRestoreCallback: ((workflow: Workflow) => void) | null = null;

/**
 * Set the callback for restoring workflow state
 *
 * This callback is invoked when undo/redo operations return a workflow.
 * Use this to update the workflow store or other state management.
 *
 * @param callback - Function to call with restored workflow
 */
export function setOnRestoreCallback(callback: ((workflow: Workflow) => void) | null): void {
	onRestoreCallback = callback;
}

/**
 * History actions for undo/redo operations
 *
 * Use these functions to interact with the history service.
 * They handle the coordination between history and workflow state.
 */
export const historyActions = {
	/**
	 * Initialize history with the current workflow
	 *
	 * Call this when loading a new workflow to reset history.
	 *
	 * @param workflow - The initial workflow state
	 */
	initialize: (workflow: Workflow): void => {
		historyService.initialize(workflow);
	},

	/**
	 * Push the current state to history before making changes
	 *
	 * Call this BEFORE modifying the workflow to capture the "before" state.
	 *
	 * @param workflow - The current workflow state (before changes)
	 * @param options - Options for this history entry
	 */
	pushState: (workflow: Workflow, options?: PushOptions): void => {
		historyService.push(workflow, options);
	},

	/**
	 * Undo the last change
	 *
	 * Restores the previous workflow state and invokes the restore callback.
	 *
	 * @returns true if undo was successful, false if at beginning of history
	 */
	undo: (): boolean => {
		const previousState = historyService.undo();
		if (previousState && onRestoreCallback) {
			onRestoreCallback(previousState);
			return true;
		}
		return previousState !== null;
	},

	/**
	 * Redo the last undone change
	 *
	 * Restores the next workflow state and invokes the restore callback.
	 *
	 * @returns true if redo was successful, false if at end of history
	 */
	redo: (): boolean => {
		const nextState = historyService.redo();
		if (nextState && onRestoreCallback) {
			onRestoreCallback(nextState);
			return true;
		}
		return false;
	},

	/**
	 * Start a transaction for grouping multiple changes
	 *
	 * All changes during a transaction are combined into a single undo entry.
	 *
	 * @param workflow - The current workflow state (before changes)
	 * @param description - Description for the combined change
	 */
	startTransaction: (workflow: Workflow, description?: string): void => {
		historyService.startTransaction(workflow, description);
	},

	/**
	 * Commit the current transaction
	 */
	commitTransaction: (): void => {
		historyService.commitTransaction();
	},

	/**
	 * Cancel the current transaction without committing
	 */
	cancelTransaction: (): void => {
		historyService.cancelTransaction();
	},

	/**
	 * Clear all history
	 *
	 * @param currentWorkflow - If provided, keeps this as the initial state
	 */
	clear: (currentWorkflow?: Workflow): void => {
		historyService.clear(currentWorkflow);
	},

	/**
	 * Check if undo is available
	 */
	canUndo: (): boolean => {
		return historyService.canUndo();
	},

	/**
	 * Check if redo is available
	 */
	canRedo: (): boolean => {
		return historyService.canRedo();
	},

	/**
	 * Get the current history state synchronously
	 *
	 * @returns The current history state
	 */
	getState: (): HistoryState => {
		return historyState;
	}
};

// =========================================================================
// Re-exports
// =========================================================================

export type { HistoryEntry, HistoryState, PushOptions } from '../services/historyService.js';
export { HistoryService, historyService } from '../services/historyService.js';
