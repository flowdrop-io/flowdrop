/**
 * Node layout: turn accepted proposals into node updates.
 *
 * The executor dispatches the result: a new `position`, and for a port reorder the node's whole
 * next `data.config` with `ports` rebuilt so the stored order matches the new handle order (D6).
 * Hidden ports, and entries for ports the node does not have, keep their places; only the visible
 * ports trade places, among the slots the visible ports already held. The write itself is the
 * Ports tab's (`buildPortsConfig`), so a direction that ends up in default order with no exposure
 * override stores nothing. Reserved ports are always written last.
 *
 * @module layout/toWorkflow
 */

import type { DynamicPort, NodePort, PortsConfig, WorkflowNode } from '../types/index.js';
import { dynamicPortToNodePort } from '../types/index.js';
import {
  buildPortsConfig,
  isPortExposed,
  isReservedPort,
  orderPortsFor
} from '../utils/portUtils.js';
import type { LayoutProposal } from './primitives.js';
import type { SweepResult } from './sweep.js';

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
 * The `ports` config after the visible ports of one direction take the order `to`. The visible
 * ports trade places among the slots they already held; hidden ports keep theirs. Written by
 * `buildPortsConfig`, like every other `ports` edit; `undefined` when nothing needs storing.
 */
export function portsConfigForOrder(
  node: WorkflowNode,
  direction: Direction,
  to: readonly string[]
): PortsConfig | undefined {
  const stored = node.data?.config?.ports as PortsConfig | undefined;
  const entries = stored?.[direction];
  const ports = allPorts(node, direction);
  const current = orderPortsFor(ports, entries);

  // The visible ports hold slots in the current order; `to` refills them. Hidden ports stay put.
  const byId = new Map(ports.map((p) => [p.id, p]));
  const wanted = new Set(to);
  const refill = to.flatMap((id) => byId.get(id) ?? []);
  let next = 0;
  const order = current.map((p) => (wanted.has(p.id) ? (refill[next++] ?? p) : p));

  // Reserved ports (trigger, tool, error, loop_back) are written last, the way the card shows
  // them, whatever slot an older stored order gave them (Q3).
  const tidy = [
    ...order.filter((p) => !isReservedPort(p)),
    ...order.filter((p) => isReservedPort(p))
  ];
  return buildPortsConfig(stored, direction, tidy, ports, (p) => isPortExposed(p, entries));
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
      const ports = portsConfigForOrder(next, direction, change.to);
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

/**
 * The updates of a sweep, one per node touched: the port orders of the accepted steps, and every
 * card at its place in the swept graph (which holds the steps, the room made for interface tags
 * and the final translation, so a card that only rode along is moved too). Annotations never move.
 */
export function applySweepToNodes(
  nodes: readonly WorkflowNode[],
  result: SweepResult
): NodeLayoutUpdate[] {
  const updates = new Map(applyProposalToNodes(nodes, result.steps).map((u) => [u.nodeId, u]));
  const swept = new Map(
    result.graph.cards.filter((c) => c.kind === 'card').map((c) => [c.id, c] as const)
  );
  for (const node of nodes) {
    const card = swept.get(node.id);
    if (!card) continue;
    const { position: _stepped, ...update } = updates.get(node.id) ?? { nodeId: node.id };
    const moved = card.x !== node.position.x || card.y !== node.position.y;
    if (moved) updates.set(node.id, { ...update, position: { x: card.x, y: card.y } });
    else if (update.config) updates.set(node.id, update);
    else updates.delete(node.id);
  }
  return [...updates.values()];
}
