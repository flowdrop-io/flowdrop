/**
 * The run attached to the Assistant: the one home of "which run the Assistant
 * is looking at".
 *
 * The Assistant works in Edit mode, so a run the person was just testing has
 * to travel with them. Attaching names a run (its pipeline id) to the chat:
 * the request carries it as `attachedRunId` and the server's run tools read
 * what the model asks for. Only the id travels; nothing about the run is
 * copied into the prompt here.
 *
 * One store per instance, like `fd.editorMode`. The chip above the Assistant's
 * composer shows it; "Ask the Assistant about this run" and "+ Attach a run"
 * write it.
 *
 * @module stores/attachedRunStore
 */

/** What the caller already knows of the run it attaches, for the chip until the runs list says more. */
export interface AttachedRunHint {
  /** Pipeline status, e.g. `failed`. */
  status?: string;
}

/** The server accepts digit strings only (`attachedRunId`). */
const RUN_ID = /^[0-9]{1,18}$/;

export class AttachedRunStore {
  #id = $state<string | null>(null);
  #hint = $state<AttachedRunHint>({});

  /** The attached run's id (a pipeline id), or `null` when none is attached. */
  get id(): string | null {
    return this.#id;
  }

  /** What was known of the run when it was attached. */
  get hint(): AttachedRunHint {
    return this.#hint;
  }

  /**
   * Attach a run, replacing any attached one. An id the server would refuse
   * (not a digit string) is ignored. Returns whether the run was attached.
   */
  attach(id: string | number, hint: AttachedRunHint = {}): boolean {
    const text = String(id);
    if (!RUN_ID.test(text)) return false;
    this.#id = text;
    this.#hint = hint;
    return true;
  }

  /** Remove the attached run. */
  detach(): void {
    this.#id = null;
    this.#hint = {};
  }
}
