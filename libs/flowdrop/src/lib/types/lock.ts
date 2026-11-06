/**
 * Editor lock: why a workflow is read-only, and what the person may do about it.
 *
 * A host passes a lock (the `lock` mount option, or `app.setLock(...)`) while
 * something stops the workflow from being edited, for example a workflow that
 * live users depend on, or one a module manages. The editor then refuses every
 * edit and shows the reasons and the actions in a banner above the canvas. An
 * action is only a button: the host answers `onLockAction(id)`, and "Edit
 * anyway" is just an action the host answers by removing the lock.
 *
 * @module types/lock
 */

/** One reason the workflow is locked. */
export interface EditorLockReason {
  /** What kind of reason this is, for example `'in_use'` or `'managed'`. Free text; the editor does not interpret it. */
  kind: string;
  /** A plain sentence for the person. Shown as text, never as HTML. */
  message: string;
  /** Where to read more (for example the page that lists who uses the workflow). Only `http(s)` and site-relative links are drawn. */
  url?: string | null;
}

/** One button on the lock banner. */
export interface EditorLockAction {
  /** Handed to `onLockAction` when the button is pressed. */
  id: string;
  /** The button text. */
  label: string;
  /** Draw the button as the main one. */
  primary?: boolean;
}

/** A lock on the editor. `null` (or no lock) means the editor is not locked. */
export interface EditorLock {
  reasons: EditorLockReason[];
  actions: EditorLockAction[];
}
