/**
 * Inline edit channel.
 *
 * The single way to say "open this node for typing in place". The node
 * context menu's "Edit text" and "Add caption", Enter on a focused node and a
 * double-click all call `request(id)`; a node component that edits in place
 * (registered with `editsInPlace`) watches `requested` for its own id, starts
 * editing and calls `clear()`.
 *
 * @module stores/inlineEditStore
 */

export class InlineEditStore {
  #requested = $state<string | null>(null);
  #editable = $state(true);

  /** The id of the node asked to start editing, or null. */
  get requested(): string | null {
    return this.#requested;
  }

  /** Whether requests are honoured. The editor turns this off in read-only and locked modes. */
  get editable(): boolean {
    return this.#editable;
  }

  setEditable(editable: boolean): void {
    this.#editable = editable;
    if (!editable) this.#requested = null;
  }

  /** Ask a node to start editing in place. Ignored while the editor is not editable. */
  request(id: string): void {
    if (!this.#editable) return;
    this.#requested = id;
  }

  /** Forget the request (the node took it, or it no longer applies). */
  clear(): void {
    this.#requested = null;
  }
}
