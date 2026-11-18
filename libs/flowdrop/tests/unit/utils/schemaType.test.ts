import { describe, it, expect, vi } from 'vitest';
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
  it('admits null when type and enum both allow it and one of them names it', () => {
    expect(typeAdmitsNull(['string', 'null'])).toBe(true);
    expect(schemaAdmitsNull({ type: ['string', 'null'] })).toBe(true);
    expect(schemaAdmitsNull({ enum: ['a', null] })).toBe(true);
    expect(schemaAdmitsNull({ type: ['string', 'null'], enum: ['a', null] })).toBe(true);
  });

  it('does not admit null otherwise, including an absent type', () => {
    expect(schemaAdmitsNull({ type: 'string' })).toBe(false);
    expect(schemaAdmitsNull({ type: ['string', 'integer'] })).toBe(false);
    expect(schemaAdmitsNull({ type: 'string', enum: ['a', 'b'] })).toBe(false);
    expect(schemaAdmitsNull({})).toBe(false);
    // R6.i: null must pass type AND enum.
    expect(schemaAdmitsNull({ type: 'string', enum: ['a', null] })).toBe(false);
    expect(schemaAdmitsNull({ type: ['string', 'null'], enum: ['a', 'b'] })).toBe(false);
  });
});

describe('public entry point', () => {
  it('exports the type readers from @flowdrop/flowdrop/core', async () => {
    // The core entry reads the colour scheme while it loads.
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {}
    }));
    const core = await import('$lib/core/index.js');
    expect(core.firstNonNullType).toBe(firstNonNullType);
    expect(core.typeAdmitsNull).toBe(typeAdmitsNull);
    expect(core.schemaAdmitsNull).toBe(schemaAdmitsNull);
    // A cold import of the whole entry point: well under a second alone, but
    // slow on a loaded test box running every worker.
  }, 30_000);
});
