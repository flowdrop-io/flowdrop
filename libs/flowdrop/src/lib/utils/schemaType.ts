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
 * Whether a schema names `null` as an allowed config value, so the form offers
 * it. As in R6.i, `null` must pass both `type` and `enum`: the type admits it
 * (or there is no type) and, where there is an `enum`, it lists `null`. The
 * schema must also name `null` in one of them; a schema with neither `type`
 * nor `enum` accepts any JSON value through its editor and needs no toggle.
 */
export function schemaAdmitsNull(schema: { type?: unknown; enum?: unknown[] }): boolean {
  const hasType =
    schema.type !== undefined && !(Array.isArray(schema.type) && schema.type.length === 0);
  const typeOk = !hasType || typeAdmitsNull(schema.type);
  const hasEnum = Array.isArray(schema.enum);
  const enumOk = !hasEnum || schema.enum!.includes(null);
  const named = typeAdmitsNull(schema.type) || (hasEnum && schema.enum!.includes(null));
  return typeOk && enumOk && named;
}
