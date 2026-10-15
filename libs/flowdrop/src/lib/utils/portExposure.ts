/**
 * Bulk port exposure for a node: which ports "Hide unconnected ports" and
 * "Show hidden ports" would change, and the node's `config.ports` afterwards.
 *
 * Pure. Exposure is semantic in v2 (a hidden port is off the canvas, not
 * wireable, not runtime-overridable), so these are real config edits, the same
 * ones the Ports form makes with its eye toggle, only in bulk.
 *
 * @module utils/portExposure
 */

import type { DynamicPort, NodePort, PortsConfig, Workflow, WorkflowNode } from '../types/index.js';
import { dynamicPortToNodePort } from '../types/index.js';
import { buildHandleId } from './handleIds.js';
import { entryAtPort } from './interfaceTags.js';
import { isPortExposed, isReservedPort, orderPortsFor, buildPortsConfig } from './portUtils.js';
import type { PortsDirection } from './portUtils.js';
import { isTriggerEventInput } from './reservedPorts.js';
import { isControlFlowPort } from './workflowInterface.js';

/** Whether a bulk edit hides ports or shows them. */
export type PortExposureMode = 'hide' | 'show';

/** A port a bulk edit would change. */
export interface PortExposureCandidate {
  direction: PortsDirection;
  port: NodePort;
}

/**
 * The ports the Ports form lists for a direction: the node type's metadata
 * ports, then the instance's dynamic ports. A gateway's branches are not part
 * of it (they are always drawn).
 */
export function nodePortsFor(node: Pick<WorkflowNode, 'data'>, direction: PortsDirection) {
  const metadata = node.data?.metadata;
  const config = node.data?.config;
  const isInputs = direction === 'inputs';
  const dynamic =
    (config?.[isInputs ? 'dynamicInputs' : 'dynamicOutputs'] as DynamicPort[] | undefined) ?? [];
  return [
    ...((isInputs ? metadata?.inputs : metadata?.outputs) ?? []),
    ...dynamic.map((port) => dynamicPortToNodePort(port, isInputs ? 'input' : 'output'))
  ];
}

/** Why an exposed port can't be hidden right now. */
export type ExposureBlock =
  | { kind: 'locked' }
  | { kind: 'wired'; count: number }
  | { kind: 'published' };

/** Whether the node type fixes a port as always shown (a trigger's event input included). */
export function isExposureLocked(
  node: Pick<WorkflowNode, 'id' | 'data'>,
  direction: PortsDirection,
  port: NodePort
): boolean {
  return Boolean(
    port.exposureLocked || (direction === 'inputs' && isTriggerEventInput(node, port.id))
  );
}

/**
 * Edges on each of the node's ports, counted in one pass. Keyed
 * `${direction}:${portId}`. An edge counts on a port when its handle is the
 * port's full handle id or the bare port id.
 */
export function countPortWires(
  node: Pick<WorkflowNode, 'id'>,
  workflow: Workflow
): Map<string, number> {
  const counts = new Map<string, number>();
  const add = (direction: PortsDirection, type: 'input' | 'output', handle: string | undefined) => {
    if (!handle) return;
    const prefix = buildHandleId(node.id, type, '');
    const portId = handle.startsWith(prefix) ? handle.slice(prefix.length) : handle;
    const key = `${direction}:${portId}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  };
  for (const edge of workflow.edges) {
    if (edge.source === node.id) add('outputs', 'output', edge.sourceHandle ?? undefined);
    if (edge.target === node.id) add('inputs', 'input', edge.targetHandle ?? undefined);
  }
  return counts;
}

/**
 * Why an exposed port can't be hidden, or `null` when it can. Locked (the node
 * type decides) comes before wired, which comes before published on the
 * workflow interface. `wires` is {@link countPortWires} for the node.
 */
export function hideBlock(
  node: Pick<WorkflowNode, 'id' | 'data'>,
  workflow: Workflow,
  direction: PortsDirection,
  port: NodePort,
  wires: ReadonlyMap<string, number>
): ExposureBlock | null {
  if (isExposureLocked(node, direction, port)) return { kind: 'locked' };
  const count = wires.get(`${direction}:${port.id}`) ?? 0;
  if (count > 0) return { kind: 'wired', count };
  const dir = direction === 'inputs' ? 'input' : 'output';
  if (entryAtPort(workflow, node.id, dir, port.id)) return { kind: 'published' };
  return null;
}

/** Whether the node's config holds a value for a parameter (an empty string counts as none). */
function hasConfigValue(node: Pick<WorkflowNode, 'data'>, key: string): boolean {
  const value = node.data?.config?.[key];
  return value !== undefined && value !== null && value !== '';
}

/**
 * Exposed data ports with no edge on them, the ones worth hiding. Left out:
 * reserved ports (error output, trigger and tool types), control-flow ports
 * (loop-back), locked ports (a trigger's event input), ports published on
 * the workflow interface (hiding them would break the binding), and a required
 * input with no config value (hiding it would only hide the missing value).
 */
export function hideCandidates(node: WorkflowNode, workflow: Workflow): PortExposureCandidate[] {
  const ports = node.data?.config?.ports as PortsConfig | undefined;
  const wires = countPortWires(node, workflow);
  const result: PortExposureCandidate[] = [];
  for (const direction of ['inputs', 'outputs'] as const) {
    for (const port of nodePortsFor(node, direction)) {
      if (!isPortExposed(port, ports?.[direction])) continue;
      if (!isBulkToggleable(node, direction, port)) continue;
      if (hideBlock(node, workflow, direction, port, wires)) continue;
      if (direction === 'inputs' && port.required && !hasConfigValue(node, port.id)) continue;
      result.push({ direction, port });
    }
  }
  return result;
}

/** Whether bulk show/hide may touch a port: a data port, not a reserved or control-flow one. */
function isBulkToggleable(node: WorkflowNode, direction: PortsDirection, port: NodePort): boolean {
  const dir = direction === 'inputs' ? 'input' : 'output';
  if (isReservedPort(port) || isControlFlowPort(port, dir)) return false;
  return !isExposureLocked(node, direction, port);
}

/**
 * Data ports currently hidden, in both directions. Reserved and control-flow
 * ports (error, trigger, tool, loop-back) are left to the Ports form, as in
 * {@link hideCandidates}: a backend often hides them by default, and showing
 * them here would put ports on the card that "Hide unconnected ports" never
 * takes back.
 */
export function showCandidates(node: WorkflowNode): PortExposureCandidate[] {
  const ports = node.data?.config?.ports as PortsConfig | undefined;
  const result: PortExposureCandidate[] = [];
  for (const direction of ['inputs', 'outputs'] as const) {
    for (const port of nodePortsFor(node, direction)) {
      if (!isBulkToggleable(node, direction, port)) continue;
      if (!isPortExposed(port, ports?.[direction])) result.push({ direction, port });
    }
  }
  return result;
}

/** The candidates of a mode. */
export function exposureCandidates(
  node: WorkflowNode,
  workflow: Workflow,
  mode: PortExposureMode
): PortExposureCandidate[] {
  return mode === 'hide' ? hideCandidates(node, workflow) : showCandidates(node);
}

/**
 * The node's `config.ports` after hiding or showing its candidates, keeping
 * the stored order and every other override. `undefined` means the node ends
 * up with no override at all (the key is to be dropped).
 */
export function applyPortExposure(
  node: WorkflowNode,
  workflow: Workflow,
  mode: PortExposureMode
): PortsConfig | undefined {
  const current = node.data?.config?.ports as PortsConfig | undefined;
  const candidates = exposureCandidates(node, workflow, mode);
  let next = current;
  for (const direction of ['inputs', 'outputs'] as const) {
    const ids = new Set(candidates.filter((c) => c.direction === direction).map((c) => c.port.id));
    if (ids.size === 0) continue;
    const ports = nodePortsFor(node, direction);
    const before = next;
    next = buildPortsConfig(
      before,
      direction,
      orderPortsFor(ports, before?.[direction]),
      ports,
      (port) => (ids.has(port.id) ? mode === 'show' : isPortExposed(port, before?.[direction]))
    );
  }
  return next;
}
