import type { FieldSchema } from './types.js';

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
 * Order matters: `enum` and `oneOf` are checked before the primitive `type`
 * branches because option schemas frequently carry `type: 'string'`.
 */
export function resolveBaseFieldType(schema: FieldSchema): BaseFieldType | null {
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
  if (schema.type === 'string' && schema.format === 'multiline') {
    return 'textarea';
  }

  // Range slider for number/integer with format: "range"
  if ((schema.type === 'number' || schema.type === 'integer') && schema.format === 'range') {
    return 'range';
  }

  // String -> text field
  if (schema.type === 'string') {
    return 'text';
  }

  // Number or integer -> number field
  if (schema.type === 'number' || schema.type === 'integer') {
    return 'number';
  }

  // Boolean -> toggle
  if (schema.type === 'boolean') {
    return 'toggle';
  }

  // Array -> array field
  if (schema.type === 'array') {
    return 'array';
  }

  return null;
}

/** The editors too heavy for the light `/form` entry (CodeMirror and friends). */
export type HeavyEditorKind = 'code-editor' | 'markdown-editor' | 'template-editor';

/**
 * Which heavy editor a schema asks for, or `null` for none. The light factory
 * renders it from the field registry, or from the statically bundled set that
 * `FormFieldFull` passes in, or as a plain textarea with a registration hint.
 * A registered component for the schema wins before this is consulted.
 */
export function resolveHeavyEditorKind(schema: FieldSchema): HeavyEditorKind | null {
  if (schema.format === 'json' || schema.format === 'code') {
    return 'code-editor';
  }

  if (schema.format === 'markdown') {
    return 'markdown-editor';
  }

  if (schema.format === 'template') {
    return 'template-editor';
  }

  // An object without a format is edited as JSON.
  if (schema.type === 'object' && !schema.format) {
    return 'code-editor';
  }

  return null;
}
