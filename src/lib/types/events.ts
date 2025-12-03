/**
 * Event Handler Types for FlowDrop
 *
 * Defines high-level event handlers for enterprise integration.
 * These events allow parent applications to react to workflow lifecycle events.
 *
 * @module types/events
 */

import type { Workflow } from './index.js';

/**
 * Types of workflow changes
 *
 * Used to identify what kind of change triggered the onWorkflowChange event.
 */
export type WorkflowChangeType =
	| 'node_add'
	| 'node_remove'
	| 'node_move'
	| 'node_config'
	| 'edge_add'
	| 'edge_remove'
	| 'metadata'
	| 'name'
	| 'description';

/**
 * High-level event handlers for enterprise integration
 *
 * These event handlers allow parent applications to hook into FlowDrop's
 * workflow lifecycle. All handlers are optional.
 *
 * @example
 * ```typescript
 * const eventHandlers: FlowDropEventHandlers = {
 *   onWorkflowChange: (workflow, changeType) => {
 *     console.log(`Workflow changed: ${changeType}`);
 *   },
 *   onDirtyStateChange: (isDirty) => {
 *     updateSaveButtonState(isDirty);
 *   },
 *   onAfterSave: async (workflow) => {
 *     showSuccess("Workflow saved!");
 *   }
 * };
 * ```
 */
export interface FlowDropEventHandlers {
	/**
	 * Called when workflow changes (any modification)
	 *
	 * Triggered after nodes are added/removed/moved, edges are added/removed,
	 * or node configurations are changed.
	 *
	 * @param workflow - The updated workflow
	 * @param changeType - The type of change that occurred
	 */
	onWorkflowChange?: (workflow: Workflow, changeType: WorkflowChangeType) => void;

	/**
	 * Called when dirty state changes
	 *
	 * Triggered when the workflow transitions between saved and unsaved states.
	 * Useful for updating UI indicators or enabling/disabling save buttons.
	 *
	 * @param isDirty - true if there are unsaved changes
	 */
	onDirtyStateChange?: (isDirty: boolean) => void;

	/**
	 * Called before save - return false to cancel
	 *
	 * Allows the parent application to validate or confirm before saving.
	 * If this returns false, the save operation is cancelled.
	 *
	 * @param workflow - The workflow about to be saved
	 * @returns Promise resolving to false to cancel, true/void to proceed
	 */
	onBeforeSave?: (workflow: Workflow) => Promise<boolean | void>;

	/**
	 * Called after successful save
	 *
	 * Triggered after the workflow has been successfully saved to the backend.
	 * Useful for showing success notifications or clearing draft storage.
	 *
	 * @param workflow - The saved workflow (may include server-assigned IDs)
	 */
	onAfterSave?: (workflow: Workflow) => Promise<void>;

	/**
	 * Called when save fails
	 *
	 * Triggered when the save operation fails due to API error.
	 * Useful for showing error notifications or logging.
	 *
	 * @param error - The error that occurred
	 * @param workflow - The workflow that failed to save
	 */
	onSaveError?: (error: Error, workflow: Workflow) => Promise<void>;

	/**
	 * Called when workflow is loaded
	 *
	 * Triggered after a workflow is loaded and initialized.
	 * This includes both initial load and subsequent loads.
	 *
	 * @param workflow - The loaded workflow
	 */
	onWorkflowLoad?: (workflow: Workflow) => void;

	/**
	 * Called before unmount
	 *
	 * Triggered before FlowDrop is destroyed/unmounted.
	 * Allows parent application to save drafts or perform cleanup.
	 *
	 * @param workflow - The current workflow state
	 * @param isDirty - true if there are unsaved changes
	 */
	onBeforeUnmount?: (workflow: Workflow, isDirty: boolean) => void;

	/**
	 * Called on any API error
	 *
	 * Triggered when any API request fails.
	 * Return true to suppress FlowDrop's default error toast.
	 *
	 * @param error - The error that occurred
	 * @param operation - Description of the operation that failed (e.g., "save", "load", "fetchNodes")
	 * @returns true to suppress default error handling, false/void to show default toast
	 */
	onApiError?: (error: Error, operation: string) => boolean | void;
}

/**
 * Feature flags for FlowDrop
 *
 * Controls optional features and behaviors.
 * All features have sensible defaults.
 */
export interface FlowDropFeatures {
	/**
	 * Save drafts to localStorage automatically
	 *
	 * When enabled, FlowDrop will periodically save the current workflow
	 * to localStorage as a draft. This helps prevent data loss.
	 *
	 * @default true
	 */
	autoSaveDraft?: boolean;

	/**
	 * Auto-save interval in milliseconds
	 *
	 * How often to save drafts to localStorage when autoSaveDraft is enabled.
	 *
	 * @default 30000 (30 seconds)
	 */
	autoSaveDraftInterval?: number;

	/**
	 * Show toast notifications
	 *
	 * When enabled, FlowDrop will show toast notifications for
	 * success, error, and loading states.
	 *
	 * @default true
	 */
	showToasts?: boolean;
}

/**
 * Default feature values
 *
 * Used when features are not explicitly configured.
 */
export const DEFAULT_FEATURES: Required<FlowDropFeatures> = {
	autoSaveDraft: true,
	autoSaveDraftInterval: 30000,
	showToasts: true
};

/**
 * Merge user-provided features with defaults
 *
 * @param features - User-provided feature configuration
 * @returns Complete feature configuration with defaults applied
 */
export function mergeFeatures(features?: FlowDropFeatures): Required<FlowDropFeatures> {
	return {
		...DEFAULT_FEATURES,
		...features
	};
}
