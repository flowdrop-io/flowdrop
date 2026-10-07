/**
 * Edited nodes: which nodes changed since the shown run started.
 *
 * Test mode marks a node `edited` when it has a last run and its
 * configuration changed since that run started, so the result on screen may be
 * stale. The server's run snapshot is not on the client, so the store keeps its
 * own: a fingerprint of every node (see `utils/nodeFingerprint.ts`) taken when
 * the shown run is first seen, compared with the live workflow.
 *
 * One store per instance. The baseline belongs to one run: it is replaced
 * when another run is shown and dropped when none is. A run seen for the first
 * time long after it started (opened from history) is baselined at that
 * moment, so edits made before then are not marked: the client cannot know.
 *
 * @module stores/editedNodesStore
 */

import type { Workflow } from '../types/index.js';
import { fingerprintNodes } from '../utils/nodeFingerprint.js';

interface Baseline {
  runId: string;
  workflowId: string;
  prints: Record<string, string>;
}

export class EditedNodesStore {
  #workflow: () => Workflow | null;
  #baseline = $state.raw<Baseline | null>(null);
  #visible = $state(false);

  /** Fingerprints of the live workflow; only computed while marks are shown and a baseline exists. */
  #live = $derived.by<Record<string, string> | null>(() => {
    if (!this.#visible || !this.#baseline) return null;
    const workflow = this.#workflow();
    return workflow && workflow.id === this.#baseline.workflowId
      ? fingerprintNodes(workflow)
      : null;
  });

  /** @param workflow Reads the live workflow (the editor's workflow store). */
  constructor(workflow: () => Workflow | null) {
    this.#workflow = workflow;
  }

  /** The run the baseline was taken for; null when there is none. */
  get runId(): string | null {
    return this.#baseline?.runId ?? null;
  }

  /** Whether marks are shown at all (Test mode). */
  get visible(): boolean {
    return this.#visible;
  }

  /** Show or hide the marks. `App` sets this from the effective editor mode. */
  setVisible(visible: boolean): void {
    this.#visible = visible;
  }

  /**
   * Follow the shown run. Takes the baseline when a run (or the workflow it
   * ran on) is seen for the first time, drops it when there is no run.
   * Calling again for the same run and workflow does nothing, so edits are
   * never absorbed into the baseline.
   */
  track(runId: string | null | undefined): void {
    if (!runId) {
      this.clear();
      return;
    }
    const workflow = this.#workflow();
    if (!workflow?.id) return;
    const current = this.#baseline;
    if (current && current.runId === runId && current.workflowId === workflow.id) return;
    this.#baseline = { runId, workflowId: workflow.id, prints: fingerprintNodes(workflow) };
  }

  /** Drop the baseline. */
  clear(): void {
    if (this.#baseline) this.#baseline = null;
  }

  /**
   * Whether the node changed since the baseline. False for a node that did
   * not exist then. Whether the node also has a last run is the caller's test.
   */
  isEdited(nodeId: string): boolean {
    const baseline = this.#baseline;
    const live = this.#live;
    if (!baseline || !live) return false;
    const before = baseline.prints[nodeId];
    const now = live[nodeId];
    return before !== undefined && now !== undefined && before !== now;
  }
}
