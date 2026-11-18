/**
 * Reading a property's `type`, which is a JSON Schema type word, an array of
 * them (`null` included) or absent.
 */

/**
 * The type a property is edited and shown as: the word itself, or for an array
 * the first member that is not `null`. An empty array, an array of only `null`
 * and an absent `type` have none (`undefined`): the property takes any JSON value.
 */
export function firstNonNullType(type: unknown): string | undefined {
  if (typeof type === 'string') return type === 'null' ? undefined : type;
  if (Array.isArray(type)) {
    return type.find((t): t is string => typeof t === 'string' && t !== 'null');
  }
  return undefined;
}

/** Whether a schema's `type` is, or lists, `null`. */
export function typeAdmitsNull(type: unknown): boolean {
  return type === 'null' || (Array.isArray(type) && type.includes('null'));
}

/**
 * Whether a schema accepts `null` as a config value: its `type` lists `null`,
 * or its `enum` does. Anywhere else `null` would fail validation.
 */
export function schemaAdmitsNull(schema: { type?: unknown; enum?: unknown[] }): boolean {
  return typeAdmitsNull(schema.type) || (Array.isArray(schema.enum) && schema.enum.includes(null));
}
