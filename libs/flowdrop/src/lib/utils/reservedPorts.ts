/**
 * Trigger event inputs and the reserved inputs they give a workflow.
 *
 * Every trigger node type declares one input port named `event` (spec SCH-47):
 * what happened outside the workflow enters a run there, filled only by the
 * start of the run (a firing, or a simulated one). So:
 *
 * - no edge may target it (R16) — an edge would outrank the event;
 * - its exposure is not the author's to toggle — it is always exposed;
 * - each trigger node gives the workflow one derived, never-stored reserved
 *   input, `event:<node-id>` (MAN-26), which callers can neither see nor
 *   supply (MAN-27), so the interface editor never writes one.
 *
 * A trigger node is recognised by the reserved port itself: only trigger node
 * types may declare a static `event` input (SCH-47).
 *
 * @module utils/reservedPorts
 */

import { extractPortId } from './handleIds.js';
import type { Workflow, WorkflowNode } from '../types/index.js';

/** The trigger node's reserved event input (SCH-47). */
export const EVENT_PORT_ID = 'event';

/** Prefix of a reserved input name; the colon keeps it out of R4.a's alphabet. */
export const RESERVED_INPUT_EVENT_PREFIX = 'event:';

/** The validator code an edge into a trigger's event input earns. */
export const EDGE_EVENT_INPUT_CODE = 'R16_EDGE_EVENT_INPUT';

/** A workflow's derived reserved input (MAN-26). */
export interface ReservedInput {
  /** `event:<node-id>`. */
  name: string;
  /** The trigger node it binds. */
  nodeId: string;
  /** Always `event`. */
  port: typeof EVENT_PORT_ID;
}

type NodeLike = Pick<WorkflowNode, 'id' | 'data'>;

/** Whether a node is a trigger node: its type declares the `event` input. */
export function isTriggerNode(node: NodeLike | undefined): boolean {
  return (node?.data?.metadata?.inputs ?? []).some((port) => port.id === EVENT_PORT_ID);
}

/** Whether `portId` on `node` is a trigger's reserved event input. */
export function isTriggerEventInput(node: NodeLike | undefined, portId: string | null): boolean {
  return portId === EVENT_PORT_ID && isTriggerNode(node);
}

/**
 * Whether a connection targets a trigger node's event input (refused, R16).
 *
 * @param connection - The proposed connection (target node id + handle).
 * @param nodes - The workflow's nodes.
 */
export function isEventInputConnection(
  connection: { target: string; targetHandle?: string | null },
  nodes: readonly NodeLike[]
): boolean {
  const target = nodes.find((node) => node.id === connection.target);
  return isTriggerEventInput(target, extractPortId(connection.targetHandle ?? undefined));
}

/**
 * The workflow's reserved inputs, derived from its trigger nodes (MAN-26).
 *
 * Never stored: add a trigger and its reserved input exists, delete it and
 * the input is gone.
 */
export function reservedInputs(workflow: Pick<Workflow, 'nodes'>): ReservedInput[] {
  return workflow.nodes.filter(isTriggerNode).map((node) => ({
    name: `${RESERVED_INPUT_EVENT_PREFIX}${node.id}`,
    nodeId: node.id,
    port: EVENT_PORT_ID
  }));
}

/** Whether a name is a reserved input name (never a declared input). */
export function isReservedInputName(name: string): boolean {
  return name.startsWith(RESERVED_INPUT_EVENT_PREFIX);
}
