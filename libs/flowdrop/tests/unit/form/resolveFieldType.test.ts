/**
 * Unit Tests - resolveBaseFieldType
 *
 * The shared field-type decision used by both FormField (full) and
 * FormFieldLight. These tests lock in the basic-type resolution order so the
 * two factories cannot silently drift apart.
 */

import { describe, it, expect } from 'vitest';
import { resolveBaseFieldType } from '$lib/components/form/resolveFieldType.js';
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

  it('returns null for cases the caller must decide (object, no type, unknown)', () => {
    // object / autocomplete / editors / hidden are handled by each factory
    // BEFORE delegating here — the resolver must defer, not guess.
    expect(resolveBaseFieldType({ type: 'object' })).toBeNull();
    expect(resolveBaseFieldType({} as FieldSchema)).toBeNull();
  });
});
