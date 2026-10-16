/**
 * Item references: a scalar config field that names an item of an array field
 * in the same config, declared with the `x-item-ref` schema hint:
 *
 * ```json
 * "default_branch": { "type": "string", "x-item-ref": { "array": "branches", "key": "name" } }
 * ```
 *
 * The form does not render such a field on its own. The referenced array shows
 * the reference as a "default" mark on the matching row instead, and keeps the
 * reference in step with the items (rename follows, delete clears). Nothing here
 * is specific to one node type; the storage stays the plain scalar field.
 *
 * Matching is case-insensitive and trimmed, like the runtime's branch matching,
 * so a stored `default` still marks a branch named `Default`.
 */

import { buildHandleId } from './handleIds.js';

/** The parsed `x-item-ref` hint. */
export interface ItemRefHint {
  /** Key of the array field the reference points into. */
  array: string;
  /** Key of the item property that holds the referenced name. */
  key: string;
}

/** What the referenced array shows for the current reference value. */
export type ItemRefStatus =
  /** An item matches: its row carries the mark. */
  | 'marked'
  /** The reference is empty: no item is marked. */
  | 'empty'
  /** The reference names no item. */
  | 'dangling'
  /** The referring field is wired: its value comes from an input at runtime. */
  | 'wired';

/** Everything the array needs to draw and edit a reference. */
export interface ItemRef {
  /** Key of the scalar field holding the reference. */
  field: string;
  /** Item property compared against the reference. */
  key: string;
  /** Current reference value (what the scalar field stores). */
  value: string;
  /** The referring field is wired to an input port. */
  wired: boolean;
  /** Write a new reference value. */
  onChange: (value: string) => void;
}

/** Read the hint off a field schema; undefined when absent or malformed. */
export function parseItemRef(schema: unknown): ItemRefHint | undefined {
  if (!schema || typeof schema !== 'object') return undefined;
  const hint = (schema as Record<string, unknown>)['x-item-ref'];
  if (!hint || typeof hint !== 'object') return undefined;
  const { array, key } = hint as Record<string, unknown>;
  if (typeof array !== 'string' || !array || typeof key !== 'string' || !key) return undefined;
  return { array, key };
}

/** The scalar field (if any) that references `arrayKey` through `x-item-ref`. */
export function findItemRefField(
  properties: Record<string, unknown> | undefined,
  arrayKey: string
): { field: string; hint: ItemRefHint } | undefined {
  for (const [field, schema] of Object.entries(properties ?? {})) {
    const hint = parseItemRef(schema);
    if (hint && hint.array === arrayKey) return { field, hint };
  }
  return undefined;
}

const normalize = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

function itemName(item: unknown, key: string): string {
  if (!item || typeof item !== 'object') return '';
  return normalize((item as Record<string, unknown>)[key]);
}

/** Index of the first item the reference names (case-insensitive), or -1. */
export function matchItemIndex(items: readonly unknown[], key: string, ref: unknown): number {
  const target = normalize(ref).toLowerCase();
  if (!target) return -1;
  return items.findIndex((item) => itemName(item, key).toLowerCase() === target);
}

/** Classify a reference against its items. */
export function itemRefStatus(
  items: readonly unknown[],
  key: string,
  ref: unknown,
  wired = false
): ItemRefStatus {
  if (wired) return 'wired';
  if (!normalize(ref)) return 'empty';
  return matchItemIndex(items, key, ref) >= 0 ? 'marked' : 'dangling';
}

/** A reference after an edit, plus the row to re-mark when its name comes back. */
export interface RefEdit {
  ref: string;
  /** Row whose name was emptied while marked; the next non-empty name re-marks it. */
  pending: number | null;
}

/**
 * The reference after the item at `index` was renamed.
 *
 * The marked row's new name becomes the reference. Emptying that name clears the
 * reference (nothing matches an empty name) but remembers the row in `pending`,
 * so typing a new name over it keeps the mark. Renaming any other row leaves the
 * reference alone, whatever the new name is.
 */
export function refAfterRename(
  items: readonly unknown[],
  key: string,
  ref: unknown,
  index: number,
  newName: string,
  pending: number | null = null
): RefEdit {
  const current = typeof ref === 'string' ? ref : '';
  const marked = matchItemIndex(items, key, ref) === index || (pending === index && !current);
  if (!marked) return { ref: current, pending };
  return normalize(newName) ? { ref: newName, pending: null } : { ref: '', pending: index };
}

/**
 * The reference after the item at `index` was deleted: cleared when that item
 * was the marked one, otherwise unchanged.
 */
export function refAfterDelete(
  items: readonly unknown[],
  key: string,
  ref: unknown,
  index: number
): string {
  const current = typeof ref === 'string' ? ref : '';
  return matchItemIndex(items, key, ref) === index ? '' : current;
}

/** Whether some edge feeds the node's input port named `field`. */
export function isFieldWired(
  nodeId: string | undefined,
  edges: ReadonlyArray<{ targetHandle?: string | null }> | undefined,
  field: string
): boolean {
  if (!nodeId || !edges?.length) return false;
  const handle = buildHandleId(nodeId, 'input', field);
  return edges.some((edge) => edge.targetHandle === handle);
}

/**
 * The reference for the array at `arrayKey`, when a sibling field points at it,
 * ready to hand to the array field; undefined otherwise.
 */
export function buildItemRef(
  properties: Record<string, unknown> | undefined,
  arrayKey: string,
  values: Record<string, unknown>,
  isWired: (field: string) => boolean,
  onFieldChange: (key: string, value: unknown) => void
): ItemRef | undefined {
  const found = findItemRefField(properties, arrayKey);
  if (!found) return undefined;
  const raw = values[found.field];
  return {
    field: found.field,
    key: found.hint.key,
    value: typeof raw === 'string' ? raw : '',
    wired: isWired(found.field),
    onChange: (value) => onFieldChange(found.field, value)
  };
}
