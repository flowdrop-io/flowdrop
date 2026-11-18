import { firstNonNullType } from './schemaType.js';

/**
 * Form value merge — shared by `SchemaForm` and `ConfigForm`.
 *
 * Produces the view of form values that children read via context. Precedence
 * per key:
 *
 *   1. `edits[key]` is `REMOVE_KEY` → the field was cleared: show it empty
 *                                    (the key is absent; the default applies)
 *   2. `key in edits`            → use the user's local edit
 *   3. `source[key] !== undefined` → use the prop value (including null/0/false/'')
 *   4. otherwise                  → use the schema field's `default`
 *
 * Keeping this separate from the host components means the test pins the same
 * function the components run, not a parallel implementation.
 */
export const REMOVE_KEY: unique symbol = Symbol('flowdrop.removeKey');

/** The schema keywords `isClearedValue` reads. */
type ClearableField = {
  type?: unknown;
  format?: unknown;
  enum?: unknown;
  oneOf?: unknown;
  autocomplete?: { url?: unknown } | undefined;
};

/** Formats whose content is edited as a whole document: emptying one is a value, not a clear. */
const DOCUMENT_FORMATS = new Set(['json', 'code', 'markdown', 'template', 'hidden', 'ports']);

/**
 * Whether `value`, just emitted by a field, is that field being emptied by a
 * person (or by the autocomplete cascade) rather than a value of its own.
 *
 * Covered: text and textarea (`''`), number and integer (`''`, what the number
 * box emits when cleared), a select's empty choice (`''`, `enum` and `oneOf`),
 * and an autocomplete (`''`, or `[]` once no items are left).
 *
 * Not covered, because the empty value there is a real value: `false` on a
 * checkbox or switch, the content of a code, JSON, markdown or template
 * editor, an array field with its own Add/Delete rows, a checkbox group, and
 * `null` (a deliberate "chose nothing", not a clear).
 */
export function isClearedValue(field: unknown, value: unknown): boolean {
  const f = (field ?? {}) as ClearableField;
  if (typeof f.format === 'string' && DOCUMENT_FORMATS.has(f.format)) return false;
  if (f.format === 'autocomplete' && f.autocomplete?.url) {
    return value === '' || (Array.isArray(value) && value.length === 0);
  }
  if (value !== '') return false;
  if (f.enum || f.oneOf) return true;
  // A nullable field (`['string', 'null']`) is cleared like its plain type.
  const kind = firstNonNullType(f.type);
  if (kind === 'string') return true;
  return (kind === 'number' || kind === 'integer') && f.format !== 'range';
}

/**
 * What to store in the edits buffer for a value a field emitted: `REMOVE_KEY`
 * for a clear (see `isClearedValue`) or `undefined`, the value itself otherwise.
 * With `exact` the clear rule is skipped: a restored `''` is kept.
 */
export function toEdit(field: unknown, value: unknown, exact = false): unknown {
  // `undefined` is a field saying "no value" (the null toggle turned off with
  // nothing to restore, for one); JSON cannot hold it, so the key leaves too.
  if (value === undefined) return REMOVE_KEY;
  // `exact`: the value is one the field held before (the null toggle turned off
  // brings it back), not something a person just typed. A stored `''` stays `''`.
  if (exact) return value;
  return isClearedValue(field, value) ? REMOVE_KEY : value;
}

/**
 * The config to hand to the host: the merged form values over `base`, without
 * the keys the user cleared and without keys that merged to `undefined`. This
 * is the one place the edits buffer's removal marker is turned into an absent
 * key, so `REMOVE_KEY` never reaches `onChange`, `onSave` or the store.
 *
 * It only acts on `edits`: a `''` or `[]` that is already stored is kept.
 *
 * `fillDefaults` says which untouched keys get their default written: `'all'`
 * (a submitted form answer), or a list of keys (a node's config writes only
 * its required keys, which R6.b needs present at save).
 */
export function buildConfig(
  base: Record<string, unknown>,
  merged: Record<string, unknown>,
  edits: Record<string, unknown>,
  fillDefaults: 'all' | readonly string[] = 'all'
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined) continue;
    // A key nobody set (absent from `base`, no edit) only carries its default.
    // Write it only where asked: an absent key means "not provided", and its
    // default applies when the node runs (CFG-3).
    const untouched = !(key in base) && !(key in edits);
    if (untouched && fillDefaults !== 'all' && !fillDefaults.includes(key)) continue;
    out[key] = value;
  }
  for (const key of Object.keys(edits)) {
    if (edits[key] === REMOVE_KEY) delete out[key];
  }
  return out;
}

/**
 * The part of an edits buffer that outlives a commit: the keys the user
 * cleared. Keeping them stops a cleared field from being filled with its
 * default again after the buffer is reset.
 */
export function keepRemovals(edits: Record<string, unknown>): Record<string, unknown> {
  const kept: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(edits)) {
    if (value === REMOVE_KEY) kept[key] = value;
  }
  return kept;
}

export function mergeWithDefaults(
  schema: { properties?: Record<string, unknown> } | undefined,
  source: Record<string, unknown>,
  edits: Record<string, unknown>
): Record<string, unknown> {
  if (!schema?.properties) return {};
  const merged: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(schema.properties)) {
    const fieldConfig = field as Record<string, unknown>;
    if (key in edits && edits[key] === REMOVE_KEY) {
      // Cleared: the field shows empty (its default appears as the
      // placeholder, see FieldFactory), so typing a new value is not
      // interrupted by the default filling the box back in.
      merged[key] = undefined;
    } else if (key in edits) {
      merged[key] = edits[key];
    } else {
      merged[key] = source[key] !== undefined ? source[key] : fieldConfig.default;
    }
  }
  return merged;
}

/**
 * Compute the cascade-clear set when a single field changes — shared by
 * `SchemaForm` and `ConfigForm`.
 *
 * When `changedKey` changes, any property whose `autocomplete.params` references
 * `changedKey` (directly or transitively) should have its value cleared: the
 * old dependent value was computed against the old parent value and is now
 * stale.
 *
 * Returns a map of `{ dependentKey -> REMOVE_KEY }` to apply on top of the
 * caller's edits buffer: a cleared dependent is unset (its key leaves the
 * config), not set to `''` or `[]` — an empty value is a value, and would
 * count as provided for a required field and beat the default (#72).
 *
 * This logic lives in the parent form (not in `FormAutocomplete`) so it only
 * runs on user-driven changes via `handleFieldChange`, not on undo/redo,
 * programmatic resets, or collaborative edits (#33).
 */
export function cascadeClearAutocompleteDependents(
  schema: { properties?: Record<string, unknown> } | undefined,
  changedKey: string
): Record<string, unknown> {
  if (!schema?.properties) return {};
  const cleared = new Set<string>([changedKey]);
  const result: Record<string, unknown> = {};
  let added = true;
  while (added) {
    added = false;
    for (const [depKey, depField] of Object.entries(schema.properties)) {
      if (cleared.has(depKey)) continue;
      const field = depField as {
        autocomplete?: { params?: Record<string, string> };
      };
      const params = field.autocomplete?.params;
      if (!params) continue;
      const dependsOnCleared = Object.values(params).some((fieldName) => cleared.has(fieldName));
      if (dependsOnCleared) {
        result[depKey] = REMOVE_KEY;
        cleared.add(depKey);
        added = true;
      }
    }
  }
  return result;
}
