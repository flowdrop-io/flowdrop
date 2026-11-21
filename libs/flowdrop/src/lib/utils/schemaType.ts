import type { PropertyTypeWord } from '$lib/types/index.js';

/**
 * Reading a property's `type`, which is a JSON Schema type word, an array of
 * them (`null` included) or absent.
 */

/** A type word other than `null`: what a field is edited as. */
export type EditableTypeWord = Exclude<PropertyTypeWord, 'null'>;

/**
 * The type a property is edited and shown as: the word itself, or for an array
 * the first member that is not `null`. An empty array, an array of only `null`
 * and an absent `type` have none (`undefined`): the property takes any JSON value.
 */
export function firstNonNullType(type: unknown): EditableTypeWord | undefined {
  if (typeof type === 'string') return type === 'null' ? undefined : (type as EditableTypeWord);
  if (Array.isArray(type)) {
    return type.find((t): t is EditableTypeWord => typeof t === 'string' && t !== 'null');
  }
  return undefined;
}

/** The type words an editor exists for. Any other word is edited as JSON. */
const EDITABLE_WORDS: ReadonlySet<string> = new Set([
  'string',
  'number',
  'integer',
  'float',
  'boolean',
  'array',
  'object'
]);

/**
 * The one type word a field is edited as, or `undefined` when it has none and is
 * edited as JSON: no usable type (absent, empty, only `null`), more than one
 * non-null word (`['boolean', 'string']`, `['array', 'object']`: either could be
 * the stored value, and a switch or an array editor would overwrite the other
 * kind), or a word no editor exists for (`mixed`, `json`, a typo). One non-null
 * word plus an optional `null` keeps that word's editor. Spec SCH-9 governs the
 * lane of a port, not which editor a config field gets.
 */
export function editorTypeWord(type: unknown): EditableTypeWord | undefined {
  const words = (Array.isArray(type) ? type : [type]).filter(
    (t): t is string => typeof t === 'string' && t !== 'null'
  );
  const distinct = [...new Set(words)];
  if (distinct.length !== 1) return undefined;
  return EDITABLE_WORDS.has(distinct[0]) ? (distinct[0] as EditableTypeWord) : undefined;
}

/** Whether `type` names `null` and nothing else (`'null'`, `['null']`): the one value is `null`. */
export function typeIsNullOnly(type: unknown): boolean {
  if (type === 'null') return true;
  return Array.isArray(type) && type.length > 0 && type.every((t) => t === 'null');
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
 * A `oneOf` member `{ const: null }` does not count: the server checks `type`
 * and `enum` only, so a `oneOf` alone must not offer a toggle.
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
