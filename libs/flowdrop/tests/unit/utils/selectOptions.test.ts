import { describe, it, expect } from 'vitest';
import {
  displayOrder,
  filterOptions,
  groupOptions,
  highlightParts,
  moveHighlight,
  selectRendering,
  NATIVE_SELECT_MAX_OPTIONS,
  type SelectOption
} from '$lib/utils/selectOptions.js';

const plain = (n: number): SelectOption[] =>
  Array.from({ length: n }, (_, i) => ({ value: `v${i}`, label: `Option ${i}` }));

describe('selectRendering', () => {
  it('keeps the native select for a short, flat list', () => {
    expect(selectRendering(plain(1))).toBe('native');
    expect(selectRendering(plain(NATIVE_SELECT_MAX_OPTIONS))).toBe('native');
  });

  it('switches to the combobox above ten options', () => {
    expect(selectRendering(plain(NATIVE_SELECT_MAX_OPTIONS + 1))).toBe('combobox');
  });

  it('switches to the combobox for a group or a description, however short', () => {
    expect(selectRendering([{ value: 'a', label: 'A', group: 'G' }])).toBe('combobox');
    expect(selectRendering([{ value: 'a', label: 'A', description: 'd' }])).toBe('combobox');
  });

  it('lets `searchable` force either rendering', () => {
    expect(selectRendering(plain(3), true)).toBe('combobox');
    expect(selectRendering(plain(30), false)).toBe('native');
    expect(selectRendering([{ value: 'a', label: 'A', group: 'G' }], false)).toBe('native');
  });
});

describe('highlightParts', () => {
  it('flags every case-insensitive occurrence', () => {
    expect(highlightParts('Chat chat', ['chat'])).toEqual([
      { text: 'Chat', match: true },
      { text: ' ', match: false },
      { text: 'chat', match: true }
    ]);
  });

  it('merges overlapping terms into one run', () => {
    expect(highlightParts('message', ['mess', 'sage'])).toEqual([{ text: 'message', match: true }]);
  });

  it('returns the text untouched without terms or without a hit', () => {
    expect(highlightParts('abc', [])).toEqual([{ text: 'abc', match: false }]);
    expect(highlightParts('abc', ['z'])).toEqual([{ text: 'abc', match: false }]);
  });
});

describe('filterOptions', () => {
  const options: SelectOption[] = [
    { value: '1', label: 'chat_message', description: 'The chat message content', group: 'Chat' },
    { value: '2', label: 'result', description: 'Final answer', group: 'Output' },
    { value: '3', label: 'Other' }
  ];

  it('returns everything for an empty query', () => {
    expect(filterOptions(options, '  ')).toHaveLength(3);
  });

  it('matches label, description and group, requiring every word', () => {
    expect(filterOptions(options, 'answer').map((f) => f.option.value)).toEqual(['2']);
    expect(filterOptions(options, 'output result').map((f) => f.option.value)).toEqual(['2']);
    expect(filterOptions(options, 'output chat')).toHaveLength(0);
  });

  it('carries the highlight parts for label and description', () => {
    const [hit] = filterOptions(options, 'chat');
    expect(hit.label[0]).toEqual({ text: 'chat', match: true });
    expect(hit.description?.some((p) => p.match)).toBe(true);
  });
});

describe('groupOptions / displayOrder', () => {
  const options: SelectOption[] = [
    { value: 'a', label: 'A', group: 'X' },
    { value: 'b', label: 'B' },
    { value: 'c', label: 'C', group: 'Y' },
    { value: 'd', label: 'D', group: 'X' }
  ];
  const groups = groupOptions(filterOptions(options, ''));

  it('lists ungrouped options first, then groups in order of first appearance', () => {
    expect(groups.map((g) => g.title)).toEqual([undefined, 'X', 'Y']);
    expect(groups[1].items.map((i) => i.option.value)).toEqual(['a', 'd']);
  });

  it('walks options in the order they are shown', () => {
    expect(displayOrder(groups).map((i) => i.option.value)).toEqual(['b', 'a', 'd', 'c']);
  });
});

describe('moveHighlight', () => {
  const items = filterOptions(
    [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B', disabled: true },
      { value: 'c', label: 'C' },
      { value: 'd', label: 'D', disabled: true }
    ],
    ''
  );

  it('skips disabled options and stops at the ends', () => {
    expect(moveHighlight(items, -1, 'ArrowDown')).toBe(0);
    expect(moveHighlight(items, 0, 'ArrowDown')).toBe(2);
    expect(moveHighlight(items, 2, 'ArrowDown')).toBe(2);
    expect(moveHighlight(items, 2, 'ArrowUp')).toBe(0);
    expect(moveHighlight(items, 0, 'ArrowUp')).toBe(0);
  });

  it('Home and End land on the first and last enabled option', () => {
    expect(moveHighlight(items, 2, 'Home')).toBe(0);
    expect(moveHighlight(items, 0, 'End')).toBe(2);
  });

  it('answers -1 when nothing can be highlighted', () => {
    expect(moveHighlight([], -1, 'ArrowDown')).toBe(-1);
  });
});
