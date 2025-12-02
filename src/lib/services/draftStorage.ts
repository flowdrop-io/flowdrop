/**
 * Draft Storage Service for FlowDrop
 *
 * Handles saving and loading workflow drafts to/from localStorage.
 * Provides interval-based auto-save functionality.
 *
 * @module services/draftStorage
 */

import type { Workflow } from "../types/index.js";

/**
 * Default storage key prefix
 */
const STORAGE_KEY_PREFIX = "flowdrop:draft";

/**
 * Draft metadata stored alongside the workflow
 */
interface DraftMetadata {
	/** Timestamp when the draft was saved */
	savedAt: string;
	/** Workflow ID (if available) */
	workflowId?: string;
	/** Workflow name */
	workflowName?: string;
}

/**
 * Complete draft data stored in localStorage
 */
interface StoredDraft {
	/** The workflow data */
	workflow: Workflow;
	/** Draft metadata */
	metadata: DraftMetadata;
}

/**
 * Generate a storage key for a workflow
 *
 * If a custom key is provided, use it directly.
 * Otherwise, generate based on workflow ID or use "new" for unsaved workflows.
 *
 * @param workflowId - The workflow ID (optional)
 * @param customKey - Custom storage key provided by enterprise (optional)
 * @returns The storage key to use
 */
export function getDraftStorageKey(workflowId?: string, customKey?: string): string {
	if (customKey) {
		return customKey;
	}

	if (workflowId) {
		return `${STORAGE_KEY_PREFIX}:${workflowId}`;
	}

	return `${STORAGE_KEY_PREFIX}:new`;
}

/**
 * Save a workflow draft to localStorage
 *
 * @param workflow - The workflow to save
 * @param storageKey - The storage key to use
 * @returns true if saved successfully, false otherwise
 */
export function saveDraft(workflow: Workflow, storageKey: string): boolean {
	try {
		const draft: StoredDraft = {
			workflow,
			metadata: {
				savedAt: new Date().toISOString(),
				workflowId: workflow.id,
				workflowName: workflow.name
			}
		};

		localStorage.setItem(storageKey, JSON.stringify(draft));
		return true;
	} catch (error) {
		// localStorage might be full or disabled
		console.warn("Failed to save draft to localStorage:", error);
		return false;
	}
}

/**
 * Load a workflow draft from localStorage
 *
 * @param storageKey - The storage key to load from
 * @returns The stored draft, or null if not found
 */
export function loadDraft(storageKey: string): StoredDraft | null {
	try {
		const stored = localStorage.getItem(storageKey);
		if (!stored) {
			return null;
		}

		const draft = JSON.parse(stored) as StoredDraft;

		// Validate the draft structure
		if (!draft.workflow || !draft.metadata) {
			console.warn("Invalid draft structure in localStorage");
			return null;
		}

		return draft;
	} catch (error) {
		console.warn("Failed to load draft from localStorage:", error);
		return null;
	}
}

/**
 * Delete a workflow draft from localStorage
 *
 * @param storageKey - The storage key to delete
 */
export function deleteDraft(storageKey: string): void {
	try {
		localStorage.removeItem(storageKey);
	} catch (error) {
		console.warn("Failed to delete draft from localStorage:", error);
	}
}

/**
 * Check if a draft exists for a given storage key
 *
 * @param storageKey - The storage key to check
 * @returns true if a draft exists
 */
export function hasDraft(storageKey: string): boolean {
	try {
		return localStorage.getItem(storageKey) !== null;
	} catch {
		return false;
	}
}

/**
 * Get draft metadata without loading the full workflow
 *
 * Useful for displaying draft information without parsing the entire workflow.
 *
 * @param storageKey - The storage key to check
 * @returns Draft metadata, or null if not found
 */
export function getDraftMetadata(storageKey: string): DraftMetadata | null {
	const draft = loadDraft(storageKey);
	return draft?.metadata ?? null;
}

/**
 * Draft auto-save manager
 *
 * Handles interval-based auto-saving of workflow drafts.
 * Should be instantiated per FlowDrop instance.
 */
export class DraftAutoSaveManager {
	/** Interval timer ID */
	private intervalId: ReturnType<typeof setInterval> | null = null;

	/** Storage key for drafts */
	private storageKey: string;

	/** Auto-save interval in milliseconds */
	private interval: number;

	/** Whether auto-save is enabled */
	private enabled: boolean;

	/** Function to get current workflow */
	private getWorkflow: () => Workflow | null;

	/** Function to check if workflow is dirty */
	private isDirty: () => boolean;

	/** Last saved workflow hash (for change detection) */
	private lastSavedHash: string | null = null;

	/**
	 * Create a new DraftAutoSaveManager
	 *
	 * @param options - Configuration options
	 */
	constructor(options: {
		storageKey: string;
		interval: number;
		enabled: boolean;
		getWorkflow: () => Workflow | null;
		isDirty: () => boolean;
	}) {
		this.storageKey = options.storageKey;
		this.interval = options.interval;
		this.enabled = options.enabled;
		this.getWorkflow = options.getWorkflow;
		this.isDirty = options.isDirty;
	}

	/**
	 * Start auto-save interval
	 *
	 * Will save drafts at the configured interval if there are unsaved changes.
	 */
	start(): void {
		if (!this.enabled || this.intervalId) {
			return;
		}

		this.intervalId = setInterval(() => {
			this.saveIfDirty();
		}, this.interval);
	}

	/**
	 * Stop auto-save interval
	 */
	stop(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}

	/**
	 * Save draft if there are unsaved changes
	 *
	 * @returns true if a draft was saved
	 */
	saveIfDirty(): boolean {
		if (!this.enabled) {
			return false;
		}

		const workflow = this.getWorkflow();
		if (!workflow) {
			return false;
		}

		// Only save if dirty
		if (!this.isDirty()) {
			return false;
		}

		// Check if workflow has actually changed since last save
		const currentHash = this.hashWorkflow(workflow);
		if (currentHash === this.lastSavedHash) {
			return false;
		}

		const saved = saveDraft(workflow, this.storageKey);
		if (saved) {
			this.lastSavedHash = currentHash;
		}

		return saved;
	}

	/**
	 * Force save the current workflow as a draft
	 *
	 * Saves regardless of dirty state.
	 *
	 * @returns true if saved successfully
	 */
	forceSave(): boolean {
		const workflow = this.getWorkflow();
		if (!workflow) {
			return false;
		}

		const saved = saveDraft(workflow, this.storageKey);
		if (saved) {
			this.lastSavedHash = this.hashWorkflow(workflow);
		}

		return saved;
	}

	/**
	 * Clear the draft from storage
	 */
	clearDraft(): void {
		deleteDraft(this.storageKey);
		this.lastSavedHash = null;
	}

	/**
	 * Mark the current state as saved
	 *
	 * Updates the hash so the next saveIfDirty won't save unless there are new changes.
	 */
	markAsSaved(): void {
		const workflow = this.getWorkflow();
		if (workflow) {
			this.lastSavedHash = this.hashWorkflow(workflow);
		}
	}

	/**
	 * Update the storage key
	 *
	 * Useful when the workflow ID changes (e.g., after first save).
	 *
	 * @param newKey - The new storage key
	 */
	updateStorageKey(newKey: string): void {
		// If there's an existing draft with the old key, migrate it
		const existingDraft = loadDraft(this.storageKey);
		if (existingDraft && this.storageKey !== newKey) {
			deleteDraft(this.storageKey);
			saveDraft(existingDraft.workflow, newKey);
		}

		this.storageKey = newKey;
	}

	/**
	 * Simple hash function for change detection
	 *
	 * Not cryptographically secure, just for detecting changes.
	 *
	 * @param workflow - The workflow to hash
	 * @returns A simple hash string
	 */
	private hashWorkflow(workflow: Workflow): string {
		// Use a simple stringification for change detection
		// We only need nodes, edges, name, and description for change detection
		const toHash = {
			name: workflow.name,
			description: workflow.description,
			nodes: workflow.nodes.map((n) => ({
				id: n.id,
				position: n.position,
				data: n.data
			})),
			edges: workflow.edges.map((e) => ({
				id: e.id,
				source: e.source,
				target: e.target,
				sourceHandle: e.sourceHandle,
				targetHandle: e.targetHandle
			}))
		};

		return JSON.stringify(toHash);
	}

	/**
	 * Check if auto-save is currently running
	 */
	isRunning(): boolean {
		return this.intervalId !== null;
	}

	/**
	 * Get the current storage key
	 */
	getStorageKey(): string {
		return this.storageKey;
	}
}

