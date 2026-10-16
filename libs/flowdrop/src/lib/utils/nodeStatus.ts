/**
 * Node Status Utility Functions
 * Provides utilities for managing and displaying node execution status
 */

import type { NodeExecutionStatus, NodeExecutionInfo } from '../types/index.js';

/**
 * The five statuses a run can show on the canvas (the `StatusPill` vocabulary).
 * Same names as `--fd-status-*` tokens.
 */
export type PillStatus = 'running' | 'completed' | 'waiting' | 'failed' | 'skipped';

/**
 * Map an execution status onto the pill vocabulary; `null` = draw nothing.
 *
 *   idle        -> null       nothing happened (a node that never ran).
 *   pending     -> null       queued, not started: no result and no activity
 *                             to report yet; the pill appears once it runs.
 *   running     -> running
 *   completed   -> completed
 *   failed      -> failed
 *   paused      -> waiting    the run is held, usually for a person.
 *   interrupted -> waiting    waiting for a human ("Waiting for you").
 *   skipped     -> skipped
 *   cancelled   -> skipped    the node did not finish and has no result.
 */
export function toPillStatus(status: NodeExecutionStatus): PillStatus | null {
  switch (status) {
    case 'running':
    case 'completed':
    case 'failed':
    case 'skipped':
      return status;
    case 'paused':
    case 'interrupted':
      return 'waiting';
    case 'cancelled':
      return 'skipped';
    default:
      return null;
  }
}

/** The `--fd-status-*` token name for an execution status (idle falls back to skipped's muted tone). */
function statusToken(status: NodeExecutionStatus): PillStatus {
  switch (status) {
    case 'pending':
      return 'waiting';
    default:
      return toPillStatus(status) ?? 'skipped';
  }
}

/**
 * Get the display color for a node execution status, as a CSS value
 * (`var(--fd-status-*)`), so themes and dark mode apply. Only valid in CSS.
 */
export function getStatusColor(status: NodeExecutionStatus): string {
  return `var(--fd-status-${statusToken(status)})`;
}

/**
 * Get the display icon for a node execution status
 */
export function getStatusIcon(status: NodeExecutionStatus): string {
  const statusIcons: Record<NodeExecutionStatus, string> = {
    idle: 'mdi:circle-outline',
    pending: 'mdi:clock-outline',
    running: 'mdi:loading',
    completed: 'mdi:check-circle',
    failed: 'mdi:alert-circle',
    cancelled: 'mdi:cancel',
    skipped: 'mdi:skip-next',
    paused: 'mdi:pause-circle-outline',
    interrupted: 'mdi:account-clock-outline'
  };

  return statusIcons[status] || statusIcons.idle;
}

/**
 * Get the display label for a node execution status
 */
export function getStatusLabel(status: NodeExecutionStatus): string {
  const statusLabels: Record<NodeExecutionStatus, string> = {
    idle: 'Idle',
    pending: 'Pending',
    running: 'Running',
    completed: 'Completed',
    failed: 'Failed',
    cancelled: 'Cancelled',
    skipped: 'Skipped',
    paused: 'Paused',
    interrupted: 'Waiting'
  };

  return statusLabels[status] || statusLabels.idle;
}

/**
 * Get the background color for a node execution status overlay, as a CSS value
 * (`var(--fd-status-*-soft)`).
 */
export function getStatusBackgroundColor(status: NodeExecutionStatus): string {
  return `var(--fd-status-${statusToken(status)}-soft)`;
}

/**
 * Get the text color for a node execution status overlay, as a CSS value.
 * Same as {@link getStatusColor}: the status tokens are text-safe on `-soft`.
 */
export function getStatusTextColor(status: NodeExecutionStatus): string {
  return getStatusColor(status);
}

/**
 * Create a default NodeExecutionInfo object
 */
export function createDefaultExecutionInfo(): NodeExecutionInfo {
  return {
    status: 'idle',
    executionCount: 0,
    isExecuting: false
  };
}

/**
 * Update node execution info when execution starts
 */
export function updateExecutionStart(executionInfo: NodeExecutionInfo): NodeExecutionInfo {
  return {
    ...executionInfo,
    status: 'running',
    isExecuting: true
  };
}

/**
 * Update node execution info when execution completes successfully
 */
export function updateExecutionComplete(
  executionInfo: NodeExecutionInfo,
  duration: number
): NodeExecutionInfo {
  return {
    ...executionInfo,
    status: 'completed',
    executionCount: executionInfo.executionCount + 1,
    lastExecuted: new Date().toISOString(),
    lastExecutionDuration: duration,
    isExecuting: false,
    lastError: undefined // Clear any previous error
  };
}

/**
 * Update node execution info when execution fails
 */
export function updateExecutionFailed(
  executionInfo: NodeExecutionInfo,
  error: string,
  duration: number
): NodeExecutionInfo {
  return {
    ...executionInfo,
    status: 'failed',
    executionCount: executionInfo.executionCount + 1,
    lastExecuted: new Date().toISOString(),
    lastExecutionDuration: duration,
    isExecuting: false,
    lastError: error
  };
}

/**
 * Reset node execution info
 */
export function resetExecutionInfo(executionInfo: NodeExecutionInfo): NodeExecutionInfo {
  return {
    ...executionInfo,
    status: 'idle',
    isExecuting: false,
    lastError: undefined
  };
}

/**
 * Format execution duration for display
 */
export function formatExecutionDuration(duration?: number): string {
  if (!duration) return 'N/A';

  if (duration < 1000) {
    return `${Math.round(duration)}ms`;
  } else if (duration < 60000) {
    return `${(duration / 1000).toFixed(1)}s`;
  } else {
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
}

/**
 * Format last executed timestamp for display
 */
export function formatLastExecuted(timestamp?: string): string {
  if (!timestamp) return 'Never';

  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 60000) {
    // Less than 1 minute
    return 'Just now';
  } else if (diffMs < 3600000) {
    // Less than 1 hour
    const minutes = Math.floor(diffMs / 60000);
    return `${minutes}m ago`;
  } else if (diffMs < 86400000) {
    // Less than 1 day
    const hours = Math.floor(diffMs / 3600000);
    return `${hours}h ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Remove `data.executionInfo` from every node.
 *
 * Run status belongs to a run, not to the workflow: it lives in the
 * instance's `PlaygroundStore` (`fd.playground.nodeStatuses`) and must never
 * be written into a workflow that is synced to the store, saved or exported.
 * Returns the same array when no node carries it, otherwise new node objects
 * for those that did.
 */
export function stripExecutionInfo<T extends { data: object }>(nodes: T[]): T[] {
  if (!nodes.some((node) => 'executionInfo' in node.data)) return nodes;
  return nodes.map((node) => {
    if (!('executionInfo' in node.data)) return node;
    const { executionInfo: _dropped, ...data } = node.data as Record<string, unknown>;
    return { ...node, data } as T;
  });
}
