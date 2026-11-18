import type { FieldSchema } from './types.js';
import { firstNonNullType } from '$lib/utils/schemaType.js';

/**
 * The dependency-free field kinds — everything that does not pull in a heavy
 * editor or depend on the field registry.
 */
export type BaseFieldType =
  | 'checkbox-group'
  | 'select-enum'
  | 'select-options'
  | 'textarea'
  | 'range'
  | 'text'
  | 'number'
  | 'toggle'
  | 'array';

/**
 * Resolve the basic field type for a schema.
 *
 * Returns `null` when none of the basic cases match, so the caller applies its
 * own special cases (hidden, autocomplete, ports, heavy editors, registry
 * overrides) first and its fallback last. Its one caller is the internal
 * `FieldFactory`, which both `FormFieldLight` and `FormFieldFull` render.
 *
 * A `type` array is read by its first member that is not `null` (spec SCH-9), so
 * `['integer', 'null']` is a number field. A schema with no usable type (absent,
 * empty array, only `null`) gets `null` here and is edited as JSON by
 * `resolveHeavyEditorKind`, because it accepts any JSON value (SCH-10).
 *
 * Order matters: `enum` and `oneOf` are checked before the primitive `type`
 * branches because option schemas frequently carry `type: 'string'`.
 */
export function resolveBaseFieldType(schema: FieldSchema): BaseFieldType | null {
  const type = firstNonNullType(schema.type);

  // Enum with multiple selection -> checkbox group
  if (schema.enum && schema.multiple) {
    return 'checkbox-group';
  }

  // Enum with single selection -> select
  if (schema.enum) {
    return 'select-enum';
  }

  // oneOf with labeled options (standard JSON Schema) -> select
  if (schema.oneOf && schema.oneOf.length > 0) {
    return 'select-options';
  }

  // Multiline string -> textarea
  if (type === 'string' && schema.format === 'multiline') {
    return 'textarea';
  }

  // Range slider for number/integer with format: "range"
  if ((type === 'number' || type === 'integer' || type === 'float') && schema.format === 'range') {
    return 'range';
  }

  // String -> text field
  if (type === 'string') {
    return 'text';
  }

  // Number, integer or the deprecated `float` -> number field
  if (type === 'number' || type === 'integer' || type === 'float') {
    return 'number';
  }

  // Boolean -> toggle
  if (type === 'boolean') {
    return 'toggle';
  }

  // Array -> array field
  if (type === 'array') {
    return 'array';
  }

  return null;
}

/** Whether the schema lists its own options, which a select renders whatever the type. */
function hasOptions(schema: FieldSchema): boolean {
  return !!schema.enum || (Array.isArray(schema.oneOf) && schema.oneOf.length > 0);
}

/** The editors too heavy for the light `/form` entry (CodeMirror and friends). */
export type HeavyEditorKind = 'code-editor' | 'markdown-editor' | 'template-editor';

/** Formats the factory renders itself even on an `object` (`ports` is one). */
const OBJECT_FORMATS_WITH_OWN_FIELD = new Set(['hidden', 'autocomplete', 'ports']);

/**
 * Which heavy editor a schema asks for, or `null` for none. The light factory
 * renders it from the field registry, or from the statically bundled set that
 * `FormFieldFull` passes in, or as a plain textarea with a registration hint.
 * A registered component for the schema wins before this is consulted.
 * A schema with no type (see `resolveBaseFieldType`) is edited as JSON too, unless it
 * lists `enum`/`oneOf` options.
 */
export function resolveHeavyEditorKind(schema: FieldSchema): HeavyEditorKind | null {
  const type = firstNonNullType(schema.type);

  if (schema.format === 'json' || schema.format === 'code') {
    return 'code-editor';
  }

  if (schema.format === 'markdown') {
    return 'markdown-editor';
  }

  if (schema.format === 'template') {
    return 'template-editor';
  }

  // An object is edited as JSON unless its format is one the factory renders
  // itself. An unknown format must not fall through to a text field, which
  // would show "[object Object]" and save a string over the object.
  if (
    (type === 'object' || (type === undefined && !hasOptions(schema))) &&
    !OBJECT_FORMATS_WITH_OWN_FIELD.has(schema.format ?? '')
  ) {
    return 'code-editor';
  }

  return null;
}
