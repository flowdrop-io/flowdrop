/**
 * Unit Tests - resolveBaseFieldType
 *
 * The shared field-type decision used by both FormField (full) and
 * FormFieldLight. These tests lock in the basic-type resolution order so the
 * two factories cannot silently drift apart.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveBaseFieldType,
  resolveHeavyEditorKind
} from '$lib/components/form/resolveFieldType.js';
import type { FieldSchema } from '$lib/components/form/types.js';

describe('resolveBaseFieldType', () => {
  it('resolves enum with multiple selection to checkbox-group', () => {
    expect(resolveBaseFieldType({ type: 'string', enum: ['a', 'b'], multiple: true })).toBe(
      'checkbox-group'
    );
  });

  it('resolves single-select enum to select-enum', () => {
    expect(resolveBaseFieldType({ type: 'string', enum: ['a', 'b'] })).toBe('select-enum');
  });

  it('resolves oneOf to select-options', () => {
    expect(resolveBaseFieldType({ type: 'string', oneOf: [{ const: 'a', title: 'A' }] })).toBe(
      'select-options'
    );
  });

  it('prefers enum/oneOf over the primitive type (option schemas often carry type: string)', () => {
    expect(resolveBaseFieldType({ type: 'string', enum: ['a'] })).toBe('select-enum');
    expect(resolveBaseFieldType({ type: 'string', oneOf: [{ const: 'a' }] })).toBe(
      'select-options'
    );
  });

  it('resolves multiline string to textarea', () => {
    expect(resolveBaseFieldType({ type: 'string', format: 'multiline' })).toBe('textarea');
  });

  it('resolves number/integer with range format to range', () => {
    expect(resolveBaseFieldType({ type: 'number', format: 'range' })).toBe('range');
    expect(resolveBaseFieldType({ type: 'integer', format: 'range' })).toBe('range');
  });

  it('resolves plain primitives', () => {
    expect(resolveBaseFieldType({ type: 'string' })).toBe('text');
    expect(resolveBaseFieldType({ type: 'number' })).toBe('number');
    expect(resolveBaseFieldType({ type: 'integer' })).toBe('number');
    expect(resolveBaseFieldType({ type: 'boolean' })).toBe('toggle');
    expect(resolveBaseFieldType({ type: 'array' })).toBe('array');
  });

  it('reads a type array by its first member that is not null (SCH-9)', () => {
    expect(resolveBaseFieldType({ type: ['string', 'null'] })).toBe('text');
    expect(resolveBaseFieldType({ type: ['null', 'string'] })).toBe('text');
    expect(resolveBaseFieldType({ type: ['integer', 'null'] })).toBe('number');
    expect(resolveBaseFieldType({ type: ['boolean', 'null'] })).toBe('toggle');
    expect(resolveBaseFieldType({ type: ['array', 'null'] })).toBe('array');
    expect(resolveBaseFieldType({ type: ['number', 'null'], format: 'range' })).toBe('range');
    expect(resolveBaseFieldType({ type: ['string', 'null'], format: 'multiline' })).toBe(
      'textarea'
    );
    expect(resolveBaseFieldType({ type: ['string', 'null'], enum: ['a', null] })).toBe(
      'select-enum'
    );
  });

  it('defers a null-only or empty type array, like an absent type', () => {
    expect(resolveBaseFieldType({ type: ['null'] })).toBeNull();
    expect(resolveBaseFieldType({ type: 'null' })).toBeNull();
    expect(resolveBaseFieldType({ type: [] })).toBeNull();
  });

  it('returns null for cases the caller must decide (object, no type, unknown)', () => {
    // object / autocomplete / editors / hidden are handled by each factory
    // BEFORE delegating here — the resolver must defer, not guess.
    expect(resolveBaseFieldType({ type: 'object' })).toBeNull();
    expect(resolveBaseFieldType({} as FieldSchema)).toBeNull();
  });
});

describe('resolveHeavyEditorKind with type arrays and no type', () => {
  it('edits a field with no type as JSON, since it accepts any JSON value (SCH-10)', () => {
    expect(resolveHeavyEditorKind({} as FieldSchema)).toBe('code-editor');
    expect(resolveHeavyEditorKind({ title: 'Any' })).toBe('code-editor');
  });

  it('edits an empty or null-only type array as JSON', () => {
    expect(resolveHeavyEditorKind({ type: [] })).toBe('code-editor');
    expect(resolveHeavyEditorKind({ type: ['null'] })).toBe('code-editor');
  });

  it('keeps a typeless field with options as a select, and the own-field formats out', () => {
    expect(resolveHeavyEditorKind({ enum: ['a', 'b'] })).toBeNull();
    expect(resolveHeavyEditorKind({ oneOf: [{ const: 'a' }] })).toBeNull();
    expect(resolveHeavyEditorKind({ format: 'ports' })).toBeNull();
    expect(resolveHeavyEditorKind({ format: 'hidden' })).toBeNull();
  });

  it('reads an object type array by its first non-null member', () => {
    expect(resolveHeavyEditorKind({ type: ['object', 'null'] })).toBe('code-editor');
    expect(resolveHeavyEditorKind({ type: ['string', 'null'] })).toBeNull();
  });

  it('keeps format: json as the code editor whatever the type', () => {
    expect(resolveHeavyEditorKind({ type: ['string', 'null'], format: 'json' })).toBe(
      'code-editor'
    );
    expect(resolveHeavyEditorKind({ type: 'string', format: 'json' })).toBe('code-editor');
  });
});
