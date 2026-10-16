/**
 * Editor mode: the Edit | Test axis of an editor instance.
 *
 * `edit` is the editor as it has always been. `test` docks the Playground in
 * the left slot, keeps the inspector open and lets badges follow a run. It is
 * a second axis beside the `mode` prop of `App` (`edit | readonly | locked`),
 * which says whether the canvas may be changed at all: Test mode is only
 * ever in effect on an editable canvas (see `App`).
 *
 * One store per instance, so two editors on a page switch independently. This
 * is the one place to change the mode from outside the navbar: the Edit |
 * Test switch, a host (`fd.editorMode.set('test')`), the run bar's "Open".
 * `App` seeds it from its `editorMode` prop and follows later changes of it;
 * `onChange` is how it reports changes back to the host.
 *
 * @module stores/editorModeStore
 */

export type EditorMode = 'edit' | 'test';

export class EditorModeStore {
  #current = $state<EditorMode>('edit');
  #listeners = new Set<(mode: EditorMode) => void>();

  /**
   * Be told, synchronously, whenever the mode really changes (not when it is
   * set to the value it already has). Returns a function that stops listening.
   */
  onChange(listener: (mode: EditorMode) => void): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  #move(mode: EditorMode): void {
    if (mode === this.#current) return;
    this.#current = mode;
    for (const listener of [...this.#listeners]) listener(mode);
  }

  /** The requested mode. `App` may hold Test back when the editor cannot test (see `App`). */
  get current(): EditorMode {
    return this.#current;
  }

  /** Whether Test is the requested mode. */
  get isTest(): boolean {
    return this.#current === 'test';
  }

  /** Switch mode. A value that is not a mode is ignored. */
  set(mode: EditorMode): void {
    if (mode === 'edit' || mode === 'test') this.#move(mode);
  }

  /** Switch to the other mode. */
  toggle(): void {
    this.#move(this.#current === 'test' ? 'edit' : 'test');
  }
}
