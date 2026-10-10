/**
 * Doctor store: the problems the backend finds in the editor's draft, one
 * store per editor.
 *
 * It diagnoses the **draft** (the workflow serialised exactly as a save would),
 * a moment after the last edit and once on load, and drops an answer a newer
 * request has overtaken. It makes no request while the workflow is unsaved
 * (diagnose needs a saved id) or when the backend offers no Doctor.
 *
 * A remedy is asked of the server, answered as operations, and applied with ONE
 * workflow update, which is one undo step; an operation the editor cannot map
 * aborts the whole remedy before anything changes.
 *
 * @module stores/doctorStore
 */

import type { DoctorProblem, DoctorRemedy, DoctorSeverity } from '../types/doctor.js';
import type { WorkflowStore } from './workflowStore.svelte.js';
import type { ApiContext } from './apiContext.js';
import { diagnoseDraft, doctorSupported, requestRemedy } from '../services/doctorService.js';
import { applyDoctorOperations } from '../utils/doctorOperations.js';
import { buildSaveBody } from '../utils/workflowDraft.js';

/** How long the draft must sit still before it is diagnosed. */
export const DOCTOR_IDLE_MS = 800;

export type DoctorStatus = 'off' | 'idle' | 'checking' | 'ready' | 'error';

/** What the last remedy attempt ended in, other than success. The view words it. */
export type DoctorNotice =
  | { kind: 'gone'; problemId: string }
  | { kind: 'changed'; problemId: string }
  | { kind: 'empty'; problemId: string }
  | { kind: 'failed'; problemId: string; message: string };

const RANK: Record<DoctorSeverity, number> = { error: 0, warning: 1, info: 2 };

export class DoctorStore {
  #problems = $state<DoctorProblem[]>([]);
  #status = $state<DoctorStatus>('idle');
  /** Read from the endpoint configuration on every `schedule()`; the configuration itself is not reactive. */
  #supported = $state(false);
  /** The workflow whose Doctor route answered 404: left alone until another workflow loads. */
  #unavailableFor: string | null = null;
  #applyingId = $state<string | null>(null);
  #notice = $state<DoctorNotice | null>(null);
  #openRequest = $state(0);
  #focus: ((nodeId: string) => boolean) | null = null;
  #timer: ReturnType<typeof setTimeout> | null = null;
  /** Bumped by every request; an answer for an older one is dropped. */
  #token = 0;
  /** The workflow id and edit version the last request was for. */
  #requested: { id: string; version: number } | null = null;
  readonly #workflow: WorkflowStore;
  readonly #api: ApiContext;
  readonly #idleMs: number;

  constructor(workflow: WorkflowStore, api: ApiContext, idleMs: number = DOCTOR_IDLE_MS) {
    this.#workflow = workflow;
    this.#api = api;
    this.#idleMs = idleMs;
  }

  /** Whether the backend offers a Doctor (the endpoints are configured). */
  get supported(): boolean {
    return this.#supported;
  }

  get status(): DoctorStatus {
    return this.#status;
  }

  /** The problems of the last answer, errors first. */
  get problems(): DoctorProblem[] {
    return this.#problems;
  }

  /** The problem a remedy is being applied for, if any. */
  get applyingId(): string | null {
    return this.#applyingId;
  }

  get notice(): DoctorNotice | null {
    return this.#notice;
  }

  /** Counts the requests to show the problems popover (see {@link requestOpen}); the menu watches it. */
  get openRequest(): number {
    return this.#openRequest;
  }

  /**
   * Ask the navbar's problems popover to open (a toast's "Show problems").
   * Returns whether there is anything to show, so a caller can offer the
   * action only when it will do something.
   */
  requestOpen(): boolean {
    if (!this.#supported || this.#problems.length === 0) return false;
    this.#openRequest += 1;
    return true;
  }

  /** Whether {@link requestOpen} would show something. */
  get canOpen(): boolean {
    return this.#supported && this.#problems.length > 0;
  }

  dismissNotice(): void {
    this.#notice = null;
  }

  /** The problems about one node. */
  forNode(nodeId: string): DoctorProblem[] {
    return this.#problems.filter((p) => p.node === nodeId);
  }

  /** The most severe problem on a node, or `null`. */
  severityOf(nodeId: string): DoctorSeverity | null {
    let worst: DoctorSeverity | null = null;
    for (const p of this.#problems) {
      if (p.node !== nodeId) continue;
      if (worst === null || RANK[p.severity] < RANK[worst]) worst = p.severity;
    }
    return worst;
  }

  /** Register the editor's "select this node and bring it into view". Returns the unregister function. */
  setFocusHandler(handler: (nodeId: string) => boolean): () => void {
    this.#focus = handler;
    return () => {
      if (this.#focus === handler) this.#focus = null;
    };
  }

  focusNode(nodeId: string): boolean {
    return this.#focus?.(nodeId) ?? false;
  }

  /**
   * The draft changed (or loaded): diagnose it once it sits still. The first
   * check of a workflow does not wait.
   */
  schedule(): void {
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = null;
    const id = this.#workflow.id;
    this.#supported = doctorSupported(this.#api.config) && this.#unavailableFor !== id;
    if (!this.#supported || !id) {
      this.#token++;
      this.#problems = [];
      this.#status = this.#supported ? 'idle' : 'off';
      this.#requested = null;
      return;
    }
    // Already diagnosed exactly this version of this workflow.
    if (this.#requested?.id === id && this.#requested.version === this.#workflow.editVersion) {
      return;
    }
    const first = this.#requested?.id !== id;
    this.#timer = setTimeout(
      () => {
        this.#timer = null;
        void this.diagnoseNow();
      },
      first ? 0 : this.#idleMs
    );
  }

  /** Diagnose the draft now. */
  async diagnoseNow(): Promise<void> {
    const config = this.#api.config;
    const current = this.#workflow.current;
    if (!config || !current?.id || !doctorSupported(config)) return;
    const token = ++this.#token;
    const id = current.id;
    this.#requested = { id, version: this.#workflow.editVersion };
    this.#status = 'checking';
    const result = await diagnoseDraft(
      config,
      id,
      buildSaveBody(current, id),
      this.#api.authProvider
    );
    // A newer request, or another workflow, overtook this one.
    if (token !== this.#token || this.#workflow.id !== id) return;
    if (result.status === 'ok') {
      this.#problems = result.problems;
      this.#status = 'ready';
    } else if (result.status === 'unavailable') {
      // Quiet: no indicator, no more requests for this version.
      this.#problems = [];
      this.#supported = false;
      this.#unavailableFor = id;
      this.#status = 'off';
    } else {
      // Keep what was shown; the next edit tries again.
      this.#status = 'error';
      this.#requested = null;
    }
  }

  /**
   * Apply `remedy` for `problem` as one undoable edit. Returns whether the
   * workflow changed; otherwise {@link notice} says why.
   */
  async applyRemedy(
    problem: DoctorProblem,
    remedy: DoctorRemedy,
    params?: Record<string, unknown>
  ): Promise<boolean> {
    const config = this.#api.config;
    const current = this.#workflow.current;
    if (this.#applyingId || !config || !current?.id) return false;
    const id = current.id;
    const version = this.#workflow.editVersion;
    this.#applyingId = problem.id;
    this.#notice = null;
    // The remedy is about this draft: an answer for an earlier diagnose is moot.
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = null;
    this.#token++;
    try {
      const result = await requestRemedy(
        config,
        id,
        {
          draft: buildSaveBody(current, id),
          code: problem.code,
          target: problem.id,
          remedy: remedy.id,
          ...(params && { params })
        },
        this.#api.authProvider
      );
      if (result.status === 'conflict') {
        this.#notice = { kind: 'gone', problemId: problem.id };
        void this.diagnoseNow();
        return false;
      }
      if (result.status === 'error') {
        this.#notice = { kind: 'failed', problemId: problem.id, message: result.message };
        this.schedule();
        return false;
      }
      // The operations name things in the draft that was sent: if the person
      // edited meanwhile they may no longer fit.
      if (this.#workflow.id !== id || this.#workflow.editVersion !== version) {
        this.#notice = { kind: 'changed', problemId: problem.id };
        void this.diagnoseNow();
        return false;
      }
      if (result.operations.length === 0) {
        this.#notice = { kind: 'empty', problemId: problem.id };
        void this.diagnoseNow();
        return false;
      }
      const applied = applyDoctorOperations(
        { nodes: this.#workflow.nodes, edges: this.#workflow.edges },
        result.operations
      );
      if (!applied.ok) {
        this.#notice = { kind: 'failed', problemId: problem.id, message: applied.message };
        return false;
      }
      // One update, one undo step.
      this.#workflow.actions.batchUpdate({
        nodes: applied.nodes,
        edges: applied.edges,
        ...(applied.touched.interface && { interface: applied.interface }),
        ...(applied.touched.playground && { playground: applied.playground })
      });
      void this.diagnoseNow();
      return true;
    } finally {
      this.#applyingId = null;
    }
  }

  dispose(): void {
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = null;
    this.#token++;
    this.#focus = null;
  }
}
