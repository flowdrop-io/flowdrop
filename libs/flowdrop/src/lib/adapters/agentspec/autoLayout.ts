/**
 * Auto-Layout for Agent Spec Flows
 *
 * Agent Spec has no visual position information. This module assigns
 * positions to imported nodes using a layered layout algorithm:
 *
 * 1. Topological sort from StartNode using control-flow edges
 * 2. Assign layers based on longest path from StartNode
 * 3. Position nodes with configurable spacing
 * 4. Fan out branches vertically from BranchingNode
 * 5. Align tops along chains: a node's top sits at its first predecessor's top
 *    (pushed down only to clear its column neighbours), and every y is on the
 *    grid. Node cards keep their handle centres a multiple of 20 from the top,
 *    so row-1-to-row-1 wiring, trigger wire and data wire alike, comes out
 *    straight.
 */

import type { AgentSpecFlow } from '../../types/agentspec.js';

/** Measured dimensions for a node */
export interface NodeDimensions {
  width: number;
  height: number;
}

/**
 * Room a node needs beside it for its workflow-interface tags, in px: `left`
 * for tags of its inputs, `right` for tags of its outputs (see
 * `utils/interfaceTags.ts#interfaceTagReserve`). Keyed like the dimensions.
 */
export type TagReserve = Map<string, { left: number; right: number }>;

/** Free space kept between a column's output tags and the next column's input tags (px). */
const TAG_BREATHING_ROOM = 40;

/** Gap between two adjacent columns: the configured gap, or more when their tags need it. */
function columnGap(
  horizontalGap: number,
  left: string[],
  right: string[] | undefined,
  reserve: TagReserve | undefined
): number {
  if (!reserve || !right) return horizontalGap;
  const out = Math.max(0, ...left.map((id) => reserve.get(id)?.right ?? 0));
  const into = Math.max(0, ...right.map((id) => reserve.get(id)?.left ?? 0));
  if (out === 0 && into === 0) return horizontalGap;
  return Math.max(horizontalGap, out + into + TAG_BREATHING_ROOM);
}

/** Layout configuration */
export interface AutoLayoutConfig {
  /** Minimum horizontal gap between the right edge of one layer and the left edge of the next (px) */
  horizontalGap: number;
  /** Minimum vertical gap between the bottom edge of one node and the top edge of the next in the same layer (px) */
  verticalGap: number;
  /** Starting X position */
  startX: number;
  /** Starting Y position */
  startY: number;
  /** Fallback node width when measured dimensions are unavailable */
  defaultNodeWidth: number;
  /** Fallback node height when measured dimensions are unavailable */
  defaultNodeHeight: number;
  /** Every y lands on a multiple of this (px); the node cards' handle offsets are multiples of 20 */
  grid: number;
}

const DEFAULT_CONFIG: AutoLayoutConfig = {
  horizontalGap: 120,
  verticalGap: 40,
  startX: 100,
  startY: 100,
  defaultNodeWidth: 220,
  defaultNodeHeight: 150,
  grid: 20
};

/**
 * Compute node positions for an Agent Spec flow using layered layout.
 * Takes actual node dimensions into account to prevent overlap.
 *
 * @param flow - The Agent Spec flow to layout
 * @param config - Optional layout configuration
 * @param nodeDimensions - Optional map of node name to measured {width, height}
 * @param tagReserve - Optional room each node needs beside it for interface tags
 * @returns Map of node name to {x, y} position
 */
export function computeAutoLayout(
  flow: AgentSpecFlow,
  config: Partial<AutoLayoutConfig> = {},
  nodeDimensions?: Map<string, NodeDimensions>,
  tagReserve?: TagReserve
): Map<string, { x: number; y: number }> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const positions = new Map<string, { x: number; y: number }>();

  if (flow.nodes.length === 0) return positions;

  const getDims = (name: string): NodeDimensions =>
    nodeDimensions?.get(name) ?? {
      width: cfg.defaultNodeWidth,
      height: cfg.defaultNodeHeight
    };

  // Build adjacency list from control-flow edges
  const adjacency = new Map<string, string[]>();

  for (const node of flow.nodes) {
    adjacency.set(node.name, []);
  }

  for (const edge of flow.control_flow_connections) {
    const neighbors = adjacency.get(edge.from_node);
    if (neighbors) {
      neighbors.push(edge.to_node);
    }
  }

  // Also consider data-flow edges for connectivity (but don't affect layering priority)
  if (flow.data_flow_connections) {
    for (const edge of flow.data_flow_connections) {
      if (!adjacency.get(edge.source_node)?.includes(edge.destination_node)) {
        adjacency.get(edge.source_node)?.push(edge.destination_node);
      }
    }
  }

  // Assign layers using longest path from start node (BFS with level tracking)
  const layers = assignLayers(flow.start_node, adjacency, flow.nodes.length);

  // Group nodes by layer
  const layerGroups = new Map<number, string[]>();
  for (const [nodeName, layer] of layers) {
    if (!layerGroups.has(layer)) {
      layerGroups.set(layer, []);
    }
    layerGroups.get(layer)!.push(nodeName);
  }

  // Handle any disconnected nodes (not reachable from start)
  const assignedNodes = new Set(layers.keys());
  const disconnected: string[] = [];
  for (const node of flow.nodes) {
    if (!assignedNodes.has(node.name)) {
      disconnected.push(node.name);
    }
  }

  // Place disconnected nodes in a final layer
  if (disconnected.length > 0) {
    const maxLayer = layerGroups.size > 0 ? Math.max(...layerGroups.keys()) + 1 : 0;
    layerGroups.set(maxLayer, disconnected);
  }

  // Sort layers and assign positions
  const sortedLayers = Array.from(layerGroups.keys()).sort((a, b) => a - b);

  // Compute X positions layer by layer, using the widest node in each layer
  const layerXPositions = new Map<number, number>();
  let currentX = cfg.startX;

  for (const [i, layerIndex] of sortedLayers.entries()) {
    layerXPositions.set(layerIndex, currentX);

    // Advance X by the widest node in this layer + the gap (wider when interface tags need it)
    const nodesInLayer = layerGroups.get(layerIndex)!;
    const maxWidth = Math.max(...nodesInLayer.map((name) => getDims(name).width));
    const next = sortedLayers[i + 1];
    currentX +=
      maxWidth +
      columnGap(
        cfg.horizontalGap,
        nodesInLayer,
        next === undefined ? undefined : layerGroups.get(next),
        tagReserve
      );
  }

  // Predecessors in edge order (control flow first), for aligning tops.
  const predecessors = new Map<string, string[]>();
  const addPredecessor = (from: string, to: string): void => {
    const list = predecessors.get(to) ?? [];
    if (!list.includes(from)) list.push(from);
    predecessors.set(to, list);
  };
  for (const edge of flow.control_flow_connections) addPredecessor(edge.from_node, edge.to_node);
  for (const edge of flow.data_flow_connections ?? []) {
    addPredecessor(edge.source_node, edge.destination_node);
  }

  const grid = cfg.grid > 0 ? cfg.grid : 1;
  const roundToGrid = (v: number): number => Math.round(v / grid) * grid;
  const ceilToGrid = (v: number): number => Math.ceil(v / grid) * grid;

  // Compute Y positions within each layer, using actual node heights
  for (const layerIndex of sortedLayers) {
    const nodesInLayer = layerGroups.get(layerIndex)!;
    const x = layerXPositions.get(layerIndex)!;
    const heights = new Map(nodesInLayer.map((name) => [name, getDims(name).height]));

    // The top a node wants: its first earlier-layer predecessor's top.
    const wanted = new Map<string, number>();
    for (const name of nodesInLayer) {
      const from = (predecessors.get(name) ?? []).find((p) => {
        const layer = layers.get(p);
        return layer !== undefined && layer < layerIndex && positions.has(p);
      });
      if (from !== undefined) wanted.set(name, positions.get(from)!.y);
    }

    if (wanted.size === 0) {
      // Nothing to align to (the first layer, or loose nodes): a column centred on startY.
      const total =
        nodesInLayer.reduce((sum, name) => sum + heights.get(name)!, 0) +
        (nodesInLayer.length - 1) * cfg.verticalGap;
      let y = roundToGrid(cfg.startY - total / 2);
      for (const name of nodesInLayer) {
        positions.set(name, { x, y });
        y = ceilToGrid(y + heights.get(name)! + cfg.verticalGap);
      }
      continue;
    }

    // Aligned nodes keep their wanted top in order, pushed down only to clear the node above;
    // nodes with nothing to align to go below them.
    const aligned = nodesInLayer
      .filter((name) => wanted.has(name))
      .sort((a, b) => wanted.get(a)! - wanted.get(b)!);
    const loose = nodesInLayer.filter((name) => !wanted.has(name));
    let cursor = -Infinity;
    for (const name of [...aligned, ...loose]) {
      const y = Math.max(wanted.get(name) ?? cursor, cursor);
      positions.set(name, { x, y });
      cursor = ceilToGrid(y + heights.get(name)! + cfg.verticalGap);
    }
  }

  return positions;
}

// ============================================================================
// Beautify Layout
// ============================================================================

/** Input position for beautify: existing node placement */
export interface NodePosition {
  x: number;
  y: number;
}

/** Beautify configuration */
export interface BeautifyLayoutConfig {
  /** Minimum horizontal gap between the right edge of one column and the left edge of the next (px) */
  horizontalGap: number;
  /** Minimum vertical gap between the bottom edge of one node and the top edge of the next in the same column (px) */
  verticalGap: number;
  /** Fallback node width when measured dimensions are unavailable */
  defaultNodeWidth: number;
  /** Fallback node height when measured dimensions are unavailable */
  defaultNodeHeight: number;
}

const DEFAULT_BEAUTIFY_CONFIG: BeautifyLayoutConfig = {
  horizontalGap: 120,
  verticalGap: 40,
  defaultNodeWidth: 220,
  defaultNodeHeight: 150
};

/**
 * Beautify existing node positions: preserve relative column/row ordering
 * but apply uniform spacing based on actual node dimensions.
 *
 * Algorithm:
 * 1. Cluster nodes into columns by X proximity (gap threshold = median width)
 * 2. Sort columns left-to-right by their median X
 * 3. Within each column, sort nodes top-to-bottom by their original Y
 * 4. Re-position with uniform horizontal and vertical gaps
 *
 * @param positions - Current node positions (keyed by node id)
 * @param config - Optional spacing configuration
 * @param nodeDimensions - Optional map of node id to measured {width, height}
 * @param tagReserve - Optional room each node needs beside it for interface tags
 * @returns Map of node id to new {x, y} position
 */
export function computeBeautifyLayout(
  positions: Map<string, NodePosition>,
  config: Partial<BeautifyLayoutConfig> = {},
  nodeDimensions?: Map<string, NodeDimensions>,
  tagReserve?: TagReserve
): Map<string, { x: number; y: number }> {
  const cfg = { ...DEFAULT_BEAUTIFY_CONFIG, ...config };
  const result = new Map<string, { x: number; y: number }>();

  if (positions.size === 0) return result;

  const getDims = (id: string): NodeDimensions =>
    nodeDimensions?.get(id) ?? {
      width: cfg.defaultNodeWidth,
      height: cfg.defaultNodeHeight
    };

  // Collect all nodes sorted by X
  const entries = Array.from(positions.entries()).map(([id, pos]) => ({
    id,
    x: pos.x,
    y: pos.y
  }));
  entries.sort((a, b) => a.x - b.x);

  // Determine clustering threshold: half the median node width
  const widths = entries.map((e) => getDims(e.id).width);
  const sortedWidths = [...widths].sort((a, b) => a - b);
  const medianWidth = sortedWidths[Math.floor(sortedWidths.length / 2)];
  const clusterThreshold = medianWidth * 0.75;

  // Cluster into columns by X proximity
  const columns: Array<typeof entries> = [];
  let currentColumn: typeof entries = [entries[0]];

  for (let i = 1; i < entries.length; i++) {
    const prevX = currentColumn[currentColumn.length - 1].x;
    if (entries[i].x - prevX > clusterThreshold) {
      columns.push(currentColumn);
      currentColumn = [entries[i]];
    } else {
      currentColumn.push(entries[i]);
    }
  }
  columns.push(currentColumn);

  // Sort each column's nodes top-to-bottom by original Y
  for (const col of columns) {
    col.sort((a, b) => a.y - b.y);
  }

  // Compute the global vertical center from the original positions
  const allYs = entries.map((e) => e.y);
  const globalCenterY = (Math.min(...allYs) + Math.max(...allYs)) / 2;

  // Assign new positions column by column
  let currentX = entries[0].x; // Start from the leftmost original X

  for (const [colIndex, col] of columns.entries()) {
    // Find the widest node in this column
    const maxWidth = Math.max(...col.map((e) => getDims(e.id).width));

    // Calculate total height of this column
    const heights = col.map((e) => getDims(e.id).height);
    const totalHeight = heights.reduce((sum, h) => sum + h, 0) + (col.length - 1) * cfg.verticalGap;

    // Center column vertically around the global center
    let y = globalCenterY - totalHeight / 2;

    for (let i = 0; i < col.length; i++) {
      result.set(col[i].id, { x: currentX, y });
      y += heights[i] + cfg.verticalGap;
    }

    const nextColumn = columns[colIndex + 1];
    currentX +=
      maxWidth +
      columnGap(
        cfg.horizontalGap,
        col.map((e) => e.id),
        nextColumn?.map((e) => e.id),
        tagReserve
      );
  }

  return result;
}

// ============================================================================
// Layer Assignment (for auto-layout)
// ============================================================================

/**
 * Assign layers using longest path from the start node (modified BFS).
 * This ensures branching nodes fan out properly and convergence points
 * are placed at the correct depth.
 */
function assignLayers(
  startNode: string,
  adjacency: Map<string, string[]>,
  nodeCount: number
): Map<string, number> {
  const layers = new Map<string, number>();
  layers.set(startNode, 0);

  // Longest-path BFS: re-queue neighbors whenever their layer increases.
  // This ensures convergence nodes (reached via multiple branches) are
  // placed at the depth of the longest path, not the shortest.
  const queue: string[] = [startNode];
  let iterations = 0;
  const maxIterations = nodeCount * nodeCount + 100; // Safety limit for cycles

  while (queue.length > 0 && iterations < maxIterations) {
    iterations++;
    const current = queue.shift()!;
    const currentLayer = layers.get(current) || 0;
    const neighbors = adjacency.get(current) || [];

    for (const neighbor of neighbors) {
      const existingLayer = layers.get(neighbor);
      const newLayer = currentLayer + 1;

      // Only update and re-queue when we find a longer path
      if (existingLayer === undefined || newLayer > existingLayer) {
        layers.set(neighbor, newLayer);
        queue.push(neighbor);
      }
    }
  }

  return layers;
}
