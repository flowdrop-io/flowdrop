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

/** Whether any edge of the workflow touches a port's handle. */
function hasEdgeOnPort(
  workflow: Workflow,
  nodeId: string,
  direction: PortsDirection,
  portId: string
): boolean {
  const isInputs = direction === 'inputs';
  const handleId = buildHandleId(nodeId, isInputs ? 'input' : 'output', portId);
  return workflow.edges.some((edge) =>
    isInputs
      ? edge.target === nodeId && (edge.targetHandle === handleId || edge.targetHandle === portId)
      : edge.source === nodeId && (edge.sourceHandle === handleId || edge.sourceHandle === portId)
  );
}

/** Whether the node's config holds a value for a parameter (an empty string counts as none). */
function hasConfigValue(node: Pick<WorkflowNode, 'data'>, key: string): boolean {
  const value = node.data?.config?.[key];
  return value !== undefined && value !== null && value !== '';
}

/**
 * Exposed data ports with no edge on them, the ones worth hiding. Left out:
 * reserved ports (error output, trigger and tool types), control-flow ports
 * (loop-back), a trigger's event input (always exposed), ports published on
 * the workflow interface (hiding them would break the binding), and a required
 * input with no config value (hiding it would only hide the missing value).
 */
export function hideCandidates(node: WorkflowNode, workflow: Workflow): PortExposureCandidate[] {
  const ports = node.data?.config?.ports as PortsConfig | undefined;
  const result: PortExposureCandidate[] = [];
  for (const direction of ['inputs', 'outputs'] as const) {
    const dir = direction === 'inputs' ? 'input' : 'output';
    for (const port of nodePortsFor(node, direction)) {
      if (!isPortExposed(port, ports?.[direction])) continue;
      if (!isBulkToggleable(node, direction, port)) continue;
      if (hasEdgeOnPort(workflow, node.id, direction, port.id)) continue;
      if (entryAtPort(workflow, node.id, dir, port.id)) continue;
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
  return !(direction === 'inputs' && isTriggerEventInput(node, port.id));
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
