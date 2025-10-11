/**
 * Node Status Utility Functions
 * Provides utilities for managing and displaying node execution status
 */

import type { NodeExecutionStatus, NodeExecutionInfo } from '../types/index.js';

/**
 * Get the display color for a node execution status
 */
export function getStatusColor(status: NodeExecutionStatus): string {
	const statusColors: Record<NodeExecutionStatus, string> = {
		idle: '#6b7280', // gray
		pending: '#f59e0b', // amber
		running: '#3b82f6', // blue
		completed: '#10b981', // emerald
		failed: '#ef4444', // red
		cancelled: '#6b7280', // gray
		skipped: '#8b5cf6' // violet
	};

	return statusColors[status] || statusColors.idle;
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
		skipped: 'mdi:skip-next'
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
		skipped: 'Skipped'
	};

	return statusLabels[status] || statusLabels.idle;
}

/**
 * Get the background color for a node execution status overlay
 */
export function getStatusBackgroundColor(status: NodeExecutionStatus): string {
	const statusBackgroundColors: Record<NodeExecutionStatus, string> = {
		idle: '#f9fafb', // light gray
		pending: '#fef3c7', // light amber
		running: '#dbeafe', // light blue
		completed: '#d1fae5', // light emerald
		failed: '#fee2e2', // light red
		cancelled: '#f3f4f6', // light gray
		skipped: '#ede9fe' // light violet
	};

	return statusBackgroundColors[status] || statusBackgroundColors.idle;
}

/**
 * Get the text color for a node execution status overlay
 */
export function getStatusTextColor(status: NodeExecutionStatus): string {
	const statusTextColors: Record<NodeExecutionStatus, string> = {
		idle: '#6b7280', // gray
		pending: '#d97706', // amber
		running: '#1d4ed8', // blue
		completed: '#059669', // emerald
		failed: '#dc2626', // red
		cancelled: '#6b7280', // gray
		skipped: '#7c3aed' // violet
	};

	return statusTextColors[status] || statusTextColors.idle;
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
