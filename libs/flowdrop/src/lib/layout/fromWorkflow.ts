/**
 * Node layout: build the layout model from a workflow.
 *
 * Handles come from the canvas when it has measured them (`measured`, the same
 * truth "Straighten wires" uses), so every node type is right. Without a
 * measurement a card falls back to the card contract (`computeNodeGeometry`)
 * over its exposed ports in display order, which is exactly what the default
 * card and the gateway render.
 *
 * Either way the port lists decide which handles the `ports` primitive may move:
 * reserved ports, header pins, `loop_back` and gateway branches stay (D4).
 *
 * @module layout/fromWorkflow
 */

import type {
  NodePort,
  PortsConfig,
  WorkflowEdge,
  WorkflowNode,
  Branch,
  DynamicPort
} from '../types/index.js';
import { dynamicPortToNodePort } from '../types/index.js';
import { computeNodeGeometry, NODE_WIDTH } from '../utils/nodeGeometry.js';
import { isPortVisible, isReservedPort, orderPortsFor } from '../utils/portUtils.js';
import { extractPortId } from '../utils/handleIds.js';
import { isLoopbackEdge, LOOPBACK_PORT_NAME } from '../utils/connections.js';
import { resolveBuiltinAlias } from '../registry/builtinNodeTypes.js';
import type { LayoutCard, LayoutCardKind, LayoutGraph, LayoutHandle } from './types.js';

/** A card as the canvas measured it: size, and handle centres from its top-left. */
export interface MeasuredCard {
  width: number;
  height: number;
  inputs: Array<Pick<LayoutHandle, 'portId' | 'dx' | 'dy'>>;
  outputs: Array<Pick<LayoutHandle, 'portId' | 'dx' | 'dy'>>;
}

export interface FromWorkflowOptions {
  /** The canvas measurement of a node, or undefined when it has none. */
  measured?: (nodeId: string) => MeasuredCard | undefined;
  /**
   * The node's visual type (`note`, `caption`, `gateway`, …). Default: the
   * configured `nodeType`, else the metadata type. The editor passes the
   * registry's resolution.
   */
  visualType?: (node: WorkflowNode) => string;
  /** The *Show descriptions* setting (the fallback geometry depends on it). */
  showDescriptions?: boolean;
}

/** Size assumed for an annotation that has not been measured. */
const ANNOTATION_FALLBACK = { width: 280, height: 120 };

function defaultVisualType(node: WorkflowNode): string {
  const configured = node.data?.config?.nodeType;
  const type =
    typeof configured === 'string' && configured ? configured : node.data?.metadata?.type;
  return resolveBuiltinAlias(String(type ?? ''));
}

function kindFor(visualType: string): LayoutCardKind {
  return visualType === 'note' || visualType === 'caption' ? visualType : 'card';
}

/** Exposed ports in display order, the way the card renders them. */
function exposedPorts(
  node: WorkflowNode,
  gateway: boolean
): { inputs: NodePort[]; outputs: NodePort[] } {
  const config = node.data?.config ?? {};
  const metadata = node.data?.metadata;
  const portsConfig = (config.ports as PortsConfig | undefined) ?? {};
  const dynamic = (
    key: 'dynamicInputs' | 'dynamicOutputs',
    direction: 'input' | 'output'
  ): NodePort[] =>
    gateway
      ? []
      : ((config[key] as DynamicPort[] | undefined) ?? []).map((p) =>
          dynamicPortToNodePort(p, direction)
        );

  const inputs = orderPortsFor(
    [...(metadata?.inputs ?? []), ...dynamic('dynamicInputs', 'input')],
    portsConfig.inputs
  ).filter((port) => isPortVisible(port, 'input', portsConfig));

  const outputs = gateway
    ? ((config.branches as Branch[] | undefined) ?? []).map(
        (branch, index): NodePort => ({
          id: branch.name,
          name: branch.label || branch.name || String(index + 1),
          type: 'output',
          dataType: 'trigger'
        })
      )
    : orderPortsFor(
        [...(metadata?.outputs ?? []), ...dynamic('dynamicOutputs', 'output')],
        portsConfig.outputs
      ).filter((port) => isPortVisible(port, 'output', portsConfig));

  return { inputs, outputs };
}

function cardFor(node: WorkflowNode, options: FromWorkflowOptions): LayoutCard {
  const visualType = (options.visualType ?? defaultVisualType)(node);
  const kind = kindFor(visualType);
  const measured = options.measured?.(node.id);
  const base = { id: node.id, kind, x: node.position.x, y: node.position.y };

  if (kind !== 'card') {
    return {
      ...base,
      width: measured?.width ?? node.measured?.width ?? node.width ?? ANNOTATION_FALLBACK.width,
      height:
        measured?.height ?? node.measured?.height ?? node.height ?? ANNOTATION_FALLBACK.height,
      inputs: [],
      outputs: []
    };
  }

  const gateway = visualType === 'gateway';
  const ports = exposedPorts(node, gateway);
  const geometry = computeNodeGeometry({
    inputs: ports.inputs,
    outputs: ports.outputs,
    showDescriptions: options.showDescriptions ?? false,
    execPins: gateway ? 'input' : 'completion'
  });
  const pins = new Set(
    geometry.handles.filter((h) => h.kind === 'pin').map((h) => `${h.direction}:${h.portId}`)
  );
  const byId = new Map<string, NodePort>([
    ...ports.inputs.map((p): [string, NodePort] => [`input:${p.id}`, p]),
    ...ports.outputs.map((p): [string, NodePort] => [`output:${p.id}`, p])
  ]);
  const fixed = (direction: 'input' | 'output', portId: string): boolean => {
    if (pins.has(`${direction}:${portId}`)) return true;
    if (direction === 'output' && gateway) return true;
    if (direction === 'input' && portId === LOOPBACK_PORT_NAME) return true;
    const port = byId.get(`${direction}:${portId}`);
    return port ? isReservedPort(port) : true;
  };

  const handles = (
    direction: 'input' | 'output',
    list: Array<Pick<LayoutHandle, 'portId' | 'dx' | 'dy'>>
  ): LayoutHandle[] =>
    [...list]
      .sort((a, b) => a.dy - b.dy)
      .map((h) => ({
        portId: h.portId,
        dx: h.dx,
        dy: h.dy,
        ...(fixed(direction, h.portId) ? { fixed: true } : {})
      }));

  const computed = (direction: 'input' | 'output') =>
    geometry.handles
      .filter((h) => h.direction === direction)
      .map((h) => ({ portId: h.portId, dx: h.x, dy: h.y }));

  return {
    ...base,
    // The canvas measurement when there is one, else the card contract. Never the size saved on
    // the node: it was measured under an older card and goes stale (saved workflows carry a
    // `measured` width of 290), and the handles come from the same contract.
    width: measured?.width ?? geometry.width ?? NODE_WIDTH,
    height: measured?.height ?? geometry.height,
    inputs: handles('input', measured?.inputs ?? computed('input')),
    outputs: handles('output', measured?.outputs ?? computed('output'))
  };
}

/** The layout model of a workflow. Edges without a port on either end are left out. */
export function fromWorkflow(
  nodes: readonly WorkflowNode[],
  edges: readonly WorkflowEdge[],
  options: FromWorkflowOptions = {}
): LayoutGraph {
  const cards = nodes.map((node) => cardFor(node, options));
  const wires = [];
  for (const edge of edges) {
    const sourcePort = extractPortId(edge.sourceHandle);
    const targetPort = extractPortId(edge.targetHandle);
    if (!sourcePort || !targetPort) continue;
    wires.push({
      id: edge.id,
      source: edge.source,
      sourcePort,
      target: edge.target,
      targetPort,
      loopback: isLoopbackEdge(edge) || targetPort === LOOPBACK_PORT_NAME
    });
  }
  return { cards, wires };
}
