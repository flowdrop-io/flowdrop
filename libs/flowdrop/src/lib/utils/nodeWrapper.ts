/**
 * Node Wrapper Utilities
 * Provides utilities for wrapping nodes with status overlays
 */

import type { NodeExecutionInfo } from '../types/index.js';

/**
 * Configuration for node status overlay
 */
export interface NodeStatusConfig {
	position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
	size?: 'sm' | 'md' | 'lg';
	showDetails?: boolean;
}

/**
 * Default configuration for node status overlays
 */
export const DEFAULT_NODE_STATUS_CONFIG: NodeStatusConfig = {
	position: 'top-right',
	size: 'md',
	showDetails: true
};

/**
 * Create a node wrapper configuration
 */
export function createNodeWrapperConfig(
	nodeId: string,
	executionInfo?: NodeExecutionInfo,
	config: NodeStatusConfig = {}
): {
	nodeId: string;
	executionInfo?: NodeExecutionInfo;
	statusPosition: NodeStatusConfig['position'];
	statusSize: NodeStatusConfig['size'];
	showStatusDetails: boolean;
} {
	return {
		nodeId,
		executionInfo,
		statusPosition: config.position || DEFAULT_NODE_STATUS_CONFIG.position,
		statusSize: config.size || DEFAULT_NODE_STATUS_CONFIG.size,
		showStatusDetails: config.showDetails ?? DEFAULT_NODE_STATUS_CONFIG.showDetails ?? true
	};
}

/**
 * Check if a node should show status overlay
 */
export function shouldShowNodeStatus(executionInfo?: NodeExecutionInfo): boolean {
	if (!executionInfo) return false;

	return (
		executionInfo.status !== 'idle' || executionInfo.executionCount > 0 || executionInfo.isExecuting
	);
}

/**
 * Get optimal status position based on node type
 */
export function getOptimalStatusPosition(nodeType: string): NodeStatusConfig['position'] {
	switch (nodeType) {
		case 'tool':
			return 'top-left';
		case 'note':
			return 'bottom-right';
		case 'simple':
		case 'square':
		default:
			return 'top-right';
	}
}

/**
 * Get optimal status size based on node type
 */
export function getOptimalStatusSize(nodeType: string): NodeStatusConfig['size'] {
	switch (nodeType) {
		case 'tool':
			return 'sm';
		case 'note':
			return 'sm';
		case 'simple':
		case 'square':
		default:
			return 'md';
	}
}
