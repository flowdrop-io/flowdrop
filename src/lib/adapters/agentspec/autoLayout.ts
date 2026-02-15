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

import type { AgentSpecFlow, AgentSpecControlFlowEdge } from '../../types/agentspec.js';

/** Layout configuration */
export interface AutoLayoutConfig {
	/** Horizontal spacing between layers (px) */
	horizontalSpacing: number;
	/** Vertical spacing between nodes in the same layer (px) */
	verticalSpacing: number;
	/** Starting X position */
	startX: number;
	/** Starting Y position */
	startY: number;
}

const DEFAULT_CONFIG: AutoLayoutConfig = {
	horizontalSpacing: 300,
	verticalSpacing: 150,
	startX: 100,
	startY: 100
};

/**
 * Compute node positions for an Agent Spec flow using layered layout.
 *
 * @param flow - The Agent Spec flow to layout
 * @param config - Optional layout configuration
 * @returns Map of node name to {x, y} position
 */
export function computeAutoLayout(
	flow: AgentSpecFlow,
	config: Partial<AutoLayoutConfig> = {}
): Map<string, { x: number; y: number }> {
	const cfg = { ...DEFAULT_CONFIG, ...config };
	const positions = new Map<string, { x: number; y: number }>();

	if (flow.nodes.length === 0) return positions;

	// Build adjacency list from control-flow edges
	const adjacency = new Map<string, string[]>();
	const inDegree = new Map<string, number>();

	for (const node of flow.nodes) {
		adjacency.set(node.name, []);
		inDegree.set(node.name, 0);
	}

	for (const edge of flow.control_flow_connections) {
		const neighbors = adjacency.get(edge.from_node);
		if (neighbors) {
			neighbors.push(edge.to_node);
		}
		inDegree.set(edge.to_node, (inDegree.get(edge.to_node) || 0) + 1);
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

	for (const layerIndex of sortedLayers) {
		const nodesInLayer = layerGroups.get(layerIndex)!;
		const x = cfg.startX + layerIndex * cfg.horizontalSpacing;

		// Center nodes vertically
		const totalHeight = (nodesInLayer.length - 1) * cfg.verticalSpacing;
		const startY = cfg.startY - totalHeight / 2;

		for (let i = 0; i < nodesInLayer.length; i++) {
			positions.set(nodesInLayer[i], {
				x,
				y: startY + i * cfg.verticalSpacing
			});
		}
	}

	return positions;
}

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

	// Use BFS but take the maximum layer for each node
	// (longest path ensures proper branching layout)
	const queue: string[] = [startNode];
	const visited = new Set<string>();
	let iterations = 0;
	const maxIterations = nodeCount * nodeCount + 100; // Safety limit for cycles

	while (queue.length > 0 && iterations < maxIterations) {
		iterations++;
		const current = queue.shift()!;

		if (visited.has(current)) continue;
		visited.add(current);

		const currentLayer = layers.get(current) || 0;
		const neighbors = adjacency.get(current) || [];

		for (const neighbor of neighbors) {
			const existingLayer = layers.get(neighbor);
			const newLayer = currentLayer + 1;

			// Take the max layer (longest path)
			if (existingLayer === undefined || newLayer > existingLayer) {
				layers.set(neighbor, newLayer);
			}

			if (!visited.has(neighbor)) {
				queue.push(neighbor);
			}
		}
	}

	return layers;
}
