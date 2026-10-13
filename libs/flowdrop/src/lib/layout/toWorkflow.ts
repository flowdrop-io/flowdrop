/**
 * Node layout: turn accepted proposals into node updates.
 *
 * The executor dispatches the result: a new `position`, and for a port reorder the node's whole
 * next `data.config` with `ports` rebuilt so the stored order matches the new handle order (D6).
 * Ports that are hidden, and ports the card does not show, keep their entries exactly; only the
 * visible ports trade places, among the slots the visible ports already held. Like the Ports tab,
 * a direction that ends up in default order with no exposure override stores nothing.
 *
 * @module layout/toWorkflow
 */

import type {
  DynamicPort,
  NodePort,
  PortConfigEntry,
  PortsConfig,
  WorkflowNode
} from '../types/index.js';
import { dynamicPortToNodePort } from '../types/index.js';
import { byDefaultOrder, orderPortsFor } from '../utils/portUtils.js';
import type { LayoutProposal } from './primitives.js';

export interface NodeLayoutUpdate {
  nodeId: string;
  /** The node's new position, when it moved. */
  position?: { x: number; y: number };
  /** The node's whole next `data.config`, when its port order changed. */
  config?: Record<string, unknown>;
}

type Direction = 'inputs' | 'outputs';

/** Every port of a direction the node has (hidden ones too), as the card builds them. */
function allPorts(node: WorkflowNode, direction: Direction): NodePort[] {
  const metadata = node.data?.metadata;
  const config = node.data?.config ?? {};
  const dynamic = (config[direction === 'inputs' ? 'dynamicInputs' : 'dynamicOutputs'] ??
    []) as DynamicPort[];
  return [
    ...(direction === 'inputs' ? (metadata?.inputs ?? []) : (metadata?.outputs ?? [])),
    ...dynamic.map((p) => dynamicPortToNodePort(p, direction === 'inputs' ? 'input' : 'output'))
  ];
}

/**
 * The `ports` config after the visible ports of one direction take the order `to`. Entries are
 * kept as stored (exposure included); `undefined` when nothing needs storing.
 */
export function buildPortsConfig(
  node: WorkflowNode,
  direction: Direction,
  to: readonly string[]
): PortsConfig | undefined {
  const stored = (node.data?.config?.ports as PortsConfig | undefined) ?? {};
  const entries = stored[direction];
  const ports = allPorts(node, direction);
  const known = new Set(ports.map((p) => p.id));
  const current = orderPortsFor(ports, entries).map((p) => p.id);

  // The visible ports hold slots in the current order; `to` refills them. Hidden ports stay put.
  const wanted = new Set(to);
  const slots = current.flatMap((id, i) => (wanted.has(id) ? [i] : []));
  const refill = to.filter((id) => known.has(id));
  const order = [...current];
  slots.forEach((slot, i) => {
    order[slot] = refill[i];
  });

  const byId = new Map((entries ?? []).map((e) => [e.id, e]));
  const next: PortConfigEntry[] = order.map((id) => ({ ...(byId.get(id) ?? { id }) }));
  // Entries for ports the node no longer has stay as they were.
  for (const entry of entries ?? []) if (!known.has(entry.id)) next.push({ ...entry });

  const defaultOrder = byDefaultOrder(ports).map((p) => p.id);
  const keep =
    next.some((e, i) => e.id !== defaultOrder[i]) || next.some((e) => e.exposed !== undefined);

  const result: PortsConfig = { ...stored };
  if (keep) result[direction] = next;
  else delete result[direction];
  for (const key of ['inputs', 'outputs'] as const) {
    if (result[key]?.length === 0) delete result[key];
  }
  return Object.keys(result).length === 0 ? undefined : result;
}

/**
 * The updates for the accepted proposals, one per node touched, in node order of first use.
 * Refused proposals are skipped. Several proposals for one node apply in sequence.
 */
export function applyProposalToNodes(
  nodes: readonly WorkflowNode[],
  proposals: readonly LayoutProposal[]
): NodeLayoutUpdate[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const updates = new Map<string, NodeLayoutUpdate>();
  const working = new Map<string, WorkflowNode>();

  for (const proposal of proposals) {
    if (!proposal.accepted) continue;
    const node = working.get(proposal.nodeId) ?? byId.get(proposal.nodeId);
    if (!node) continue;
    const update = updates.get(node.id) ?? { nodeId: node.id };
    let next = node;

    const position = proposal.changes.position;
    if (position) {
      update.position = { ...position.to };
      next = { ...next, position: { ...position.to } };
    }
    for (const direction of ['inputs', 'outputs'] as const) {
      const change = proposal.changes.ports?.[direction];
      if (!change) continue;
      const ports = buildPortsConfig(next, direction, change.to);
      const config = { ...(next.data?.config ?? {}) } as Record<string, unknown>;
      if (ports) config.ports = ports;
      else delete config.ports;
      update.config = config;
      next = { ...next, data: { ...next.data, config } };
    }
    working.set(node.id, next);
    updates.set(node.id, update);
  }
  return [...updates.values()];
}
