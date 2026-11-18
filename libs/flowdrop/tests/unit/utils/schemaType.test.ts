import { describe, it, expect } from 'vitest';
import { firstNonNullType, schemaAdmitsNull, typeAdmitsNull } from '$lib/utils/schemaType.js';

describe('firstNonNullType', () => {
  it('returns a type word as is', () => {
    expect(firstNonNullType('integer')).toBe('integer');
  });

  it('returns the first member of an array that is not null', () => {
    expect(firstNonNullType(['null', 'integer', 'string'])).toBe('integer');
    expect(firstNonNullType(['string', 'null'])).toBe('string');
  });

  it('has none for absent, empty and null-only types', () => {
    expect(firstNonNullType(undefined)).toBeUndefined();
    expect(firstNonNullType([])).toBeUndefined();
    expect(firstNonNullType(['null'])).toBeUndefined();
    expect(firstNonNullType('null')).toBeUndefined();
  });
});

describe('schemaAdmitsNull', () => {
  it('admits null when the type lists it or the enum does', () => {
    expect(typeAdmitsNull(['string', 'null'])).toBe(true);
    expect(schemaAdmitsNull({ type: ['string', 'null'] })).toBe(true);
    expect(schemaAdmitsNull({ type: 'string', enum: ['a', null] })).toBe(true);
  });

  it('does not admit null otherwise, including an absent type', () => {
    expect(schemaAdmitsNull({ type: 'string' })).toBe(false);
    expect(schemaAdmitsNull({ type: ['string', 'integer'] })).toBe(false);
    expect(schemaAdmitsNull({ type: 'string', enum: ['a', 'b'] })).toBe(false);
    expect(schemaAdmitsNull({})).toBe(false);
  });
});
