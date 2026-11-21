/**
 * What a form remembers about the null toggles of its fields: the value a key
 * held before the toggle set it to `null`, so turning the toggle off brings it
 * back. The form owns this record (one place, for every field kind and for
 * `SchemaForm` and `ConfigForm` alike); a field only reports "null on" as
 * `null` and "null off" as `undefined`.
 *
 * A record is dropped as soon as the config's value for its key changes from
 * outside the form: once the key has been seen holding `null` and then holds
 * anything else (undo, the console, WebMCP, the Assistant), the old value no
 * longer belongs to this toggle, and a later `null` from outside must not
 * bring it back.
 */
export function createNullMemory() {
  /** Nothing renders from this record, so it is a plain Map. `has: false` records "the key was not set before"; `seen`: the config has held `null` since. */
  const held = new Map<string, { has: boolean; value: unknown; seen: boolean }>();

  return {
    /**
     * Interpret what a field reported for `key`, given the value the form
     * currently shows for it (`current`, `undefined` when the key is absent).
     * Returns the value to store and whether it is a value held before, which
     * is stored as it is (a restored `''` stays `''`).
     */
    interpret(
      key: string,
      reported: unknown,
      current: unknown
    ): { value: unknown; exact: boolean } {
      if (reported === null && current !== null) {
        // Every null-on overwrites the record, so a stale one can never come back.
        held.set(key, { has: current !== undefined, value: current, seen: false });
        return { value: null, exact: false };
      }
      if (reported === undefined && current === null) {
        const record = held.get(key);
        held.delete(key);
        // No record: the key was not set before null, so it leaves again (a
        // required key then gets its default from `buildConfig`).
        return { value: record?.has ? record.value : undefined, exact: true };
      }
      return { value: reported, exact: false };
    },

    /**
     * Drop the records whose key the config changed from outside. Call it from
     * an effect that runs when the config or the edits change.
     */
    sync(config: Record<string, unknown>, edits: Record<string, unknown>): void {
      const stale: string[] = [];
      for (const [key, record] of held) {
        if (config[key] === null) record.seen = true;
        else if (record.seen && !(key in edits)) stale.push(key);
      }
      for (const key of stale) held.delete(key);
    },

    /** Forget everything (a different node or schema is shown). */
    clear(): void {
      held.clear();
    }
  };
}
