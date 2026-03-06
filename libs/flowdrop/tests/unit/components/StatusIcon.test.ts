/**
 * Unit Tests - StatusIcon utility functions
 *
 * Tests the nodeStatus utility functions that StatusIcon depends on.
 */

import { describe, it, expect } from 'vitest';
import { getStatusColor, getStatusIcon, getStatusLabel } from '$lib/utils/nodeStatus.js';

describe('getStatusColor', () => {
	it('should return a color for completed status', () => {
		const color = getStatusColor('completed');
		expect(color).toBeDefined();
		expect(typeof color).toBe('string');
	});

	it('should return a color for failed status', () => {
		const color = getStatusColor('failed');
		expect(color).toBeDefined();
		expect(typeof color).toBe('string');
	});

	it('should return a color for running status', () => {
		const color = getStatusColor('running');
		expect(color).toBeDefined();
		expect(typeof color).toBe('string');
	});

	it('should return a color for idle status', () => {
		const color = getStatusColor('idle');
		expect(color).toBeDefined();
		expect(typeof color).toBe('string');
	});

	it('should return colors for all known statuses', () => {
		const statuses = [
			'idle',
			'pending',
			'running',
			'completed',
			'failed',
			'cancelled',
			'skipped'
		] as const;
		for (const status of statuses) {
			expect(getStatusColor(status)).toBeDefined();
		}
	});
});

describe('getStatusIcon', () => {
	it('should return an icon for completed status', () => {
		const icon = getStatusIcon('completed');
		expect(icon).toBeDefined();
		expect(typeof icon).toBe('string');
	});

	it('should return an icon for failed status', () => {
		const icon = getStatusIcon('failed');
		expect(icon).toBeDefined();
		expect(typeof icon).toBe('string');
	});

	it('should return an icon for running status', () => {
		const icon = getStatusIcon('running');
		expect(icon).toBeDefined();
		expect(typeof icon).toBe('string');
	});

	it('should return icons for all known statuses', () => {
		const statuses = [
			'idle',
			'pending',
			'running',
			'completed',
			'failed',
			'cancelled',
			'skipped'
		] as const;
		for (const status of statuses) {
			expect(getStatusIcon(status)).toBeDefined();
		}
	});
});

describe('getStatusLabel', () => {
	it('should return a label for completed status', () => {
		const label = getStatusLabel('completed');
		expect(label).toBeDefined();
		expect(typeof label).toBe('string');
		expect(label.length).toBeGreaterThan(0);
	});

	it('should return a label for failed status', () => {
		const label = getStatusLabel('failed');
		expect(label).toBeDefined();
		expect(typeof label).toBe('string');
	});

	it('should return labels for all known statuses', () => {
		const statuses = [
			'idle',
			'pending',
			'running',
			'completed',
			'failed',
			'cancelled',
			'skipped'
		] as const;
		for (const status of statuses) {
			expect(getStatusLabel(status)).toBeDefined();
		}
	});
});
