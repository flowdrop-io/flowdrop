import { describe, it, expect } from 'vitest';
import {
  findItemRefField,
  itemRefStatus,
  matchItemIndex,
  parseItemRef,
  refAfterDelete,
  refAfterRename
} from '$lib/utils/itemRef.js';

const items = [{ name: 'Default' }, { name: 'Article' }, { name: 'Page' }];

describe('parseItemRef', () => {
  it('reads a well-formed hint', () => {
    expect(parseItemRef({ 'x-item-ref': { array: 'branches', key: 'name' } })).toEqual({
      array: 'branches',
      key: 'name'
    });
  });

  it.each([undefined, null, {}, { 'x-item-ref': 'branches' }, { 'x-item-ref': { array: 'a' } }])(
    'ignores a missing or malformed hint (%j)',
    (schema) => {
      expect(parseItemRef(schema)).toBeUndefined();
    }
  );
});

describe('findItemRefField', () => {
  it('finds the scalar field that references an array', () => {
    const properties = {
      branches: { type: 'array' },
      default_branch: { type: 'string', 'x-item-ref': { array: 'branches', key: 'name' } }
    };
    expect(findItemRefField(properties, 'branches')).toEqual({
      field: 'default_branch',
      hint: { array: 'branches', key: 'name' }
    });
    expect(findItemRefField(properties, 'other')).toBeUndefined();
  });
});

describe('matchItemIndex', () => {
  it('matches case-insensitively, so a stored "default" marks "Default"', () => {
    expect(matchItemIndex(items, 'name', 'default')).toBe(0);
    expect(matchItemIndex(items, 'name', ' PAGE ')).toBe(2);
  });

  it('matches nothing for an empty or unknown reference', () => {
    expect(matchItemIndex(items, 'name', '')).toBe(-1);
    expect(matchItemIndex(items, 'name', undefined)).toBe(-1);
    expect(matchItemIndex(items, 'name', 'missing')).toBe(-1);
  });
});

describe('itemRefStatus', () => {
  it('marks, is empty, or dangles', () => {
    expect(itemRefStatus(items, 'name', 'article')).toBe('marked');
    expect(itemRefStatus(items, 'name', '')).toBe('empty');
    expect(itemRefStatus(items, 'name', 'gone')).toBe('dangling');
  });

  it('is wired whatever the value, so the marks are disabled', () => {
    expect(itemRefStatus(items, 'name', 'article', true)).toBe('wired');
    expect(itemRefStatus(items, 'name', 'gone', true)).toBe('wired');
  });
});

describe('refAfterRename', () => {
  it('follows the marked item', () => {
    expect(refAfterRename(items, 'name', 'default', 0, 'Fallback')).toEqual({
      ref: 'Fallback',
      pending: null
    });
  });

  it('ignores a rename of another item', () => {
    expect(refAfterRename(items, 'name', 'default', 1, 'Story')).toEqual({
      ref: 'default',
      pending: null
    });
  });

  it('keeps the mark through a rename that passes through an empty name', () => {
    const emptied = refAfterRename(items, 'name', 'Default', 0, '');
    expect(emptied).toEqual({ ref: '', pending: 0 });
    const typed = refAfterRename(
      [{ name: '' }, ...items.slice(1)],
      'name',
      emptied.ref,
      0,
      'F',
      emptied.pending
    );
    expect(typed).toEqual({ ref: 'F', pending: null });
  });

  it('does not mark an unrelated empty row when no reference was set', () => {
    const rows = [{ name: '' }, { name: 'a' }];
    expect(refAfterRename(rows, 'name', '', 0, 'x')).toEqual({ ref: '', pending: null });
  });
});

describe('refAfterDelete', () => {
  it('clears the reference when the marked item is deleted', () => {
    expect(refAfterDelete(items, 'name', 'default', 0)).toBe('');
  });

  it('keeps it when another item is deleted', () => {
    expect(refAfterDelete(items, 'name', 'default', 2)).toBe('default');
  });

  it('leaves a dangling reference as it is', () => {
    expect(refAfterDelete(items, 'name', 'gone', 1)).toBe('gone');
  });
});
