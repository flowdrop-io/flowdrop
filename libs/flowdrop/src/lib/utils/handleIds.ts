/**
 * Handle ID utilities for FlowDrop
 *
 * Handle IDs encode node + direction + port in the format:
 * `${nodeId}-${direction}-${portId}` (e.g., "node1-output-trigger")
 *
 * @module utils/handleIds
 */

/**
 * Build a handle ID from its parts.
 *
 * @param nodeId - The node identifier
 * @param direction - 'input' or 'output'
 * @param portId - The port identifier
 * @returns A composite handle ID string
 */
export function buildHandleId(
	nodeId: string,
	direction: 'input' | 'output',
	portId: string
): string {
	return `${nodeId}-${direction}-${portId}`;
}

/**
 * Extract the port ID from a composite handle ID.
 *
 * Supports two formats:
 * 1. Standard: `${nodeId}-output-${portId}` or `${nodeId}-input-${portId}`
 * 2. Short: just the portId itself (returned as-is)
 *
 * @param handleId - The handle ID string
 * @returns The port ID, or null if handleId is empty/undefined
 */
export function extractPortId(handleId: string | undefined): string | null {
	if (!handleId) return null;

	const outputMatch = handleId.lastIndexOf('-output-');
	if (outputMatch !== -1) {
		return handleId.substring(outputMatch + '-output-'.length);
	}

	const inputMatch = handleId.lastIndexOf('-input-');
	if (inputMatch !== -1) {
		return handleId.substring(inputMatch + '-input-'.length);
	}

	// Short format: the handleId IS the port ID
	return handleId;
}

/**
 * Extract the direction from a composite handle ID.
 *
 * @param handleId - The handle ID string
 * @returns 'input', 'output', or null if not found
 */
export function extractDirection(handleId: string | undefined): 'input' | 'output' | null {
	if (!handleId) return null;

	if (handleId.includes('-output-')) return 'output';
	if (handleId.includes('-input-')) return 'input';

	return null;
}
