import type { FieldSchema } from './types.js';

/**
 * The dependency-free field kinds that {@link FormField} and
 * {@link FormFieldLight} render identically — i.e. everything that does not
 * pull in a heavy editor or depend on the field registry.
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
 * Resolve the basic field type for a schema — the single source of truth for
 * the decision both the full and light field factories share.
 *
 * Returns `null` when none of the basic cases match, so each caller can apply
 * its OWN special-case handling and fallback in its own order. The heavy and
 * entry-point-specific cases (hidden, autocomplete, code/markdown/template
 * editors, `object` → editor, registry-resolved components) are deliberately
 * NOT decided here: `FormField` and `FormFieldLight` route those differently
 * (static imports vs. the lazy field registry that keeps the `/form` light
 * entry free of heavy deps), and must keep doing so before delegating here.
 *
 * Order matters and mirrors the original in-component chains: `enum` and
 * `oneOf` are checked before the primitive `type` branches because option
 * schemas frequently carry `type: 'string'`.
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
