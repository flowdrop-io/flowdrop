/**
 * Port Coordinate Store (Svelte 5 Runes)
 *
 * General-purpose store that maintains absolute canvas-space coordinates
 * for all port handles in the workflow. Built from SvelteFlow's internal
 * handle bounds data combined with FlowDrop port metadata.
 *
 * Primary consumers:
 * - Proximity connect (port-to-port distance instead of node center distance)
 *
 * Coordinates are derived from SvelteFlow's InternalNode.internals.handleBounds
 * which SvelteFlow already maintains for all node types. This avoids replicating
 * CSS positioning logic and stays automatically accurate.
 *
 * The reactive state lives in the {@link PortCoordinateStore} class — one per
 * FlowDrop instance, resolved in components via `getInstance().portCoordinates`.
 *
 * @module stores/portCoordinateStore
 */

import { SvelteMap } from 'svelte/reactivity';
import { untrack } from 'svelte';
import type {
  WorkflowNode as WorkflowNodeType,
  PortCoordinate,
  PortCoordinateMap
} from '../types/index.js';
import type { InternalNode } from '@xyflow/svelte';
import { ProximityConnectHelper } from '../helpers/proximityConnect.js';

/**
 * Parse a handle ID to extract nodeId, direction, and portId.
 * Handle ID format: ${nodeId}-${direction}-${portId}
 *
 * Note: nodeId itself can contain hyphens, so we match direction
 * from the known suffixes (-input- or -output-).
 */
function parseHandleId(handleId: string): {
  nodeId: string;
  direction: 'input' | 'output';
  portId: string;
} | null {
  // Match the last occurrence of -input- or -output- to handle nodeIds with hyphens
  const inputMatch = handleId.match(/^(.+)-input-(.+)$/);
  if (inputMatch) {
    return { nodeId: inputMatch[1], direction: 'input', portId: inputMatch[2] };
  }
  const outputMatch = handleId.match(/^(.+)-output-(.+)$/);
  if (outputMatch) {
    return {
      nodeId: outputMatch[1],
      direction: 'output',
      portId: outputMatch[2]
    };
  }
  return null;
}

/**
 * Build a dataType lookup map from a node's ports.
 * Maps portId -> dataType for quick lookup when processing handle bounds.
 */
function buildPortDataTypeLookup(node: WorkflowNodeType): Map<string, string> {
  const lookup = new Map<string, string>();

  const inputs = ProximityConnectHelper.getAllPorts(node, 'input');
  for (const port of inputs) {
    lookup.set(`input-${port.id}`, port.dataType);
  }

  const outputs = ProximityConnectHelper.getAllPorts(node, 'output');
  for (const port of outputs) {
    lookup.set(`output-${port.id}`, port.dataType);
  }

  return lookup;
}

/**
 * Compute port coordinates for a single node from SvelteFlow internal data.
 *
 * @param node - The workflow node
 * @param internalNode - SvelteFlow's internal node with handleBounds
 * @returns Array of PortCoordinate entries for this node
 */
function computeNodePortCoordinates(
  node: WorkflowNodeType,
  internalNode: InternalNode
): PortCoordinate[] {
  const handleBounds = internalNode.internals.handleBounds;
  if (!handleBounds) return [];

  const posAbs = internalNode.internals.positionAbsolute;
  const dataTypeLookup = buildPortDataTypeLookup(node);
  const result: PortCoordinate[] = [];

  const allHandles = [...(handleBounds.source ?? []), ...(handleBounds.target ?? [])];

  for (const handle of allHandles) {
    if (!handle.id) continue;

    const parsed = parseHandleId(handle.id);
    if (!parsed) continue;

    const lookupKey = `${parsed.direction}-${parsed.portId}`;
    const dataType = dataTypeLookup.get(lookupKey);
    if (!dataType) continue;

    result.push({
      x: posAbs.x + handle.x + handle.width / 2,
      y: posAbs.y + handle.y + handle.height / 2,
      handleId: handle.id,
      nodeId: parsed.nodeId,
      direction: parsed.direction,
      dataType
    });
  }

  return result;
}

// =========================================================================
// PortCoordinateStore (per-instance reactive state)
// =========================================================================

/**
 * Per-instance absolute port coordinates, keyed by handleId.
 *
 * A single SvelteMap mutated in place: per-key reads (getPortCoordinate)
 * only react to the keys they touch, and Svelte coalesces synchronous
 * mutations into one flush, so bulk updates stay cheap.
 */
export class PortCoordinateStore {
  /**
   * Reactive state holding all port absolute coordinates, keyed by handleId.
   */
  readonly #coordinates: PortCoordinateMap = new SvelteMap<string, PortCoordinate>();

  /**
   * Rebuild coordinates for ALL nodes from SvelteFlow internals.
   * Call on initial workflow load (after render) and after bulk changes.
   *
   * @param nodes - All workflow nodes
   * @param getInternalNode - SvelteFlow's getInternalNode function
   */
  rebuildAll(
    nodes: WorkflowNodeType[],
    getInternalNode: (id: string) => InternalNode | undefined
  ): void {
    this.#coordinates.clear();

    for (const node of nodes) {
      const internalNode = getInternalNode(node.id);
      if (!internalNode) continue;

      const coords = computeNodePortCoordinates(node, internalNode);
      for (const coord of coords) {
        this.#coordinates.set(coord.handleId, coord);
      }
    }
  }

  /**
   * Update coordinates for a single node (efficient for drag updates).
   * Only recomputes ports for the specified node.
   *
   * @param node - The workflow node to update
   * @param getInternalNode - SvelteFlow's getInternalNode function
   */
  updateNode(
    node: WorkflowNodeType,
    getInternalNode: (id: string) => InternalNode | undefined
  ): void {
    const internalNode = getInternalNode(node.id);
    if (!internalNode) return;

    // Collect this node's stale keys without tracking the read (callers run
    // inside $effect), then mutate in place — only the touched keys notify.
    const stale: string[] = [];
    untrack(() => {
      for (const [key, coord] of this.#coordinates) {
        if (coord.nodeId === node.id) stale.push(key);
      }
    });
    for (const key of stale) {
      this.#coordinates.delete(key);
    }
    for (const coord of computeNodePortCoordinates(node, internalNode)) {
      this.#coordinates.set(coord.handleId, coord);
    }
  }

  /**
   * Remove all coordinates for a node (on node delete).
   *
   * @param nodeId - ID of the node to remove
   */
  removeNode(nodeId: string): void {
    const stale: string[] = [];
    untrack(() => {
      for (const [key, coord] of this.#coordinates) {
        if (coord.nodeId === nodeId) stale.push(key);
      }
    });
    for (const key of stale) {
      this.#coordinates.delete(key);
    }
  }

  /**
   * Clear all port coordinates (lifecycle cleanup).
   */
  clear(): void {
    this.#coordinates.clear();
  }

  /**
   * Get coordinates for a specific handle.
   *
   * @param handleId - The handle ID to look up
   * @returns The port coordinate or undefined if not found
   */
  get(handleId: string): PortCoordinate | undefined {
    return this.#coordinates.get(handleId);
  }

  /**
   * Get all coordinates for a specific node.
   *
   * @param nodeId - The node ID to look up
   * @returns Array of port coordinates for the node
   */
  getForNode(nodeId: string): PortCoordinate[] {
    const result: PortCoordinate[] = [];
    for (const coord of this.#coordinates.values()) {
      if (coord.nodeId === nodeId) {
        result.push(coord);
      }
    }
    return result;
  }

  /**
   * The reactive port coordinate map.
   * Returns the reactive SvelteMap directly.
   */
  get coordinates(): PortCoordinateMap {
    return this.#coordinates;
  }
}
