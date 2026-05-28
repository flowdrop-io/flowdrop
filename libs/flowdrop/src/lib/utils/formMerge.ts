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
