/**
 * Pipeline Panel Store for FlowDrop (Svelte 5 Runes)
 *
 * Tracks whether the pipeline panel is open, persisting the choice to
 * localStorage so it survives reloads.
 *
 * The reactive state lives in the {@link PipelinePanelStore} class — one per
 * FlowDrop instance, resolved in components via `getInstance().pipelinePanel`.
 *
 * @module stores/pipelinePanelStore
 */

/** Base localStorage key for the panel open state. */
const STORAGE_KEY = 'fd-pipeline-panel-open';

// =========================================================================
// PipelinePanelStore (per-instance reactive state)
// =========================================================================

/**
 * Per-instance pipeline panel open state.
 *
 * Reads go through the {@link isOpen} getter backed by `$state`, so they track
 * reactively in templates and `$derived`.
 */
export class PipelinePanelStore {
  /** Whether the pipeline panel is currently open. */
  #isOpen = $state(false);

  /**
   * The localStorage key for this instance — always instance-scoped
   * (`fd-pipeline-panel-open:<instanceId>`) so multiple editors on one page
   * don't clobber each other.
   */
  readonly #storageKey: string;

  /** @param instanceId - Instance id used to scope the localStorage key. */
  constructor(instanceId: string) {
    this.#storageKey = `${STORAGE_KEY}:${instanceId}`;
  }

  /** Whether the pipeline panel is currently open (reactive). */
  get isOpen(): boolean {
    return this.#isOpen;
  }

  /** Initialize open state from localStorage. */
  init(): void {
    if (typeof localStorage === 'undefined') return;
    let stored = localStorage.getItem(this.#storageKey);
    // One-time migration: in 1.x the page-default instance stored its state
    // under the bare key. Adopt it on first read, then remove it.
    if (stored === null && this.#storageKey === `${STORAGE_KEY}:default`) {
      const legacy = localStorage.getItem(STORAGE_KEY);
      if (legacy !== null) {
        localStorage.setItem(this.#storageKey, legacy);
        localStorage.removeItem(STORAGE_KEY);
        stored = legacy;
      }
    }
    this.#isOpen = stored === 'true';
  }

  /** Toggle the panel open/closed, persisting the new state. */
  toggle(): void {
    this.#isOpen = !this.#isOpen;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.#storageKey, String(this.#isOpen));
    }
  }

  /** Set the panel open state explicitly, persisting it. */
  setOpen(value: boolean): void {
    this.#isOpen = value;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.#storageKey, String(value));
    }
  }
}
