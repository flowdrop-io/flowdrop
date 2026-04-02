/**
 * Auto-positioner for command-created nodes.
 *
 * Computes a reasonable canvas position when no explicit coordinates are given.
 *
 * @module commands/positioner
 */

import type { WorkflowNode } from "../types/index.js";

/** Default starting position for the first node on an empty canvas. */
const DEFAULT_START = { x: 100, y: 100 };

/** Horizontal gap between the rightmost existing node and a new node. */
const HORIZONTAL_GAP = 250;

/**
 * Computes an auto-position for a new node based on existing nodes.
 *
 * - Empty canvas: returns `{ x: 100, y: 100 }`.
 * - Non-empty canvas: places new node 250px to the right of the rightmost node,
 *   at the same y as the rightmost node.
 */
export function computeAutoPosition(
  existingNodes: Pick<WorkflowNode, "position">[],
): { x: number; y: number } {
  if (existingNodes.length === 0) {
    return { ...DEFAULT_START };
  }

  let rightmost = existingNodes[0];
  for (const node of existingNodes) {
    if (node.position.x > rightmost.position.x) {
      rightmost = node;
    }
  }

  return {
    x: rightmost.position.x + HORIZONTAL_GAP,
    y: rightmost.position.y,
  };
}
