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
 */

import type { AgentSpecFlow } from '../../types/agentspec.js';

/** Measured dimensions for a node */
export interface NodeDimensions {
  width: number;
  height: number;
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
}

const DEFAULT_CONFIG: AutoLayoutConfig = {
  horizontalGap: 120,
  verticalGap: 40,
  startX: 100,
  startY: 100,
  defaultNodeWidth: 220,
  defaultNodeHeight: 150
};

/**
 * Compute node positions for an Agent Spec flow using layered layout.
 * Takes actual node dimensions into account to prevent overlap.
 *
 * @param flow - The Agent Spec flow to layout
 * @param config - Optional layout configuration
 * @param nodeDimensions - Optional map of node name to measured {width, height}
 * @returns Map of node name to {x, y} position
 */
export function computeAutoLayout(
  flow: AgentSpecFlow,
  config: Partial<AutoLayoutConfig> = {},
  nodeDimensions?: Map<string, NodeDimensions>
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

  for (const layerIndex of sortedLayers) {
    layerXPositions.set(layerIndex, currentX);

    // Advance X by the widest node in this layer + horizontal gap
    const nodesInLayer = layerGroups.get(layerIndex)!;
    const maxWidth = Math.max(...nodesInLayer.map((name) => getDims(name).width));
    currentX += maxWidth + cfg.horizontalGap;
  }

  // Compute Y positions within each layer, using actual node heights
  for (const layerIndex of sortedLayers) {
    const nodesInLayer = layerGroups.get(layerIndex)!;
    const x = layerXPositions.get(layerIndex)!;

    // Calculate total height of this column (sum of node heights + gaps)
    const heights = nodesInLayer.map((name) => getDims(name).height);
    const totalHeight =
      heights.reduce((sum, h) => sum + h, 0) + (nodesInLayer.length - 1) * cfg.verticalGap;

    // Center the column vertically around startY
    let y = cfg.startY - totalHeight / 2;

    for (let i = 0; i < nodesInLayer.length; i++) {
      positions.set(nodesInLayer[i], { x, y });
      y += heights[i] + cfg.verticalGap;
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
 * @returns Map of node id to new {x, y} position
 */
export function computeBeautifyLayout(
  positions: Map<string, NodePosition>,
  config: Partial<BeautifyLayoutConfig> = {},
  nodeDimensions?: Map<string, NodeDimensions>
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

  for (const col of columns) {
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

    currentX += maxWidth + cfg.horizontalGap;
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
