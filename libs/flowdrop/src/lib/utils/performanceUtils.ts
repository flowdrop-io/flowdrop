/**
 * Performance Utilities
 * Helper functions for optimizing performance in the FlowDrop app
 */

import type { WorkflowNode, WorkflowEdge } from '../types/index.js';

/**
 * Fast shallow comparison for workflow nodes
 * Avoids expensive JSON.stringify operations
 */
export function areNodeArraysEqual(nodes1: WorkflowNode[], nodes2: WorkflowNode[]): boolean {
	if (nodes1.length !== nodes2.length) return false;

	for (let i = 0; i < nodes1.length; i++) {
		const node1 = nodes1[i];
		const node2 = nodes2[i];

		// Quick ID check
		if (node1?.id !== node2?.id) return false;

		// Check position (most common change during drag)
		if (node1?.position?.x !== node2?.position?.x || node1?.position?.y !== node2?.position?.y) {
			return false;
		}

		// Check selected state
		if (node1?.selected !== node2?.selected) return false;

		// Skip deep config comparison unless we need to
		// Most updates are position-based
	}

	return true;
}

/**
 * Fast shallow comparison for workflow edges
 * Avoids expensive JSON.stringify operations
 */
export function areEdgeArraysEqual(edges1: WorkflowEdge[], edges2: WorkflowEdge[]): boolean {
	if (edges1.length !== edges2.length) return false;

	for (let i = 0; i < edges1.length; i++) {
		const edge1 = edges1[i];
		const edge2 = edges2[i];

		if (
			edge1?.id !== edge2?.id ||
			edge1?.source !== edge2?.source ||
			edge1?.target !== edge2?.target ||
			edge1?.sourceHandle !== edge2?.sourceHandle ||
			edge1?.targetHandle !== edge2?.targetHandle
		) {
			return false;
		}
	}

	return true;
}

/**
 * Throttle function execution to reduce frequency
 * Uses requestAnimationFrame for smooth UI updates
 */
export function throttle<T extends (...args: any[]) => void>(
	func: T,
	wait: number
): (...args: Parameters<T>) => void {
	let timeout: ReturnType<typeof setTimeout> | null = null;
	let lastRan = 0;

	return function (...args: Parameters<T>) {
		const now = Date.now();

		if (!lastRan || now - lastRan >= wait) {
			func(...args);
			lastRan = now;
		} else {
			if (timeout) {
				clearTimeout(timeout);
			}

			timeout = setTimeout(
				() => {
					func(...args);
					lastRan = Date.now();
				},
				wait - (now - lastRan)
			);
		}
	};
}

/**
 * Debounce function execution to reduce frequency
 * Waits for a pause in calls before executing
 */
export function debounce<T extends (...args: any[]) => void>(
	func: T,
	wait: number
): (...args: Parameters<T>) => void {
	let timeout: ReturnType<typeof setTimeout> | null = null;

	return function (...args: Parameters<T>) {
		if (timeout) {
			clearTimeout(timeout);
		}

		timeout = setTimeout(() => {
			func(...args);
		}, wait);
	};
}

/**
 * RequestAnimationFrame-based throttle for smooth animations
 * Better for visual updates like node dragging
 */
export function rafThrottle<T extends (...args: any[]) => void>(
	func: T
): (...args: Parameters<T>) => void {
	let rafId: number | null = null;
	let lastArgs: Parameters<T> | null = null;

	return function (...args: Parameters<T>) {
		lastArgs = args;

		if (rafId === null) {
			rafId = requestAnimationFrame(() => {
				if (lastArgs) {
					func(...lastArgs);
				}
				rafId = null;
				lastArgs = null;
			});
		}
	};
}
