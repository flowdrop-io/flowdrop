/**
 * Form value merge — shared by `SchemaForm` and `ConfigForm`.
 *
 * Produces the view of form values that children read via context. Precedence
 * per key:
 *
 *   1. `key in edits`            → use the user's local edit
 *   2. `source[key] !== undefined` → use the prop value (including null/0/false/'')
 *   3. otherwise                  → use the schema field's `default`
 *
 * Keeping this separate from the host components means the test pins the same
 * function the components run, not a parallel implementation.
 */
export function mergeWithDefaults(
  schema: { properties?: Record<string, unknown> } | undefined,
  source: Record<string, unknown>,
  edits: Record<string, unknown>
): Record<string, unknown> {
  if (!schema?.properties) return {};
  const merged: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(schema.properties)) {
    if (key in edits) {
      merged[key] = edits[key];
    } else {
      const fieldConfig = field as Record<string, unknown>;
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
 * Returns a map of `{ dependentKey -> clearValue }` to apply on top of the
 * caller's edits buffer. Single-value autocompletes clear to `''`; ones with
 * `multiple: true` clear to `[]`.
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
        autocomplete?: { params?: Record<string, string>; multiple?: boolean };
      };
      const params = field.autocomplete?.params;
      if (!params) continue;
      const dependsOnCleared = Object.values(params).some((fieldName) => cleared.has(fieldName));
      if (dependsOnCleared) {
        result[depKey] = field.autocomplete?.multiple ? [] : '';
        cleared.add(depKey);
        added = true;
      }
    }
  }
  return result;
}
