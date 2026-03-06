/**
 * Global Save Service
 * Provides save and export functionality that can be accessed from anywhere in the app.
 * This is the single source of truth for save/export logic.
 *
 * App.svelte delegates to globalSaveWorkflow() / globalExportWorkflow() rather than
 * reimplementing the logic, ensuring "blur active element" flushing and metadata
 * construction happen in exactly one place.
 */

import { tick } from 'svelte';
import {
	getWorkflowStore,
	workflowActions,
	markAsSaved as storeMarkAsSaved
} from '$lib/stores/workflowStore.svelte.js';
import { workflowApi, setEndpointConfig } from './api.js';
import { createEndpointConfig } from '$lib/config/endpoints.js';
import { v4 as uuidv4 } from 'uuid';
import type { Workflow } from '$lib/types/index.js';
import { DEFAULT_WORKFLOW_FORMAT } from '$lib/types/index.js';
import { apiToasts, workflowToasts, dismissToast } from './toastService.js';
import type { FlowDropEventHandlers, FlowDropFeatures } from '$lib/types/events.js';
import { DEFAULT_FEATURES } from '$lib/types/events.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Minimal interface for the enhanced API client used when an authProvider is present.
 * Matches the surface of EnhancedFlowDropApiClient that save needs.
 */
export interface SaveApiClient {
	saveWorkflow(workflow: Workflow): Promise<Workflow>;
	updateWorkflow(id: string, workflow: Workflow): Promise<Workflow>;
}

/**
 * Options accepted by globalSaveWorkflow().
 * All fields are optional — omitting them falls back to the basic behaviour
 * (no event handlers, always show toasts, legacy workflowApi).
 */
export interface GlobalSaveOptions {
	/** Enhanced API client with authProvider support. Falls back to legacy workflowApi when absent. */
	apiClient?: SaveApiClient | null;
	/** Event handler hooks (onBeforeSave, onAfterSave, onSaveError, onApiError). */
	eventHandlers?: FlowDropEventHandlers;
	/** Feature flags (showToasts). Defaults to DEFAULT_FEATURES. */
	features?: Partial<FlowDropFeatures>;
	/**
	 * Callback invoked after a successful save to clear the dirty state.
	 * Pass workflowStore's markAsSaved here when calling from App.svelte.
	 */
	onMarkAsSaved?: () => void;
}

/**
 * Options accepted by globalExportWorkflow().
 */
export interface GlobalExportOptions {
	/** Feature flags (showToasts). Defaults to DEFAULT_FEATURES. */
	features?: Partial<FlowDropFeatures>;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Ensure API configuration is initialized.
 * This is needed when the global save function is called from the layout component
 * which doesn't initialize the API configuration like the App component does.
 */
async function ensureApiConfiguration(): Promise<void> {
	try {
		const { getEndpointConfig } = await import('./api.js');
		const currentConfig = getEndpointConfig();
		if (currentConfig && currentConfig.baseUrl) {
			return;
		}
	} catch {
		// Could not check existing API configuration, initializing
	}

	// API configuration is not initialized — derive URL from window.location when available
	const apiBaseUrl =
		typeof window !== 'undefined'
			? `${window.location.protocol}//${window.location.host}/api/flowdrop`
			: '/api/flowdrop';

	const config = createEndpointConfig(apiBaseUrl, {
		auth: {
			type: 'none'
		},
		timeout: 10000,
		retry: {
			enabled: true,
			maxAttempts: 2,
			delay: 1000,
			backoff: 'exponential'
		}
	});

	setEndpointConfig(config);
}

/**
 * Flush any pending form changes by blurring the active element.
 * This ensures focusout handlers (like ConfigForm's handleFormBlur)
 * sync local state to the global store before we read it.
 *
 * Must be called once, in this file only, so the logic lives in exactly one place.
 */
async function flushPendingFormChanges(): Promise<void> {
	if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
		document.activeElement.blur();
	}
	// Wait for any pending DOM / Svelte reactive updates before reading the store
	await tick();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Save the current workflow to the backend.
 *
 * This is the single source of truth for save logic. App.svelte delegates
 * to this function rather than reimplementing the steps.
 *
 * Steps performed:
 *  1. Flush pending form changes (blur active element + tick)
 *  2. Optionally call onBeforeSave — return false cancels the save
 *  3. Build the canonical Workflow object (preserving metadata, format, etc.)
 *  4. Persist via enhanced apiClient or legacy workflowApi
 *  5. Update the store if the server assigned a new ID
 *  6. Call onMarkAsSaved / onAfterSave hooks
 *  7. Show toast notifications (respecting features.showToasts)
 */
export async function globalSaveWorkflow(options: GlobalSaveOptions = {}): Promise<void> {
	const { apiClient, eventHandlers, onMarkAsSaved } = options;
	const features = { ...DEFAULT_FEATURES, ...options.features };

	// Step 1 — Flush pending form changes (single location for this logic)
	await flushPendingFormChanges();

	// Get current workflow from global store after flush
	const currentWorkflow = getWorkflowStore();

	if (!currentWorkflow) {
		if (features.showToasts) {
			apiToasts.error('Save workflow', 'No workflow to save');
		}
		return;
	}

	// Step 2 — Allow the parent to cancel the save
	if (eventHandlers?.onBeforeSave) {
		const shouldContinue = await eventHandlers.onBeforeSave(currentWorkflow);
		if (shouldContinue === false) {
			return;
		}
	}

	const loadingToast = features.showToasts ? apiToasts.loading('Saving workflow') : null;

	try {
		// Ensure API configuration is initialised (needed when called outside App.svelte)
		await ensureApiConfiguration();

		// Step 3 — Build the canonical workflow object.
		// Preserve all existing metadata fields (format, tags, etc.) so nothing is dropped.
		const workflowId = currentWorkflow.id || uuidv4();

		const finalWorkflow: Workflow = {
			id: workflowId,
			name: currentWorkflow.name || 'Untitled Workflow',
			description: currentWorkflow.description || '',
			nodes: currentWorkflow.nodes || [],
			edges: currentWorkflow.edges || [],
			metadata: {
				...currentWorkflow.metadata,
				version: currentWorkflow.metadata?.version || '1.0.0',
				format: currentWorkflow.metadata?.format || DEFAULT_WORKFLOW_FORMAT,
				createdAt: currentWorkflow.metadata?.createdAt || new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}
		};

		// Step 4 — Persist
		let savedWorkflow: Workflow;

		if (apiClient) {
			// Enhanced client path — detects existing workflows by non-UUID ID
			const isExistingWorkflow =
				finalWorkflow.id.length > 0 &&
				!finalWorkflow.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

			if (isExistingWorkflow) {
				savedWorkflow = await apiClient.updateWorkflow(finalWorkflow.id, finalWorkflow);
			} else {
				savedWorkflow = await apiClient.saveWorkflow(finalWorkflow);
			}
		} else {
			// Legacy path
			savedWorkflow = await workflowApi.saveWorkflow(finalWorkflow);
		}

		// Step 5 — If the server assigned a new ID, sync the store
		if (savedWorkflow.id && savedWorkflow.id !== finalWorkflow.id) {
			workflowActions.batchUpdate({
				nodes: finalWorkflow.nodes,
				edges: finalWorkflow.edges,
				name: finalWorkflow.name,
				metadata: {
					...finalWorkflow.metadata,
					...savedWorkflow.metadata
				}
			});
		}

		// Step 6a — Mark dirty state as clean
		if (onMarkAsSaved) {
			onMarkAsSaved();
		} else {
			// Fallback: call the store's own markAsSaved if no callback was provided
			storeMarkAsSaved();
		}

		// Show success toast
		if (loadingToast) dismissToast(loadingToast);
		if (features.showToasts) {
			workflowToasts.saved(finalWorkflow.name);
		}

		// Step 6b — After-save hook
		if (eventHandlers?.onAfterSave) {
			await eventHandlers.onAfterSave(savedWorkflow);
		}
	} catch (error) {
		if (loadingToast) dismissToast(loadingToast);

		const errorObj = error instanceof Error ? error : new Error('Unknown error occurred');

		// onSaveError hook
		const currentWorkflowForError = getWorkflowStore();
		if (eventHandlers?.onSaveError && currentWorkflowForError) {
			await eventHandlers.onSaveError(errorObj, currentWorkflowForError);
		}

		// onApiError hook — return true suppresses the default toast
		let suppressToast = false;
		if (eventHandlers?.onApiError) {
			suppressToast = eventHandlers.onApiError(errorObj, 'save') === true;
		}

		if (features.showToasts && !suppressToast) {
			apiToasts.error('Save workflow', errorObj.message);
		}

		throw error;
	}
}

/**
 * Export the current workflow as a downloadable JSON file.
 *
 * This is the single source of truth for export logic. App.svelte delegates
 * to this function rather than reimplementing the steps.
 *
 * Preserves all metadata fields (format, tags, etc.) consistently with save.
 */
export async function globalExportWorkflow(options: GlobalExportOptions = {}): Promise<void> {
	const features = { ...DEFAULT_FEATURES, ...options.features };

	try {
		// Flush pending changes before exporting (same discipline as save)
		await flushPendingFormChanges();

		const currentWorkflow = getWorkflowStore();

		if (!currentWorkflow) {
			if (features.showToasts) {
				apiToasts.error('Export workflow', 'No workflow to export');
			}
			return;
		}

		// Build the canonical export object — preserve all metadata fields
		const finalWorkflow: Workflow = {
			id: currentWorkflow.id || 'untitled-workflow',
			name: currentWorkflow.name || 'Untitled Workflow',
			description: currentWorkflow.description || '',
			nodes: currentWorkflow.nodes || [],
			edges: currentWorkflow.edges || [],
			metadata: {
				...currentWorkflow.metadata,
				version: currentWorkflow.metadata?.version || '1.0.0',
				format: currentWorkflow.metadata?.format || DEFAULT_WORKFLOW_FORMAT,
				createdAt: currentWorkflow.metadata?.createdAt || new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}
		};

		// Trigger browser download
		const dataStr = JSON.stringify(finalWorkflow, null, 2);
		const dataBlob = new Blob([dataStr], { type: 'application/json' });
		const url = URL.createObjectURL(dataBlob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `${finalWorkflow.name}.json`;
		link.click();
		URL.revokeObjectURL(url);

		if (features.showToasts) {
			workflowToasts.exported(finalWorkflow.name);
		}
	} catch (error) {
		const errorObj = error instanceof Error ? error : new Error('Unknown error occurred');
		apiToasts.error('Export workflow', errorObj.message);
	}
}
