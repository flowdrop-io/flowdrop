/**
 * Interface tags: the canvas view of `workflow.interface`.
 *
 * A tag `[id · Type>` is drawn beside a port that a `WorkflowInterfaceEntry`
 * binds, so the public name, the type and the direction are visible on the
 * canvas. A tag is a view only: the data stays in `workflow.interface`. This
 * module holds the pure parts: which tags a workflow has, how an id is
 * checked and shortened, how wide a tag is, and the interface edits the tag
 * actions (expose, rename, remove) make. Never throws, never mutates.
 *
 * @module utils/interfaceTags
 */

import type { Workflow, WorkflowInterface, WorkflowInterfaceEntry } from '$lib/types/index.js';
import type { InterfaceInputEdit } from '$lib/utils/playgroundChat.js';
import { buildHandleId } from '$lib/utils/handleIds.js';
import {
  entryFromBindablePort,
  listBindablePorts,
  resolveInterface,
  type BindablePort
} from '$lib/utils/workflowInterface.js';

export type InterfaceDirection = 'input' | 'output';

/** Ids longer than this are shortened on the canvas (the full id is the tooltip). */
export const INTERFACE_TAG_MAX_ID_CHARS = 16;

/** Below this zoom the tag drops its text and keeps its shape and swatch. */
export const INTERFACE_TAG_TEXT_MIN_ZOOM = 0.6;

/** Free space between a port and its tag, in flow px. */
export const INTERFACE_TAG_GAP = 20;

/**
 * Shorten an id to at most `max` characters, ending in an ellipsis when it was
 * cut. Counts code points so a surrogate pair is never split.
 */
export function truncateInterfaceId(id: string, max: number = INTERFACE_TAG_MAX_ID_CHARS): string {
  const chars = Array.from(id);
  if (chars.length <= max) return id;
  return chars.slice(0, Math.max(1, max - 1)).join('') + '…';
}

/** Why an id cannot be used for an entry. */
export type InterfaceIdError = 'empty' | 'duplicate';

/**
 * Check an id for a new or renamed entry. Ids are unique within their
 * direction (inputs and outputs are scoped separately). `ownId` is the id the
 * entry has now, so keeping it is not a duplicate.
 */
export function validateInterfaceId(
  id: string,
  direction: InterfaceDirection,
  workflowInterface: WorkflowInterface | undefined,
  ownId?: string
): InterfaceIdError | null {
  const trimmed = id.trim();
  if (trimmed === '') return 'empty';
  const entries =
    (direction === 'input' ? workflowInterface?.inputs : workflowInterface?.outputs) ?? [];
  if (entries.some((entry) => entry.id === trimmed && entry.id !== ownId)) return 'duplicate';
  return null;
}

/** One tag to draw: an entry bound to a live, exposed port. */
export interface InterfaceTagModel {
  /** Stable across edits of the id: direction, node and port. */
  key: string;
  direction: InterfaceDirection;
  entry: WorkflowInterfaceEntry;
  nodeId: string;
  portId: string;
  handleId: string;
  /** Declared and port types, set when they differ. */
  mismatch?: { declared: string; port: string };
}

/** Every tag a workflow shows: its `ok` and `type-mismatch` entries. */
export function interfaceTagModels(workflow: Workflow): InterfaceTagModel[] {
  const tags: InterfaceTagModel[] = [];
  for (const resolved of resolveInterface(workflow)) {
    if (resolved.status !== 'ok' && resolved.status !== 'type-mismatch') continue;
    const target = resolved.targets[0];
    if (!target) continue;
    const handleId = buildHandleId(target.node.id, target.direction, target.port.id);
    tags.push({
      key: `${resolved.direction}:${handleId}`,
      direction: resolved.direction,
      entry: resolved.entry,
      nodeId: target.node.id,
      portId: target.port.id,
      handleId,
      ...(resolved.status === 'type-mismatch' && {
        mismatch: { declared: resolved.entry.dataType, port: target.port.dataType }
      })
    });
  }
  return tags;
}

/** The label a tag's type part reads: "String", or "Array ≠ String" on a mismatch. */
export function interfaceTagTypeText(
  model: Pick<InterfaceTagModel, 'entry' | 'mismatch'>,
  typeName: (dataType: string) => string
): string {
  return model.mismatch
    ? `${typeName(model.mismatch.declared)} ≠ ${typeName(model.mismatch.port)}`
    : typeName(model.entry.dataType);
}

/**
 * Average glyph advance of the tag's mono id and its type text, and the fixed
 * parts (swatch, paddings, tip), in px. Layout reserves a tag's room from
 * these numbers instead of measuring the DOM; the tag's own width comes from
 * its text, so a close estimate is all that is needed.
 */
const ID_CHAR_PX = 6.1;
const TYPE_CHAR_PX = 5.2;
const TAG_FIXED_PX = 26;
const TAG_TYPE_GAP_PX = 8;

/** The width of a tag in flow px (without the gap to its port). */
export function estimateInterfaceTagWidth(id: string, typeText: string): number {
  const shown = truncateInterfaceId(id);
  return Math.round(
    TAG_FIXED_PX +
      Array.from(shown).length * ID_CHAR_PX +
      (typeText ? TAG_TYPE_GAP_PX + Array.from(typeText).length * TYPE_CHAR_PX : 0)
  );
}

/** Room each node needs beside it for its tags: `left` for inputs, `right` for outputs. */
export function interfaceTagReserve(
  workflow: Workflow,
  typeName: (dataType: string) => string = (type) => type
): Map<string, { left: number; right: number }> {
  const reserve = new Map<string, { left: number; right: number }>();
  for (const tag of interfaceTagModels(workflow)) {
    const width =
      INTERFACE_TAG_GAP +
      estimateInterfaceTagWidth(tag.entry.id, interfaceTagTypeText(tag, typeName));
    const slot = reserve.get(tag.nodeId) ?? { left: 0, right: 0 };
    if (tag.direction === 'input') slot.left = Math.max(slot.left, width);
    else slot.right = Math.max(slot.right, width);
    reserve.set(tag.nodeId, slot);
  }
  return reserve;
}

/** The interface entry bound to a port (same-direction match), if any. */
export function entryAtPort(
  workflow: Workflow,
  nodeId: string,
  direction: InterfaceDirection,
  portId: string
): WorkflowInterfaceEntry | undefined {
  const entries =
    (direction === 'input' ? workflow.interface?.inputs : workflow.interface?.outputs) ?? [];
  return entries.find((entry) =>
    entry.bindings.some((binding) => binding.nodeId === nodeId && binding.portId === portId)
  );
}

/**
 * The port as a candidate for a new entry, or `undefined` when it cannot be
 * published: it is not exposed on the canvas, or it is control flow (trigger,
 * loop-back, tool output).
 */
export function exposableCandidate(
  workflow: Workflow,
  nodeId: string,
  direction: InterfaceDirection,
  portId: string
): BindablePort | undefined {
  return listBindablePorts(workflow, direction).find(
    (candidate) => candidate.nodeId === nodeId && candidate.port.id === portId
  );
}

/** Whether an input port already has an incoming edge (publishing it would feed it twice). */
export function inputHasIncomingEdge(workflow: Workflow, nodeId: string, portId: string): boolean {
  const handleId = buildHandleId(nodeId, 'input', portId);
  return workflow.edges.some((edge) => edge.targetHandle === handleId);
}

/** An interface after an edit, plus the input-id edit the chat binding must follow. */
export interface InterfaceEditResult {
  interface: WorkflowInterface;
  edit?: InterfaceInputEdit;
}

function entriesOf(
  workflow: Workflow,
  direction: InterfaceDirection
): readonly WorkflowInterfaceEntry[] {
  return (direction === 'input' ? workflow.interface?.inputs : workflow.interface?.outputs) ?? [];
}

function withSide(
  workflow: Workflow,
  direction: InterfaceDirection,
  entries: WorkflowInterfaceEntry[]
): WorkflowInterface {
  const inputs = direction === 'input' ? entries : (workflow.interface?.inputs ?? []);
  const outputs = direction === 'output' ? entries : (workflow.interface?.outputs ?? []);
  // A side with no entries reads as "declares nothing here". An emptied
  // interface stays an object, never `undefined`: the store treats
  // `undefined` as "leave it alone" (same rule as WorkflowInterfaceEditor).
  return {
    inputs: inputs.length > 0 ? inputs : undefined,
    outputs: outputs.length > 0 ? outputs : undefined
  };
}

/**
 * Publish a port under `id`: appends a complete entry (type, name and
 * description pulled from the port) to its direction. `null` when the id is
 * not usable or the port cannot be published.
 */
export function exposePortAsEntry(
  workflow: Workflow,
  target: { nodeId: string; direction: InterfaceDirection; portId: string },
  id: string
): InterfaceEditResult | null {
  const trimmed = id.trim();
  if (validateInterfaceId(trimmed, target.direction, workflow.interface) !== null) return null;
  const candidate = exposableCandidate(workflow, target.nodeId, target.direction, target.portId);
  if (!candidate) return null;
  const entry: WorkflowInterfaceEntry = { ...entryFromBindablePort(candidate, []), id: trimmed };
  return {
    interface: withSide(workflow, target.direction, [
      ...entriesOf(workflow, target.direction),
      entry
    ])
  };
}

/** Rename an entry. `null` when the id is not usable or the entry does not exist. */
export function renameInterfaceEntry(
  workflow: Workflow,
  direction: InterfaceDirection,
  oldId: string,
  newId: string
): InterfaceEditResult | null {
  const trimmed = newId.trim();
  const entries = entriesOf(workflow, direction);
  if (!entries.some((entry) => entry.id === oldId)) return null;
  if (validateInterfaceId(trimmed, direction, workflow.interface, oldId) !== null) return null;
  const next = withSide(
    workflow,
    direction,
    entries.map((entry) => (entry.id === oldId ? { ...entry, id: trimmed } : entry))
  );
  if (trimmed === oldId || direction !== 'input') return { interface: next };
  return { interface: next, edit: { kind: 'rename', id: oldId, to: trimmed } };
}

/** Remove an entry from the interface. `null` when it does not exist. */
export function removeInterfaceEntry(
  workflow: Workflow,
  direction: InterfaceDirection,
  id: string
): InterfaceEditResult | null {
  const entries = entriesOf(workflow, direction);
  if (!entries.some((entry) => entry.id === id)) return null;
  const next = withSide(
    workflow,
    direction,
    entries.filter((entry) => entry.id !== id)
  );
  return direction === 'input'
    ? { interface: next, edit: { kind: 'remove', id } }
    : { interface: next };
}
