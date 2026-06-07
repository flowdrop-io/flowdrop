/**
 * Draft Storage Service for FlowDrop
 *
 * Handles saving and loading workflow drafts to/from browser storage
 * (localStorage by default, configurable via {@link setDraftStorage}).
 * Provides interval-based auto-save functionality.
 *
 * @module services/draftStorage
 */

import type { Workflow } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Default storage key prefix
 */
const STORAGE_KEY_PREFIX = 'flowdrop:draft';

// =========================================================================
// Storage Adapter
// =========================================================================

/**
 * Minimal storage adapter used for draft persistence.
 *
 * Implement this to back drafts with anything other than the built-in
 * `localStorage` / `sessionStorage` options — e.g. an in-memory store, a
 * key-prefixed wrapper, or a synchronous write-through cache.
 *
 * Note the interface is deliberately **synchronous**. Async backends
 * (IndexedDB, network storage, WebCrypto-encrypted stores) cannot implement
 * it directly — put a synchronous in-memory cache in front and flush to the
 * async backend out of band. An `async` method assigned here will type-check
 * (a Promise is assignable to `void`) but its errors are silently swallowed.
 */
export interface DraftStorageAdapter {
  /** Read a value, or null when absent */
  getItem(key: string): string | null;
  /** Write a value */
  setItem(key: string, value: string): void;
  /** Remove a value */
  removeItem(key: string): void;
  /** List all keys currently held by the adapter */
  keys(): string[];
}

/**
 * Built-in storage backends
 * - 'local': localStorage — drafts persist on the device even after the tab
 *   or browser is closed, until saved or cleared
 * - 'session': sessionStorage — drafts are scoped to the tab and removed
 *   when it closes (they do not survive crash-and-reopen)
 */
export type DraftStorageType = 'local' | 'session';

/** Accepted values for the `draftStorage` mount option */
export type DraftStorageOption = DraftStorageType | DraftStorageAdapter;

/**
 * Wrap a Web Storage object (localStorage/sessionStorage) as a DraftStorageAdapter.
 * The storage global is resolved lazily so SSR and test environments that
 * replace the globals keep working.
 */
function createWebStorageAdapter(getStorage: () => Storage): DraftStorageAdapter {
  return {
    getItem: (key) => getStorage().getItem(key),
    setItem: (key, value) => getStorage().setItem(key, value),
    removeItem: (key) => getStorage().removeItem(key),
    keys: () => {
      const storage = getStorage();
      const keys: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key !== null) {
          keys.push(key);
        }
      }
      return keys;
    }
  };
}

const WEB_STORAGE_ADAPTERS: Record<DraftStorageType, DraftStorageAdapter> = {
  local: createWebStorageAdapter(() => localStorage),
  session: createWebStorageAdapter(() => sessionStorage)
};

/**
 * Module-level default adapter (localStorage by default).
 *
 * Used by the standalone helpers (`saveDraft`, `clearAllDrafts`, ...) when no
 * explicit adapter is passed, and as the fallback for managers constructed
 * without a `storage` option. Per-instance code (each `DraftAutoSaveManager`,
 * each mounted app) captures its own resolved adapter instead, so multiple
 * FlowDrop instances with different backends do not interfere.
 */
let activeAdapter: DraftStorageAdapter = WEB_STORAGE_ADAPTERS.local;

/**
 * Resolve a {@link DraftStorageOption} to a concrete adapter.
 *
 * `'local'` / `'session'` map to the built-in Web Storage adapters, a custom
 * adapter is returned as-is, and `undefined` resolves to the current
 * module-level default (see {@link setDraftStorage}).
 */
export function resolveDraftStorage(option?: DraftStorageOption): DraftStorageAdapter {
  if (option === undefined) {
    return activeAdapter;
  }
  return typeof option === 'string' ? WEB_STORAGE_ADAPTERS[option] : option;
}

/**
 * Configure the module-level default for where workflow drafts are persisted.
 *
 * - `'local'` (default): `localStorage` — drafts survive reloads and browser
 *   restarts, and remain stored on the device even after the tab is closed,
 *   until saved or cleared.
 * - `'session'`: `sessionStorage` — drafts are scoped to the current tab and
 *   removed when it closes. Note this also means drafts do not survive a
 *   crash-and-reopen.
 * - A custom {@link DraftStorageAdapter} for anything else.
 *
 * This sets the default used by the standalone helpers and by managers
 * constructed without an explicit `storage` option. Mounted apps capture
 * their own adapter at mount time, so calling this does not retarget
 * already-running instances. With multiple mounts the most recent mount's
 * backend wins *for the standalone helpers only*.
 *
 * Security note: neither built-in backend protects against same-origin
 * script access (XSS) — both are readable by any script on the page. If
 * workflows may contain secrets in node configs, disable drafts via
 * `features.autoSaveDraft: false` or keep them off-disk with a custom
 * in-memory adapter.
 */
export function setDraftStorage(option: DraftStorageOption): void {
  activeAdapter = resolveDraftStorage(option);
}

/**
 * Get the current module-level default draft storage adapter
 */
export function getDraftStorage(): DraftStorageAdapter {
  return activeAdapter;
}

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
 * Complete draft data stored in draft storage
 */
interface StoredDraft {
  /** The workflow data */
  workflow: Workflow;
  /** Draft metadata */
  metadata: DraftMetadata;
}

/**
 * Storage prefix of the page-default instance (`flowdrop:draft:default`).
 *
 * Every instance — including the default — uses an id-scoped prefix since
 * v2.0. Standalone helper callers that don't pass a prefix get this one, so
 * they keep addressing the default editor's drafts.
 */
export const DEFAULT_INSTANCE_DRAFT_PREFIX = `${STORAGE_KEY_PREFIX}:default`;

/**
 * Generate a storage key for a workflow
 *
 * If a custom key is provided, use it directly.
 * Otherwise, generate based on workflow ID or use "new" for unsaved workflows.
 *
 * @param workflowId - The workflow ID (optional)
 * @param customKey - Custom storage key provided by enterprise (optional)
 * @param prefix - Key namespace; pass a FlowDrop instance's `storagePrefix`
 *   to scope drafts per instance. Defaults to the page-default instance's
 *   prefix.
 * @returns The storage key to use
 */
export function getDraftStorageKey(
  workflowId?: string,
  customKey?: string,
  prefix: string = DEFAULT_INSTANCE_DRAFT_PREFIX
): string {
  if (customKey) {
    return customKey;
  }

  if (workflowId) {
    return `${prefix}:${workflowId}`;
  }

  return `${prefix}:new`;
}

/**
 * One-time migration of a 1.x draft key to its 2.0 scoped equivalent.
 *
 * In 1.x the page-default instance stored drafts under the bare
 * `flowdrop:draft:<workflowId>` key; since 2.0 it uses
 * `flowdrop:draft:default:<workflowId>`. When the scoped key is empty and the
 * legacy key holds a draft, the draft is moved (copied, then the legacy key
 * removed) so users upgrading mid-edit don't lose work.
 *
 * @param legacyKey - The 1.x bare-prefix key
 * @param scopedKey - The 2.0 instance-scoped key
 * @param storage - Adapter to migrate within (defaults to the module-level default)
 */
export function migrateLegacyDraftKey(
  legacyKey: string,
  scopedKey: string,
  storage: DraftStorageAdapter = activeAdapter
): void {
  if (legacyKey === scopedKey) return;
  try {
    if (storage.getItem(scopedKey) !== null) return;
    const legacy = storage.getItem(legacyKey);
    if (legacy === null) return;
    storage.setItem(scopedKey, legacy);
    storage.removeItem(legacyKey);
  } catch (error) {
    logger.warn('Failed to migrate legacy draft key:', error);
  }
}

/**
 * Save a workflow draft to draft storage
 *
 * @param workflow - The workflow to save
 * @param storageKey - The storage key to use
 * @param storage - Adapter to write to (defaults to the module-level default)
 * @returns true if saved successfully, false otherwise
 */
export function saveDraft(
  workflow: Workflow,
  storageKey: string,
  storage: DraftStorageAdapter = activeAdapter
): boolean {
  try {
    const draft: StoredDraft = {
      workflow,
      metadata: {
        savedAt: new Date().toISOString(),
        workflowId: workflow.id,
        workflowName: workflow.name
      }
    };

    storage.setItem(storageKey, JSON.stringify(draft));
    return true;
  } catch (error) {
    // Storage might be full or disabled
    logger.warn('Failed to save draft to storage:', error);
    return false;
  }
}

/**
 * Load a workflow draft from draft storage
 *
 * @param storageKey - The storage key to load from
 * @param storage - Adapter to read from (defaults to the module-level default)
 * @returns The stored draft, or null if not found
 */
export function loadDraft(
  storageKey: string,
  storage: DraftStorageAdapter = activeAdapter
): StoredDraft | null {
  try {
    const stored = storage.getItem(storageKey);
    if (!stored) {
      return null;
    }

    const draft = JSON.parse(stored) as StoredDraft;

    // Validate the draft structure
    if (!draft.workflow || !draft.metadata) {
      logger.warn('Invalid draft structure in storage');
      return null;
    }

    return draft;
  } catch (error) {
    logger.warn('Failed to load draft from storage:', error);
    return null;
  }
}

/**
 * Delete a workflow draft from draft storage
 *
 * @param storageKey - The storage key to delete
 * @param storage - Adapter to delete from (defaults to the module-level default)
 */
export function deleteDraft(
  storageKey: string,
  storage: DraftStorageAdapter = activeAdapter
): void {
  try {
    storage.removeItem(storageKey);
  } catch (error) {
    logger.warn('Failed to delete draft from storage:', error);
  }
}

/**
 * Check if a draft exists for a given storage key
 *
 * @param storageKey - The storage key to check
 * @param storage - Adapter to check (defaults to the module-level default)
 * @returns true if a draft exists
 */
export function hasDraft(
  storageKey: string,
  storage: DraftStorageAdapter = activeAdapter
): boolean {
  try {
    return storage.getItem(storageKey) !== null;
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
 * @param storage - Adapter to read from (defaults to the module-level default)
 * @returns Draft metadata, or null if not found
 */
export function getDraftMetadata(
  storageKey: string,
  storage: DraftStorageAdapter = activeAdapter
): DraftMetadata | null {
  const draft = loadDraft(storageKey, storage);
  return draft?.metadata ?? null;
}

/**
 * Clear all FlowDrop drafts from draft storage
 *
 * Removes every key beginning with `flowdrop:draft:`. Intended to be called
 * from a host application's logout handler so workflow drafts do not persist
 * across user sessions on shared devices.
 *
 * @param extraKeys - Additional explicit keys to remove. Pass any custom
 *   `draftStorageKey` values configured at mount time so they are cleared
 *   alongside the default-prefixed keys.
 * @param storage - Adapter to clear (defaults to the module-level default)
 * @returns The number of entries removed.
 */
export function clearAllDrafts(
  extraKeys: readonly string[] = [],
  storage: DraftStorageAdapter = activeAdapter
): number {
  try {
    const keysToRemove = new Set<string>();

    for (const key of storage.keys()) {
      if (key.startsWith(`${STORAGE_KEY_PREFIX}:`)) {
        keysToRemove.add(key);
      }
    }

    for (const key of extraKeys) {
      if (storage.getItem(key) !== null) {
        keysToRemove.add(key);
      }
    }

    for (const key of keysToRemove) {
      storage.removeItem(key);
    }

    return keysToRemove.size;
  } catch (error) {
    logger.warn('Failed to clear drafts from storage:', error);
    return 0;
  }
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

  /**
   * Runtime gate for draft persistence (e.g. a user-facing opt-out setting).
   * Checked on every save, so it can change after construction.
   */
  private isPersistenceAllowed: () => boolean;

  /**
   * Storage adapter this instance writes to.
   * Captured at construction, so a later `setDraftStorage()` call (e.g. from
   * another FlowDrop mount on the same page) cannot retarget this manager.
   */
  private storage: DraftStorageAdapter;

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
    /** Optional runtime gate — return false to suppress draft writes (default: always allowed) */
    isPersistenceAllowed?: () => boolean;
    /** Storage backend for this instance (default: the module-level default at construction time) */
    storage?: DraftStorageOption;
  }) {
    this.storageKey = options.storageKey;
    this.interval = options.interval;
    this.enabled = options.enabled;
    this.getWorkflow = options.getWorkflow;
    this.isDirty = options.isDirty;
    this.isPersistenceAllowed = options.isPersistenceAllowed ?? (() => true);
    this.storage = resolveDraftStorage(options.storage);
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
    if (!this.enabled || !this.isPersistenceAllowed()) {
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

    const saved = saveDraft(workflow, this.storageKey, this.storage);
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
    if (!this.isPersistenceAllowed()) {
      return false;
    }

    const workflow = this.getWorkflow();
    if (!workflow) {
      return false;
    }

    const saved = saveDraft(workflow, this.storageKey, this.storage);
    if (saved) {
      this.lastSavedHash = this.hashWorkflow(workflow);
    }

    return saved;
  }

  /**
   * Clear the draft from storage
   */
  clearDraft(): void {
    deleteDraft(this.storageKey, this.storage);
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
    const existingDraft = loadDraft(this.storageKey, this.storage);
    if (existingDraft && this.storageKey !== newKey) {
      deleteDraft(this.storageKey, this.storage);
      // Migration is still a write — respect the user's opt-out. The old
      // draft is deleted either way, which is in line with opting out.
      if (this.isPersistenceAllowed()) {
        saveDraft(existingDraft.workflow, newKey, this.storage);
      }
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
