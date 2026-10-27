/**
 * Save Conflict Store
 *
 * One editor's answer to a save the server refused because someone else saved
 * the workflow first (409 CONFLICT). It offers three ways out in a toast:
 * keep mine (send again on top of the newer version), load theirs (take the
 * saved version) and compare (see what differs before choosing).
 *
 * @module stores/saveConflictStore
 */

import type { Workflow } from '../types/index.js';
import { compareWorkflows, type WorkflowComparison } from '../utils/workflowCompare.js';
import { apiToasts, dismissToast, showError } from '../services/toastService.js';
import type { FlowDropInstance } from './instanceContainer.svelte.js';

/** What a refused save hands over. */
export interface SaveConflictReport {
  /** The revision the server holds now. */
  currentRevision: string;
  /** Sends the same save again; resolves true when it wrote. */
  retry: () => Promise<boolean>;
}

const TOAST_ID = 'flowdrop:save-conflict';

export class SaveConflictStore {
  #fd: () => FlowDropInstance;
  #pending: SaveConflictReport | null = null;

  /** The saved version, once loaded for Compare or Load theirs. */
  theirs = $state<Workflow | null>(null);
  /** The differences shown by the compare dialog. */
  comparison = $state<WorkflowComparison | null>(null);

  constructor(fd: () => FlowDropInstance) {
    this.#fd = fd;
  }

  /** True while the compare dialog is wanted. */
  get comparing(): boolean {
    return this.comparison !== null && this.theirs !== null;
  }

  /** Remember the refused save and offer the three choices in a toast that stays until closed. */
  report(args: SaveConflictReport): void {
    this.#pending = args;
    showError(
      {
        title: 'Someone saved this workflow after you opened it.',
        body: 'Your changes are not saved yet.',
        actions: [
          { label: 'Keep mine', primary: true, onClick: () => void this.keepMine() },
          { label: 'Load theirs', onClick: () => void this.loadTheirs() },
          { label: 'Compare', onClick: () => void this.compare() }
        ]
      },
      { id: TOAST_ID }
    );
  }

  /** Take the server's revision and send the save again. */
  async keepMine(): Promise<void> {
    const pending = this.#pending;
    if (!pending) return;
    this.#clear();
    this.#fd().workflow.acknowledgeServer({ revision: pending.currentRevision });
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
    const fd = this.#fd();
    const mine = fd.workflow.current;
    const loaded = await this.#load();
    if (!loaded || !mine) return;
    this.theirs = loaded;
    this.comparison = compareWorkflows(mine, loaded);
  }

  /** Use the already loaded saved version (the dialog's "Load the saved version"). */
  acceptTheirs(): void {
    if (this.theirs) this.#accept(this.theirs);
  }

  /** Close the dialog without choosing; the toast stays. */
  closeComparison(): void {
    this.comparison = null;
    this.theirs = null;
  }

  #accept(loaded: Workflow): void {
    const fd = this.#fd();
    this.#clear();
    fd.workflow.initialize(loaded);
    fd.doctor.schedule();
  }

  #clear(): void {
    this.#pending = null;
    this.comparison = null;
    this.theirs = null;
    dismissToast(TOAST_ID);
  }

  async #load(): Promise<Workflow | null> {
    const fd = this.#fd();
    const id = fd.workflow.current?.id;
    if (!id) return null;
    try {
      return await fd.api.client.loadWorkflow(id);
    } catch (error) {
      apiToasts.error('Load workflow', error instanceof Error ? error : String(error));
      return null;
    }
  }
}
