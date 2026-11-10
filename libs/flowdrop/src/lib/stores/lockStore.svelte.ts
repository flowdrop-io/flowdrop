/**
 * Editor lock: the reasons a workflow cannot be edited right now, and the
 * actions a person is offered.
 *
 * One store per instance. While a lock is set the workflow store refuses every
 * edit (see `WorkflowStore.setLocked`) and the canvas shows the banner. A host
 * sets it through the `lock` option or `app.setLock(...)`, and removes it with
 * `null`. Pressing an action reports its id to the host (`onLockAction`).
 *
 * @module stores/lockStore
 */

import type { EditorLock } from '../types/lock.js';

/** Keep what the banner needs, and drop anything that is not text. */
function normalise(lock: EditorLock | null | undefined): EditorLock | null {
  if (!lock || typeof lock !== 'object') return null;
  const reasons = (Array.isArray(lock.reasons) ? lock.reasons : []).filter(
    (r) => r && typeof r.message === 'string' && r.message !== ''
  );
  const actions = (Array.isArray(lock.actions) ? lock.actions : []).filter(
    (a) => a && typeof a.id === 'string' && a.id !== '' && typeof a.label === 'string'
  );
  return {
    reasons: reasons.map((r) => ({
      kind: String(r.kind ?? ''),
      message: r.message,
      url: r.url ?? null
    })),
    actions: actions.map((a) => ({ id: a.id, label: a.label, primary: a.primary === true }))
  };
}

/**
 * Blur the focused element when it sits inside a lock fence (a config form or
 * panel body) or is an in-place editor that commits on blur (`data-lock-commit`).
 */
function blurFieldInsideLockFence(): void {
  if (typeof document === 'undefined') return;
  const active = document.activeElement;
  if (active instanceof HTMLElement && active.closest('.flowdrop-lock-fence, [data-lock-commit]'))
    active.blur();
}

export class EditorLockStore {
  #current = $state<EditorLock | null>(null);
  #changeListeners = new Set<(locked: boolean) => void>();
  #beforeLockListeners = new Set<() => void>();
  #actionListeners = new Set<(id: string) => void>();

  /** The lock in force, or null when the editor is not locked. */
  get current(): EditorLock | null {
    return this.#current;
  }

  /** Whether the editor is locked. */
  get isLocked(): boolean {
    return this.#current !== null;
  }

  /**
   * Lock the editor, replace the lock, or (with `null`) unlock it. A value that
   * is not a lock unlocks.
   */
  set(lock: EditorLock | null | undefined): void {
    const next = normalise(lock);
    const was = this.#current !== null;
    // A field being typed in commits on blur. Blur it while the editor still
    // reads as unlocked, so the edit lands before anything refuses it.
    if (!was && next !== null) {
      // Let an editor save what is half typed (a name beside a port) first.
      for (const listener of [...this.#beforeLockListeners]) listener();
      blurFieldInsideLockFence();
    }
    this.#current = next;
    const is = next !== null;
    if (was !== is) for (const listener of [...this.#changeListeners]) listener(is);
  }

  /** Remove the lock. */
  clear(): void {
    this.set(null);
  }

  /** Be told when the editor becomes locked or unlocked. Returns a function that stops listening. */
  onChange(listener: (locked: boolean) => void): () => void {
    this.#changeListeners.add(listener);
    return () => {
      this.#changeListeners.delete(listener);
    };
  }

  /**
   * Be told just before the editor becomes locked, while it still reads as
   * unlocked, so an edit in progress can be saved. Returns a function that stops listening.
   *
   * @internal Used by the editor to save a half-typed name; not a supported host API.
   */
  onBeforeLock(listener: () => void): () => void {
    this.#beforeLockListeners.add(listener);
    return () => {
      this.#beforeLockListeners.delete(listener);
    };
  }

  /** Be told when a person presses a lock action. Returns a function that stops listening. */
  onAction(listener: (id: string) => void): () => void {
    this.#actionListeners.add(listener);
    return () => {
      this.#actionListeners.delete(listener);
    };
  }

  /** A person pressed the action `id`. Reported to the host, which decides what it does. */
  fire(id: string): void {
    if (!this.#current?.actions.some((a) => a.id === id)) return;
    for (const listener of [...this.#actionListeners]) listener(id);
  }
}
