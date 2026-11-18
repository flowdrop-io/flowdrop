import { describe, it, expect } from 'vitest';
import {
  REMOVE_KEY,
  isClearedValue,
  toEdit,
  buildConfig,
  mergeWithDefaults
} from '$lib/utils/formMerge.js';

const ac = { type: 'string', format: 'autocomplete', autocomplete: { url: '/x' } };

describe('isClearedValue (#72)', () => {
  it.each([
    ['text', { type: 'string' }, ''],
    ['textarea', { type: 'string', format: 'multiline' }, ''],
    ['number', { type: 'number' }, ''],
    ['integer', { type: 'integer' }, ''],
    ['select (enum)', { type: 'string', enum: ['', 'a'] }, ''],
    ['select (oneOf)', { type: 'string', oneOf: [{ const: 'a' }] }, ''],
    ['autocomplete single', ac, ''],
    ['autocomplete multiple', { ...ac, type: 'array' }, []]
  ])('%s: empty is a clear', (_n, field, value) => {
    expect(isClearedValue(field, value)).toBe(true);
  });

  it.each([
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

describe('toEdit / buildConfig / mergeWithDefaults (#72)', () => {
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
  });

  it('merge shows the default for a removed key', () => {
    expect(mergeWithDefaults(schema, { a: 'x', b: 'y' }, { a: REMOVE_KEY, b: REMOVE_KEY })).toEqual(
      {
        a: undefined,
        b: 'd',
        c: undefined
      }
    );
  });

  it('buildConfig drops removed keys (even with a default) and undefined merges', () => {
    const source = { a: 'x', b: 'y', extra: 1 };
    const edits = { a: REMOVE_KEY, b: REMOVE_KEY };
    const out = buildConfig(source, mergeWithDefaults(schema, source, edits), edits);
    expect(out).toStrictEqual({ extra: 1 });
  });

  it('buildConfig keeps a stored empty value that was not cleared', () => {
    const source = { a: '', c: [] };
    const out = buildConfig(source, mergeWithDefaults(schema, source, {}), {});
    expect(out).toStrictEqual({ a: '', b: 'd', c: [] });
  });
});
