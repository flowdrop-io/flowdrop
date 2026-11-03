/**
 * Save Conflict Store
 *
 * One editor's answer to a save the server refused because someone else saved
 * the workflow first (409 CONFLICT). It offers three ways out in a toast:
 * keep mine (send again on top of the newer version), load the saved version (take the
 * saved version) and compare (see what differs before choosing).
 *
 * @module stores/saveConflictStore
 */

import type { Workflow } from '../types/index.js';
import type { Messages } from '../messages/index.js';
import { compareWorkflows, type WorkflowComparison } from '../utils/workflowCompare.js';
import { apiToasts, dismissToast, showError } from '../services/toastService.js';
import type { WorkflowStore } from './workflowStore.svelte.js';

/** What a refused save hands over. */
export interface SaveConflictReport {
  /** The revision the server holds now, or `null` when the refusal did not say. */
  currentRevision: string | null;
  /** Sends the same save again; resolves true when it wrote. */
  retry: () => Promise<boolean>;
}

/** What the store needs from the editor. */
export interface SaveConflictDeps {
  workflow: Pick<WorkflowStore, 'current' | 'initialize' | 'acknowledgeServer'>;
  /** Loads the saved version of a workflow. */
  loadWorkflow: (id: string) => Promise<Workflow>;
  /** Asks the Doctor to check the editor's workflow again. */
  schedule: () => void;
  messages: () => Messages;
}

const TOAST_ID = 'flowdrop:save-conflict';

export class SaveConflictStore {
  readonly #deps: SaveConflictDeps;
  #pending: SaveConflictReport | null = null;

  /** The saved version, once loaded for Compare or Load saved version. */
  theirs = $state<Workflow | null>(null);
  /** The differences shown by the compare dialog. */
  comparison = $state<WorkflowComparison | null>(null);

  constructor(deps: SaveConflictDeps) {
    this.#deps = deps;
  }

  /** True while the compare dialog is wanted. */
  get comparing(): boolean {
    return this.comparison !== null;
  }

  /**
   * Remember the refused save and offer the three choices in a toast that
   * stays until closed. With `showToast` false the choices stay available to
   * code (keepMine, loadTheirs, compare) but nothing is shown.
   */
  report(args: SaveConflictReport, showToast = true): void {
    this.#pending = args;
    if (!showToast) return;
    const messages = this.#deps.messages();
    showError(
      {
        title: messages.saveConflict.title,
        body: messages.saveConflict.body,
        actions: [
          {
            label: messages.compare.keepMine,
            primary: true,
            onClick: () => void this.keepMine()
          },
          { label: messages.compare.loadTheirs, onClick: () => void this.loadTheirs() },
          { label: messages.saveConflict.compare, onClick: () => void this.compare() }
        ]
      },
      { id: TOAST_ID }
    );
  }

  /**
   * Take the server's revision and send the save again. When the refusal did
   * not name the revision it is read from the saved version; if that cannot be
   * done nothing is sent and the choice stays open.
   */
  async keepMine(): Promise<void> {
    const pending = this.#pending;
    if (!pending) return;
    let revision = pending.currentRevision;
    if (revision === null) {
      const loaded = this.theirs ?? (await this.#load());
      revision = loaded?.revision ? String(loaded.revision) : null;
      if (revision === null) {
        showError(this.#deps.messages().saveConflict.noRevision);
        return;
      }
    }
    this.#clear();
    this.#deps.workflow.acknowledgeServer({ revision });
    try {
      await pending.retry();
    } catch {
      // The retried save has already shown its own error.
    }
  }

  /** Replace the editor's workflow with the saved version. */
  async loadTheirs(): Promise<void> {
    const loaded = this.theirs ?? (await this.#load());
    if (!loaded) return;
    this.#accept(loaded);
  }

  /** Load the saved version and open the comparison. */
  async compare(): Promise<void> {
    const mine = this.#deps.workflow.current;
    const loaded = await this.#load();
    if (!loaded || !mine) return;
    this.theirs = loaded;
    this.comparison = compareWorkflows(mine, loaded);
  }

  /** Use the already loaded saved version (the dialog's "Load saved version"). */
  acceptTheirs(): void {
    if (this.theirs) this.#accept(this.theirs);
  }

  /** Close the dialog without choosing; the toast stays. */
  closeComparison(): void {
    this.comparison = null;
    this.theirs = null;
  }

  #accept(loaded: Workflow): void {
    this.#clear();
    this.#deps.workflow.initialize(loaded);
    this.#deps.schedule();
  }

  #clear(): void {
    this.#pending = null;
    this.comparison = null;
    this.theirs = null;
    dismissToast(TOAST_ID);
  }

  async #load(): Promise<Workflow | null> {
    const id = this.#deps.workflow.current?.id;
    if (!id) return null;
    try {
      return await this.#deps.loadWorkflow(id);
    } catch (error) {
      apiToasts.error('Load workflow', error instanceof Error ? error : String(error));
      return null;
    }
  }
}
