/**
 * Inline edit channel.
 *
 * The single way to say "open this node for typing in place". The node
 * context menu's "Edit text" and "Add caption", Enter on a focused node and a
 * double-click all call `request(id)`. A node component that edits in place
 * (registered with `editsInPlace`) registers its starter with `register`, and
 * `request` calls it directly.
 *
 * A callback registry rather than reactive state: a request is an event, not a
 * value, and state read by a per-node `$effect` would need a clear-after-read
 * dance to behave like one. The one case an event cannot cover is a request
 * that arrives before the node has mounted ("Add caption" places the node and
 * asks in the same tick), so one pending id is kept and handed to the starter
 * when it registers.
 *
 * @module stores/inlineEditStore
 */

export class InlineEditStore {
  /** Whether requests are honoured. The editor turns this off in read-only and locked modes. */
  editable = true;

  #starters = new Map<string, () => void>();
  /** A request made before its node registered. One is enough: only the latest matters. */
  #pending: string | null = null;

  setEditable(editable: boolean): void {
    this.editable = editable;
    if (!editable) this.#pending = null;
  }

  /**
   * Register the function that starts editing for a node. If a request for
   * this id is already waiting, it runs now.
   *
   * @returns a function that unregisters it (only if it is still the one registered)
   */
  register(id: string, start: () => void): () => void {
    this.#starters.set(id, start);
    if (this.#pending === id) {
      this.#pending = null;
      start();
    }
    return () => {
      if (this.#starters.get(id) === start) this.#starters.delete(id);
    };
  }

  /** Ask a node to start editing in place. Ignored while the editor is not editable. */
  request(id: string): void {
    if (!this.editable) return;
    const start = this.#starters.get(id);
    if (start) {
      start();
    } else {
      this.#pending = id;
    }
  }

  /** Forget a pending request (the workflow changed under it). */
  clear(): void {
    this.#pending = null;
  }
}
