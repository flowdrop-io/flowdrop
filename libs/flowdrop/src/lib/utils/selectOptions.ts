/**
 * Pure logic behind the `Select` primitive and its searchable `Combobox`
 * rendering: which rendering a set of options gets, filtering, match
 * highlighting, grouping and keyboard movement. No DOM, so it is unit-tested
 * on its own.
 *
 * @module utils/selectOptions
 */

export interface SelectOption {
  /** Submitted value; options are identified by it, so it must be unique. */
  value: string;
  /** Visible text. */
  label: string;
  /** Muted second line. Forces the searchable rendering. */
  description?: string;
  /** Group title. Forces the searchable rendering. */
  group?: string;
  disabled?: boolean;
}

/** Above this many options the list is searchable; at or below it the browser's own select is kept. */
export const NATIVE_SELECT_MAX_OPTIONS = 10;

export type SelectRendering = 'native' | 'combobox';

/**
 * The rendering for a list of options. `searchable` forces one; left out, it
 * follows the options: a short, flat, description-free list is a real
 * `<select>`, anything else a searchable combobox.
 */
export function selectRendering(
  options: readonly SelectOption[],
  searchable?: boolean
): SelectRendering {
  if (searchable !== undefined) return searchable ? 'combobox' : 'native';
  if (options.length > NATIVE_SELECT_MAX_OPTIONS) return 'combobox';
  return options.some((o) => o.group || o.description) ? 'combobox' : 'native';
}

/** A run of text, flagged when it is what the query matched. */
export interface TextPart {
  text: string;
  match: boolean;
}

/** The query as lower-cased, non-empty terms; every term has to match. */
export function queryTerms(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

/**
 * Split `text` into plain and matched runs for the terms (case-insensitive,
 * overlapping or touching matches merge into one run).
 */
export function highlightParts(text: string, terms: readonly string[]): TextPart[] {
  if (terms.length === 0 || text === '') return [{ text, match: false }];
  const lower = text.toLowerCase();
  const ranges: Array<[number, number]> = [];
  for (const term of terms) {
    let from = 0;
    for (;;) {
      const at = lower.indexOf(term, from);
      if (at < 0) break;
      ranges.push([at, at + term.length]);
      from = at + term.length;
    }
  }
  if (ranges.length === 0) return [{ text, match: false }];
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([range[0], range[1]]);
  }
  const parts: TextPart[] = [];
  let cursor = 0;
  for (const [start, end] of merged) {
    if (start > cursor) parts.push({ text: text.slice(cursor, start), match: false });
    parts.push({ text: text.slice(start, end), match: true });
    cursor = end;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), match: false });
  return parts;
}

export interface FilteredOption {
  option: SelectOption;
  label: TextPart[];
  description: TextPart[] | undefined;
}

/** Options matching every term in their label, description or group, in their original order. */
export function filterOptions(options: readonly SelectOption[], query: string): FilteredOption[] {
  const terms = queryTerms(query);
  const out: FilteredOption[] = [];
  for (const option of options) {
    const haystack = [option.label, option.description ?? '', option.group ?? ''].join('\n');
    const lower = haystack.toLowerCase();
    if (!terms.every((term) => lower.includes(term))) continue;
    out.push({
      option,
      label: highlightParts(option.label, terms),
      description: option.description ? highlightParts(option.description, terms) : undefined
    });
  }
  return out;
}

export interface OptionGroup {
  /** `undefined` for options without a group (listed first, no title). */
  title: string | undefined;
  items: FilteredOption[];
}

/** Bucket options by group, in order of first appearance; ungrouped options lead. */
export function groupOptions(items: readonly FilteredOption[]): OptionGroup[] {
  const ungrouped: FilteredOption[] = [];
  const byTitle = new Map<string, FilteredOption[]>();
  for (const item of items) {
    const title = item.option.group;
    if (!title) {
      ungrouped.push(item);
      continue;
    }
    const bucket = byTitle.get(title);
    if (bucket) bucket.push(item);
    else byTitle.set(title, [item]);
  }
  const groups: OptionGroup[] = [];
  if (ungrouped.length > 0) groups.push({ title: undefined, items: ungrouped });
  for (const [title, bucket] of byTitle) groups.push({ title, items: bucket });
  return groups;
}

/** Items in the order they are shown (grouped), the order the arrow keys walk. */
export function displayOrder(groups: readonly OptionGroup[]): FilteredOption[] {
  return groups.flatMap((g) => g.items);
}

/**
 * The index an arrow key / Home / End lands on, skipping disabled options.
 * `current` is -1 when nothing is highlighted. Stays put at the ends; returns
 * -1 when no option is enabled.
 */
export function moveHighlight(
  items: readonly FilteredOption[],
  current: number,
  key: 'ArrowDown' | 'ArrowUp' | 'Home' | 'End'
): number {
  const enabled = (i: number) => !items[i]?.option.disabled;
  const first = items.findIndex((_, i) => enabled(i));
  if (first < 0) return -1;
  let last = items.length - 1;
  while (!enabled(last)) last--;
  if (key === 'Home') return first;
  if (key === 'End') return last;
  const step = key === 'ArrowDown' ? 1 : -1;
  let i = current + step;
  while (i >= 0 && i < items.length && !enabled(i)) i += step;
  if (i < 0 || i >= items.length) return current < 0 ? (step > 0 ? first : last) : current;
  return i;
}
