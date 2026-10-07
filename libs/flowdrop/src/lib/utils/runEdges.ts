/**
 * Hot edges: which connections a run passed.
 *
 * The canvas draws a "hot" edge in the success colour while a run's statuses
 * are shown (Test mode, or Edit mode while a run goes). The rule is derived
 * from the two end nodes' statuses alone, so it needs nothing the status
 * store does not already hold, and it lives in one place.
 *
 * An edge is hot when the run handed data over it:
 *
 * - its source node is `completed` (a failed, paused, waiting, skipped or
 *   cancelled source passed nothing on), and
 * - its target node has started because of it: `running`, `completed`,
 *   `failed`, `paused` or `interrupted`.
 *
 * Not hot: a target that is `idle` (never reached), `pending` (a job exists
 * but nothing has started, so the edge is not passed yet), `skipped` (the
 * other branch of a gateway was taken) or `cancelled`.
 *
 * @module utils/runEdges
 */

import type { NodeExecutionInfo, NodeExecutionStatus } from '../types/index.js';

/** Target statuses that show the run has reached the target node. */
const REACHED: ReadonlySet<NodeExecutionStatus> = new Set([
  'running',
  'completed',
  'failed',
  'paused',
  'interrupted'
]);

/** Whether the run passed the edge from `source` to `target`, given their statuses. */
export function isEdgeHot(
  source: Pick<NodeExecutionInfo, 'status'> | undefined,
  target: Pick<NodeExecutionInfo, 'status'> | undefined
): boolean {
  if (!source || !target) return false;
  return source.status === 'completed' && REACHED.has(target.status);
}
