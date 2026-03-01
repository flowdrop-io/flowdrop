/**
 * Auto-save Service for FlowDrop
 *
 * Handles automatic saving of workflows based on user settings.
 * Uses behaviorSettings for auto-save configuration.
 *
 * @module services/autoSaveService
 */

import { get, type Unsubscriber } from 'svelte/store';
import { behaviorSettings } from '../stores/settingsStore.js';
import { isDirtyStore, isDirty } from '../stores/workflowStore.js';
import { logger } from '../utils/logger.js';

/**
 * Auto-save configuration options
 */
interface AutoSaveOptions {
	/**
	 * Callback function to save the workflow
	 * Should return a promise that resolves when save is complete
	 */
	onSave: () => Promise<void>;
	/**
	 * Optional callback for save errors
	 */
	onError?: (error: Error) => void;
	/**
	 * Optional callback for successful saves
	 */
	onSuccess?: () => void;
}

/**
 * Auto-save manager instance state
 */
interface AutoSaveState {
	/** Interval timer ID */
	intervalId: ReturnType<typeof setInterval> | null;
	/** Whether auto-save is currently in progress */
	isSaving: boolean;
	/** Unsubscriber for settings changes */
	settingsUnsubscriber: Unsubscriber | null;
	/** Unsubscriber for dirty state changes */
	dirtyUnsubscriber: Unsubscriber | null;
}

/**
 * Initialize auto-save functionality based on user settings
 *
 * Creates an interval-based auto-save mechanism that:
 * - Subscribes to behaviorSettings for auto-save configuration
 * - Monitors the isDirtyStore to check for unsaved changes
 * - Calls the provided save callback when dirty and auto-save is enabled
 *
 * @param options - Auto-save configuration options
 * @returns Cleanup function to stop auto-save and unsubscribe from stores
 *
 * @example
 * ```typescript
 * // In App.svelte onMount
 * const cleanupAutoSave = initAutoSave({
 *   onSave: async () => {
 *     await saveWorkflow();
 *   },
 *   onError: (error) => {
 *     console.error("Auto-save failed:", error);
 *   },
 *   onSuccess: () => {
 *     console.log("Auto-saved workflow");
 *   }
 * });
 *
 * // In onDestroy
 * cleanupAutoSave();
 * ```
 */
export function initAutoSave(options: AutoSaveOptions): () => void {
	const { onSave, onError, onSuccess } = options;

	const state: AutoSaveState = {
		intervalId: null,
		isSaving: false,
		settingsUnsubscriber: null,
		dirtyUnsubscriber: null
	};

	/**
	 * Perform auto-save if conditions are met
	 */
	async function performAutoSave(): Promise<void> {
		// Skip if already saving or not dirty
		if (state.isSaving || !isDirty()) {
			return;
		}

		state.isSaving = true;

		try {
			await onSave();
			onSuccess?.();
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			logger.error('Auto-save failed:', err);
			onError?.(err);
		} finally {
			state.isSaving = false;
		}
	}

	/**
	 * Start or restart the auto-save interval based on current settings
	 */
	function updateAutoSaveInterval(): void {
		// Clear existing interval
		if (state.intervalId) {
			clearInterval(state.intervalId);
			state.intervalId = null;
		}

		const settings = get(behaviorSettings);

		// Start new interval if auto-save is enabled
		if (settings.autoSave) {
			state.intervalId = setInterval(() => {
				performAutoSave();
			}, settings.autoSaveInterval);
		}
	}

	// Subscribe to settings changes to react to auto-save toggle/interval changes
	state.settingsUnsubscriber = behaviorSettings.subscribe(() => {
		updateAutoSaveInterval();
	});

	// Initial setup
	updateAutoSaveInterval();

	/**
	 * Cleanup function to stop auto-save and unsubscribe from stores
	 */
	return function cleanup(): void {
		// Clear the interval
		if (state.intervalId) {
			clearInterval(state.intervalId);
			state.intervalId = null;
		}

		// Unsubscribe from stores
		if (state.settingsUnsubscriber) {
			state.settingsUnsubscriber();
			state.settingsUnsubscriber = null;
		}

		if (state.dirtyUnsubscriber) {
			state.dirtyUnsubscriber();
			state.dirtyUnsubscriber = null;
		}
	};
}

/**
 * Create an auto-save manager with more control
 *
 * This is a class-based alternative to initAutoSave for cases where
 * you need more fine-grained control over the auto-save behavior.
 */
export class AutoSaveManager {
	private intervalId: ReturnType<typeof setInterval> | null = null;
	private isSaving = false;
	private settingsUnsubscriber: Unsubscriber | null = null;
	private onSave: () => Promise<void>;
	private onError?: (error: Error) => void;
	private onSuccess?: () => void;

	/**
	 * Create a new AutoSaveManager
	 *
	 * @param options - Auto-save configuration options
	 */
	constructor(options: AutoSaveOptions) {
		this.onSave = options.onSave;
		this.onError = options.onError;
		this.onSuccess = options.onSuccess;
	}

	/**
	 * Start the auto-save manager
	 *
	 * Subscribes to settings changes and starts the auto-save interval.
	 */
	start(): void {
		if (this.settingsUnsubscriber) {
			return; // Already started
		}

		this.settingsUnsubscriber = behaviorSettings.subscribe(() => {
			this.updateInterval();
		});

		this.updateInterval();
	}

	/**
	 * Stop the auto-save manager
	 *
	 * Clears the interval and unsubscribes from settings.
	 */
	stop(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}

		if (this.settingsUnsubscriber) {
			this.settingsUnsubscriber();
			this.settingsUnsubscriber = null;
		}
	}

	/**
	 * Force an immediate save (if dirty)
	 *
	 * @returns Promise that resolves when save is complete
	 */
	async saveNow(): Promise<void> {
		await this.performSave();
	}

	/**
	 * Check if auto-save is currently enabled
	 */
	isEnabled(): boolean {
		return get(behaviorSettings).autoSave;
	}

	/**
	 * Check if auto-save is currently running
	 */
	isRunning(): boolean {
		return this.intervalId !== null;
	}

	/**
	 * Update the interval based on current settings
	 */
	private updateInterval(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}

		const settings = get(behaviorSettings);

		if (settings.autoSave) {
			this.intervalId = setInterval(() => {
				this.performSave();
			}, settings.autoSaveInterval);
		}
	}

	/**
	 * Perform the save operation
	 */
	private async performSave(): Promise<void> {
		if (this.isSaving || !isDirty()) {
			return;
		}

		this.isSaving = true;

		try {
			await this.onSave();
			this.onSuccess?.();
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			logger.error('Auto-save failed:', err);
			this.onError?.(err);
		} finally {
			this.isSaving = false;
		}
	}
}
