import { describe, it, expect } from 'vitest';
import {
  REMOVE_KEY,
  isClearedValue,
  toEdit,
  buildConfig,
  mergeValues
} from '$lib/utils/formMerge.js';

const ac = { type: 'string', format: 'autocomplete', autocomplete: { url: '/x' } };

describe('isClearedValue (#72)', () => {
  it.each([
    ['text', { type: 'string' }, ''],
    ['textarea', { type: 'string', format: 'multiline' }, ''],
    ['number', { type: 'number' }, ''],
    ['integer', { type: 'integer' }, ''],
    ['select (enum, no empty option)', { type: 'string', enum: ['a', 'b'] }, ''],
    ['select (oneOf, no empty option)', { type: 'string', oneOf: [{ const: 'a' }] }, ''],
    ['autocomplete single', ac, ''],
    ['autocomplete multiple', { ...ac, type: 'array' }, []]
  ])('%s: empty is a clear', (_n, field, value) => {
    expect(isClearedValue(field, value)).toBe(true);
  });

  it.each([
    ['select (enum listing an empty option)', { type: 'string', enum: ['', 'a'] }, ''],
    [
      'select (oneOf listing an empty option)',
      { type: 'string', oneOf: [{ const: '' }, { const: 'a' }] },
      ''
    ],
    ['checkbox false', { type: 'boolean' }, false],
    ['null', { type: 'string' }, null],
    ['a value', { type: 'string' }, 'a'],
    ['zero', { type: 'number' }, 0],
    ['code editor', { type: 'string', format: 'code' }, ''],
    ['json editor', { type: 'string', format: 'json' }, ''],
    ['markdown editor', { type: 'string', format: 'markdown' }, ''],
    ['template editor', { type: 'string', format: 'template' }, ''],
    ['array field', { type: 'array', items: { type: 'string' } }, []],
    ['checkbox group', { type: 'array', enum: ['a'], multiple: true }, []],
    ['object', { type: 'object' }, {}],
    ['range', { type: 'number', format: 'range' }, ''],
    ['autocomplete with items', { ...ac, type: 'array' }, ['a']],
    ['unknown field', undefined, '']
  ])('%s: not a clear', (_n, field, value) => {
    expect(isClearedValue(field, value)).toBe(false);
  });
});

describe('toEdit / buildConfig / mergeValues (#72)', () => {
  const schema = {
    properties: {
      a: { type: 'string' },
      b: { type: 'string', default: 'd' },
      c: { type: 'string' }
    }
  };

  it('toEdit returns the marker for a clear and the value otherwise', () => {
    expect(toEdit({ type: 'string' }, '')).toBe(REMOVE_KEY);
    expect(toEdit({ type: 'string' }, 'x')).toBe('x');
    expect(toEdit({ type: ['integer', 'null'] }, undefined)).toBe(REMOVE_KEY);
    expect(toEdit({ type: ['integer', 'null'] }, null)).toBeNull();
  });

  it('merge shows a removed key as empty and an absent key as undefined (no default merged)', () => {
    expect(mergeValues(schema, { a: 'x', b: 'y' }, { a: REMOVE_KEY, b: REMOVE_KEY })).toEqual({
      a: undefined,
      b: undefined,
      c: undefined
    });
    expect(mergeValues(schema, {}, {})).toEqual({ a: undefined, b: undefined, c: undefined });
  });

  it('buildConfig drops removed keys and undefined merges; "all" refills defaults, a list only its keys', () => {
    const source = { a: 'x', b: 'y', extra: 1 };
    const edits = { a: REMOVE_KEY, b: REMOVE_KEY };
    const merged = mergeValues(schema, source, edits);
    expect(buildConfig(schema, source, merged, edits, [])).toStrictEqual({ extra: 1 });
    expect(buildConfig(schema, source, merged, edits, ['c'])).toStrictEqual({ extra: 1 });
    expect(buildConfig(schema, source, merged, edits, ['b'])).toStrictEqual({ extra: 1, b: 'd' });
    expect(buildConfig(schema, source, merged, edits, 'all')).toStrictEqual({ extra: 1, b: 'd' });
  });

  it('buildConfig keeps a stored empty value that was not cleared', () => {
    const source = { a: '', c: [] };
    const merged = mergeValues(schema, source, {});
    expect(buildConfig(schema, source, merged, {}, [])).toStrictEqual({ a: '', c: [] });
    expect(buildConfig(schema, source, merged, {})).toStrictEqual({ a: '', b: 'd', c: [] });
  });

  it('buildConfig does not share a default object with the schema', () => {
    const s = { properties: { list: { type: 'array', default: [1] } } };
    const out = buildConfig(s, {}, mergeValues(s, {}, {}), {}) as { list: number[] };
    expect(out.list).toEqual([1]);
    expect(out.list).not.toBe(s.properties.list.default);
  });
});
