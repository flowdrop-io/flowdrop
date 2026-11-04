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
import { getDefaultInstance, type FlowDropInstance } from '$lib/stores/instanceContainer.svelte.js';
import { createEndpointConfig } from '$lib/config/endpoints.js';
import { v4 as uuidv4 } from 'uuid';
import type { Workflow } from '$lib/types/index.js';
import { DEFAULT_WORKFLOW_FORMAT } from '$lib/types/index.js';
import { stripExecutionInfo } from '$lib/utils/nodeStatus.js';
import { playgroundForSave } from '$lib/utils/playgroundChat.js';
import { buildSaveBody } from '$lib/utils/workflowDraft.js';
import type { ApiError } from '$lib/api/enhanced-client.js';
import { apiToasts, workflowToasts, dismissToast, showInfo } from './toastService.js';
import { checkImpact, impactSupported } from './impactService.js';
import { confirmImpact, impactPending } from './impactGate.js';
import { scopeSelector } from '$lib/themes/scopedSkinCss.js';
import type { FlowDropEventHandlers, FlowDropFeatures } from '$lib/types/events.js';
import { DEFAULT_FEATURES } from '$lib/types/events.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Options accepted by globalSaveWorkflow().
 * All fields are optional — omitting them falls back to the basic behaviour
 * (no event handlers, always show toasts).
 */
export interface GlobalSaveOptions {
  /** Event handler hooks (onBeforeSave, onAfterSave, onSaveError, onApiError). */
  eventHandlers?: FlowDropEventHandlers;
  /** Feature flags (showToasts). Defaults to DEFAULT_FEATURES. */
  features?: Partial<FlowDropFeatures>;
  /**
   * Callback invoked after a successful save to clear the dirty state.
   * Pass workflowStore's markAsSaved here when calling from App.svelte.
   * Receives the `editVersion` read when the saved snapshot was taken: pass it
   * on, so an edit made while the save was in flight stays dirty.
   */
  onMarkAsSaved?: (version: number) => void;
  /**
   * Callback invoked after a successful save with the persisted workflow.
   * Receives the server-returned workflow (which may have a different ID than
   * the one sent, e.g. server-assigned integer vs client UUID).
   * Use this to update draft storage keys or other ID-dependent state.
   */
  onSaved?: (savedWorkflow: Workflow) => void;
  /**
   * The FlowDrop instance whose workflow should be saved.
   * Defaults to the page-default instance when omitted.
   */
  instance?: FlowDropInstance;
  /**
   * Whether the save may ask the person a question (the impact dialog).
   * Default `true`. Autosave passes `false`: a save that needs an answer is not
   * made, returns `false` and the workflow stays dirty.
   */
  interactive?: boolean;
}

/**
 * Options accepted by globalExportWorkflow().
 */
export interface GlobalExportOptions {
  /** Feature flags (showToasts). Defaults to DEFAULT_FEATURES. */
  features?: Partial<FlowDropFeatures>;
  /**
   * The FlowDrop instance whose workflow should be exported.
   * Defaults to the page-default instance when omitted.
   */
  instance?: FlowDropInstance;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Ensure the instance's API context is configured.
 * This is needed when the global save function is called from the layout
 * component which doesn't initialize the API configuration like <App> does.
 */
function ensureApiConfiguration(fd: FlowDropInstance): void {
  if (fd.api.isConfigured() && fd.api.config?.baseUrl) {
    return;
  }

  // API configuration is not initialized — derive URL from window.location when available
  const apiBaseUrl =
    typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.host}/api/flowdrop`
      : '/api/flowdrop';

  const config = createEndpointConfig(apiBaseUrl, {
    timeout: 10000,
    retry: {
      enabled: true,
      maxAttempts: 2,
      delay: 1000,
      backoff: 'exponential'
    }
  });

  fd.api.configure(config);
}

/** The error when a save was refused because the workflow changed on the server meanwhile. */
function isSaveConflict(error: unknown): ApiError | null {
  const e = error as Partial<ApiError> | null;
  return e?.status === 409 && e.errorData?.error_code === 'CONFLICT' ? (error as ApiError) : null;
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

/** The save running now, per instance: a second call joins it. */
const inFlight = new WeakMap<
  FlowDropInstance,
  { promise: Promise<boolean>; interactive: boolean }
>();

/** The editVersion at which a non-interactive save was last refused for needing an answer. */
const autosaveRefusedAt = new WeakMap<FlowDropInstance, number>();

/** Stable toast id so the autosave notice never stacks. */
function autosaveToastId(fd: FlowDropInstance): string {
  return `flowdrop:autosave-waiting:${fd.skinScope ?? ''}`;
}

/**
 * Save the current workflow to the backend.
 *
 * This is the single source of truth for save logic. App.svelte delegates
 * to this function rather than reimplementing the steps.
 *
 * Joining: a call made while a save of the same instance is in flight (double
 * Cmd+S, autosave plus a manual save) returns that save's promise instead of
 * starting another, which would send the superseded revision and be refused as
 * a conflict. Edits made meanwhile stay dirty and go with the next save.
 *
 * Steps performed:
 *  0. Join a save already in flight, or drop the call while the impact question is open
 *  1. Flush pending form changes (blur active element + tick)
 *  2. Build the canonical Workflow object (preserving metadata, format, etc.)
 *     and note the edit version it was taken at
 *  3. Ask the backend what the save changes for the workflow's users; ask the
 *     person when something breaks or changes (autosave does not ask: it waits
 *     for a person, and says so once)
 *  4. Optionally call onBeforeSave — return false cancels the save
 *  5. Persist via the instance's API client (fd.api.client)
 *  6. Update the store if the server assigned a new ID
 *  7. Call onMarkAsSaved (up to the version noted in step 2) / onAfterSave hooks
 *  8. Show toast notifications (respecting features.showToasts)
 *
 * Resolves `true` when the workflow was written, `false` when nothing was
 * saved because there was no workflow, `onBeforeSave` cancelled or the person
 * cancelled the impact question. A failed
 * request throws. Callers that relay the outcome (the WebMCP `save` tool)
 * must not read a quiet return as a save.
 */
export function globalSaveWorkflow(options: GlobalSaveOptions = {}): Promise<boolean> {
  const fd = options.instance ?? getDefaultInstance();
  const running = inFlight.get(fd);
  if (running) {
    // A person's save that lands on an autosave waits for it, then asks itself
    // when the autosave did not write (it never asks the impact question).
    if (options.interactive === false || running.interactive) return running.promise;
    return running.promise.then((saved) =>
      saved && !fd.workflow.isDirty ? true : globalSaveWorkflow(options)
    );
  }
  const promise = runSave(fd, options).finally(() => {
    if (inFlight.get(fd)?.promise === promise) inFlight.delete(fd);
  });
  inFlight.set(fd, { promise, interactive: options.interactive !== false });
  return promise;
}

async function runSave(fd: FlowDropInstance, options: GlobalSaveOptions): Promise<boolean> {
  const { eventHandlers, onMarkAsSaved, onSaved } = options;
  const features = { ...DEFAULT_FEATURES, ...options.features };
  const readWorkflow = () => fd.workflow.current;

  // A save while the impact question is open is dropped, not queued: the open
  // dialog is the one answer. Checked before the flush, which would blur its
  // focused button.
  if (impactPending(fd)) return false;

  // Flush pending form changes (single location for this logic)
  await flushPendingFormChanges();

  // Get current workflow from the instance's store after flush
  const currentWorkflow = readWorkflow();

  if (!currentWorkflow) {
    if (features.showToasts) {
      apiToasts.error('Save workflow', 'No workflow to save');
    }
    return false;
  }

  // Autosave already declined this very version: nothing changed, so asking
  // the backend again would only repeat the refusal.
  const interactive = options.interactive !== false;
  if (!interactive && autosaveRefusedAt.get(fd) === fd.workflow.editVersion) return false;

  let loadingToast: string | null = null;

  try {
    // Ensure API configuration is initialised (needed when called outside App.svelte)
    ensureApiConfiguration(fd);

    // Build the canonical workflow object.
    // Preserve all existing metadata fields (format, tags, etc.) so nothing is dropped.
    //
    // Determine new vs existing BEFORE the uuidv4() fallback: if the store already
    // has an id (any format — integer, UUID, slug), the workflow came from a backend
    // and must be updated. Only a missing id means "truly new".
    const isExistingWorkflow = !!currentWorkflow.id;
    const workflowId = currentWorkflow.id || uuidv4();

    const finalWorkflow: Workflow = buildSaveBody(currentWorkflow, workflowId);
    // What this snapshot contains: only up to here may be marked saved.
    let savedVersion = fd.workflow.editVersion;

    // Ask what this save changes for what uses the workflow. A backend
    // without the route (or that does not know the workflow) leaves the save
    // unasked; a failed check is shown and the person decides.
    const apiConfig = fd.api.config;
    if (isExistingWorkflow && apiConfig && impactSupported(apiConfig)) {
      const result = await checkImpact(
        apiConfig,
        fd.api.authProvider,
        finalWorkflow.id,
        finalWorkflow
      );
      // This instance's editor (a page may hold several), for the dialog's skin.
      const host =
        (fd.skinScope ? document.querySelector<HTMLElement>(scopeSelector(fd.skinScope)) : null) ??
        document.body;
      const needsAnswer =
        (result.status === 'ok' && result.report.confirm) || result.status === 'error';
      if (needsAnswer) {
        if (!interactive) {
          // Say so once per version, then stay quiet until something changes.
          if (autosaveRefusedAt.get(fd) !== savedVersion && features.showToasts) {
            showInfo(fd.messages().autoSave.waiting, { id: autosaveToastId(fd) });
          }
          autosaveRefusedAt.set(fd, savedVersion);
          return false;
        }
        const answer = await confirmImpact({
          report: result.status === 'ok' ? result.report : undefined,
          error: result.status === 'error' ? result.message : undefined,
          host,
          instance: fd,
          messages: fd.messages
        });
        if (!answer) return false;
      }
    }

    // Allow the parent to cancel the save (after the impact question, so a
    // cancelled question leaves no onBeforeSave without an outcome hook).
    if (eventHandlers?.onBeforeSave) {
      const shouldContinue = await eventHandlers.onBeforeSave(currentWorkflow);
      if (shouldContinue === false) {
        return false;
      }
    }

    loadingToast = features.showToasts ? apiToasts.loading('Saving workflow') : null;

    // Persist via this instance's API client.
    // id-presence (computed above) decides update vs create — never UUID-regex.
    const apiClient = fd.api.client;
    const savedWorkflow: Workflow = isExistingWorkflow
      ? await apiClient.updateWorkflow(finalWorkflow.id, finalWorkflow)
      : await apiClient.saveWorkflow(finalWorkflow);

    // If the server assigned a new ID, sync the store
    if (savedWorkflow.id && savedWorkflow.id !== finalWorkflow.id) {
      // The sync bumps editVersion itself; it counts as saved, but only when
      // nothing else changed the workflow before it.
      const cleanBeforeSync = fd.workflow.editVersion === savedVersion;
      fd.workflow.batchUpdate({
        nodes: finalWorkflow.nodes,
        edges: finalWorkflow.edges,
        name: finalWorkflow.name,
        metadata: {
          ...finalWorkflow.metadata,
          ...savedWorkflow.metadata
        }
      });
      if (cleanBeforeSync) savedVersion = fd.workflow.editVersion;
    }

    // The save minted a new revision (and may have refreshed what the
    // user may do); take the server's word so the next save sends the current
    // stamp rather than the one this save just superseded.
    fd.workflow.acknowledgeServer({ revision: savedWorkflow.revision, can: savedWorkflow.can });

    // Mark dirty state as clean
    if (onMarkAsSaved) {
      onMarkAsSaved(savedVersion);
    } else {
      fd.workflow.markAsSaved(savedVersion);
    }
    autosaveRefusedAt.delete(fd);
    dismissToast(autosaveToastId(fd));

    // A conversation open in the editor's Playground marks the new version.
    // Not awaited: it asks the server which version this save made.
    void fd.runs.noteWorkflowSaved();

    // Notify caller with the definitive saved workflow (server-assigned ID)
    if (onSaved) {
      onSaved(savedWorkflow);
    }

    // Show success toast
    if (loadingToast) dismissToast(loadingToast);
    if (features.showToasts) {
      workflowToasts.saved(finalWorkflow.name);
    }

    // After-save hook
    if (eventHandlers?.onAfterSave) {
      await eventHandlers.onAfterSave(savedWorkflow);
    }
    return true;
  } catch (error) {
    if (loadingToast) dismissToast(loadingToast);

    const errorObj = error instanceof Error ? error : new Error('Unknown error occurred');

    // onSaveError hook
    const currentWorkflowForError = readWorkflow();
    if (eventHandlers?.onSaveError && currentWorkflowForError) {
      await eventHandlers.onSaveError(errorObj, currentWorkflowForError);
    }

    // onApiError hook — return true suppresses the default toast
    let suppressToast = false;
    if (eventHandlers?.onApiError) {
      suppressToast = eventHandlers.onApiError(errorObj, 'save') === true;
    }

    // Someone else saved first: offer Keep mine / Load saved version / Compare
    // instead of the generic error. Other 409s (a taken id) keep the normal toast.
    // The choices are reported even when toasts are off, only the toast is not.
    const conflict = isSaveConflict(error);
    if (conflict) {
      const details = conflict.errorData.details as { current?: unknown } | undefined;
      const current = details?.current;
      fd.saveConflict.report(
        {
          currentRevision:
            current === undefined || current === null || current === '' ? null : String(current),
          retry: () => globalSaveWorkflow(options)
        },
        features.showToasts && !suppressToast
      );
    } else if (features.showToasts && !suppressToast) {
      // The error object, not its message: an ApiError carries the server's
      // reasons as `details`, and the toast renders them as a list.
      // "Show problems" opens the navbar's problems popover, when there are
      // problems to show: a failed save is often a draft the Doctor already flags.
      apiToasts.error(
        'Save workflow',
        errorObj,
        fd.doctor.canOpen
          ? { label: 'Show problems', onClick: () => void fd.doctor.requestOpen() }
          : undefined
      );
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

    const fd = options.instance ?? getDefaultInstance();
    const currentWorkflow = fd.workflow.current;

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
      nodes: stripExecutionInfo(currentWorkflow.nodes || []),
      edges: currentWorkflow.edges || [],
      metadata: {
        ...currentWorkflow.metadata,
        schemaVersion: currentWorkflow.metadata?.schemaVersion || '1.0.0',
        format: currentWorkflow.metadata?.format || DEFAULT_WORKFLOW_FORMAT,
        createdAt: currentWorkflow.metadata?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      // Same rule as the save path: the export must carry the declared
      // contract, or a re-import round-trip loses `interface`.
      ...(currentWorkflow.interface !== undefined && { interface: currentWorkflow.interface }),
      ...(currentWorkflow.playground !== undefined && {
        playground: playgroundForSave(currentWorkflow.playground)
      })
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
