/**
 * "Connect to…": which ports a port could be wired to, and the edge a pick
 * makes. Pure.
 *
 * Nothing is refused for its type (values can be cast): compatible ports come
 * first, the rest follow, all still pickable. An input that already receives a
 * wire is a valid target (the pick adds another); a pair that is already wired
 * is marked and picking it does nothing.
 *
 * @module editor/connectCandidates
 */

import { v4 as uuidv4 } from 'uuid';
import type { NodePort, Workflow, WorkflowEdge, WorkflowNode } from '../types/index.js';
import type { PortsConfig } from '../types/index.js';
import { ProximityConnectHelper } from '../helpers/proximityConnect.js';
import type { PortCompatibilityChecker } from '../utils/connections.js';
import { buildHandleId } from '../utils/handleIds.js';
import { isPortVisible } from '../utils/portUtils.js';
import { isTriggerEventInput } from '../utils/reservedPorts.js';
import { nodeCanvasLabel } from '../utils/workflowInterface.js';
import type { PortTarget } from './interfaceMenu.js';
import type { PortPickerGroup } from '../components/PortPickerListbox.svelte';
import { defaultMessages } from '../messages/defaults.js';

/** One port a "Connect to…" pick could wire to. */
export interface ConnectCandidate {
  nodeId: string;
  /** The node's display label. */
  nodeLabel: string;
  port: NodePort;
  /** The port's lane type is compatible with the origin's (output type into input type). */
  compatible: boolean;
  /** An input that already receives a wire; connecting adds another. Never set on outputs. */
  wired: boolean;
  /** These two exact ports are already connected. */
  connected: boolean;
}

/** Candidates in the two groups the picker shows; each keeps canvas order. */
export interface ConnectCandidateGroups {
  compatible: ConnectCandidate[];
  other: ConnectCandidate[];
}

/** A stable key for a candidate, `nodeId::portId`. */
export function connectCandidateKey(candidate: Pick<ConnectCandidate, 'nodeId' | 'port'>): string {
  return `${candidate.nodeId}::${candidate.port.id}`;
}

/** The port a target names, with the node that owns it, when it is on the canvas and exposed. */
function resolveOrigin(
  workflow: Workflow,
  target: PortTarget
): { node: WorkflowNode; port: NodePort } | undefined {
  const node = workflow.nodes.find((n) => n.id === target.nodeId);
  if (!node) return undefined;
  const port = ProximityConnectHelper.getAllPorts(node, target.direction).find(
    (p) => p.id === target.portId
  );
  if (!port) return undefined;
  const ports = node.data?.config?.ports as PortsConfig | undefined;
  if (!isPortVisible(port, target.direction, ports)) return undefined;
  return { node, port };
}

/**
 * Whether "Connect to…" is offered on a port: it is on the canvas and exposed,
 * and is not a trigger's event input (no edge may target it).
 */
export function canConnectFrom(workflow: Workflow, target: PortTarget): boolean {
  const origin = resolveOrigin(workflow, target);
  if (!origin) return false;
  return !(target.direction === 'input' && isTriggerEventInput(origin.node, target.portId));
}

/**
 * The ports an origin could be wired to: the opposite direction, on other
 * nodes, exposed, and never a trigger's event input.
 */
export function listConnectCandidates(
  workflow: Workflow,
  checker: PortCompatibilityChecker,
  target: PortTarget
): ConnectCandidateGroups {
  const groups: ConnectCandidateGroups = { compatible: [], other: [] };
  const origin = resolveOrigin(workflow, target);
  if (!origin) return groups;

  const fromOutput = target.direction === 'output';
  const otherDirection = fromOutput ? 'input' : 'output';
  const originHandle = buildHandleId(target.nodeId, target.direction, target.portId);

  for (const node of workflow.nodes) {
    if (node.id === target.nodeId) continue;
    const ports = node.data?.config?.ports as PortsConfig | undefined;
    for (const port of ProximityConnectHelper.getAllPorts(node, otherDirection)) {
      if (!isPortVisible(port, otherDirection, ports)) continue;
      if (otherDirection === 'input' && isTriggerEventInput(node, port.id)) continue;

      const handle = buildHandleId(node.id, otherDirection, port.id);
      const wired =
        otherDirection === 'input' && workflow.edges.some((edge) => edge.targetHandle === handle);
      const connected = workflow.edges.some((edge) =>
        fromOutput
          ? edge.source === target.nodeId &&
            edge.sourceHandle === originHandle &&
            edge.target === node.id &&
            edge.targetHandle === handle
          : edge.source === node.id &&
            edge.sourceHandle === handle &&
            edge.target === target.nodeId &&
            edge.targetHandle === originHandle
      );
      const compatible = fromOutput
        ? checker.areDataTypesCompatible(origin.port.dataType, port.dataType)
        : checker.areDataTypesCompatible(port.dataType, origin.port.dataType);

      const candidate: ConnectCandidate = {
        nodeId: node.id,
        nodeLabel: nodeCanvasLabel(node),
        port,
        compatible,
        wired,
        connected
      };
      (compatible ? groups.compatible : groups.other).push(candidate);
    }
  }
  return groups;
}

/** The edge a pick makes. The source is always the output side. Styling is left to the editor. */
export function buildConnectEdge(target: PortTarget, candidate: ConnectCandidate): WorkflowEdge {
  const fromOutput = target.direction === 'output';
  const origin = { nodeId: target.nodeId, port: target.portId };
  const other = { nodeId: candidate.nodeId, port: candidate.port.id };
  const source = fromOutput ? origin : other;
  const sink = fromOutput ? other : origin;
  return {
    id: uuidv4(),
    source: source.nodeId,
    target: sink.nodeId,
    sourceHandle: buildHandleId(source.nodeId, 'output', source.port),
    targetHandle: buildHandleId(sink.nodeId, 'input', sink.port)
  };
}

type ConnectToMessages = typeof defaultMessages.connectTo;

/**
 * The picker's groups: "Compatible" first, then "Other types" (dimmed, still
 * pickable). An input that already has a wire wears a neutral "Wired" badge; an
 * exact pair that is already connected wears "Connected".
 */
export function connectPickerGroups(
  groups: ConnectCandidateGroups,
  messages: ConnectToMessages = defaultMessages.connectTo
): PortPickerGroup<ConnectCandidate>[] {
  const toOption = (candidate: ConnectCandidate, dimmed: boolean) => ({
    key: connectCandidateKey(candidate),
    nodeId: candidate.nodeId,
    nodeLabel: candidate.nodeLabel,
    port: candidate.port,
    dimmed,
    badges: [
      ...(candidate.connected ? [{ label: messages.connected, tone: 'primary' as const }] : []),
      ...(candidate.wired ? [{ label: messages.wired, tone: 'outline' as const }] : [])
    ],
    value: candidate
  });
  return [
    { title: messages.groupCompatible, options: groups.compatible.map((c) => toOption(c, false)) },
    { title: messages.groupOther, options: groups.other.map((c) => toOption(c, true)) }
  ];
}
