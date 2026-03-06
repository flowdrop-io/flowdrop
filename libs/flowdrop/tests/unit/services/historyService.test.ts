/**
 * Tests for HistoryService
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HistoryService } from '$lib/services/historyService.js';
import { createTestWorkflow, createTestNode } from '../../utils/test-helpers.js';

describe('HistoryService', () => {
	let service: HistoryService;

	beforeEach(() => {
		service = new HistoryService(50);
	});

	describe('initialize', () => {
		it('should set initial state', () => {
			const workflow = createTestWorkflow();
			service.initialize(workflow);

			const state = service.getState();
			expect(state.canUndo).toBe(false);
			expect(state.canRedo).toBe(false);
			expect(state.historyLength).toBe(1);
			expect(state.isInTransaction).toBe(false);
		});

		it('should clear existing history on re-initialization', () => {
			const workflow1 = createTestWorkflow({ name: 'First' });
			const workflow2 = createTestWorkflow({ name: 'Second' });

			service.initialize(workflow1);
			service.push(workflow1, { description: 'Change' });
			service.initialize(workflow2);

			expect(service.getState().historyLength).toBe(1);
			expect(service.canUndo()).toBe(false);
			expect(service.canRedo()).toBe(false);
		});
	});

	describe('push', () => {
		it('should add to undo stack and clear redo stack', () => {
			const workflow = createTestWorkflow();
			service.initialize(workflow);

			service.push(workflow, { description: 'Add node' });

			expect(service.canUndo()).toBe(true);
			expect(service.getState().historyLength).toBe(2);
		});

		it('should clear redo stack when new change is pushed', () => {
			const workflow = createTestWorkflow();
			service.initialize(workflow);
			service.push(workflow, { description: 'Change 1' });
			service.undo();
			expect(service.canRedo()).toBe(true);

			service.push(workflow, { description: 'Change 2' });
			expect(service.canRedo()).toBe(false);
		});

		it('should trim history when exceeding maxEntries', () => {
			const service3 = new HistoryService(3);
			const workflow = createTestWorkflow();
			service3.initialize(workflow);

			service3.push(workflow, { description: 'Change 1' });
			service3.push(workflow, { description: 'Change 2' });
			service3.push(workflow, { description: 'Change 3' });

			// maxEntries=3 means 3 entries in undo stack max
			expect(service3.getState().currentIndex).toBeLessThanOrEqual(2);
		});

		it('should skip when skipHistory is true', () => {
			const workflow = createTestWorkflow();
			service.initialize(workflow);

			service.push(workflow, { skipHistory: true });
			expect(service.getState().historyLength).toBe(1);
		});

		it('should skip during transaction', () => {
			const workflow = createTestWorkflow();
			service.initialize(workflow);

			service.startTransaction(workflow, 'Batch');
			service.push(workflow, { description: 'Should be skipped' });
			service.commitTransaction();

			// Only 2 entries: initial + transaction commit
			expect(service.getState().historyLength).toBe(2);
		});
	});

	describe('undo', () => {
		it('should return previous state', () => {
			const workflow1 = createTestWorkflow({ name: 'Initial' });
			service.initialize(workflow1);

			const workflow2 = createTestWorkflow({ name: 'Modified' });
			service.push(workflow2, { description: 'Modify' });

			const result = service.undo();
			expect(result).not.toBeNull();
			// After undo, we get the state that was on top of the undo stack
		});

		it('should return null when at beginning of history', () => {
			const workflow = createTestWorkflow();
			service.initialize(workflow);

			const result = service.undo();
			expect(result).toBeNull();
		});

		it('should enable redo after undo', () => {
			const workflow = createTestWorkflow();
			service.initialize(workflow);
			service.push(workflow, { description: 'Change' });

			service.undo();
			expect(service.canRedo()).toBe(true);
		});
	});

	describe('redo', () => {
		it('should return next state after undo', () => {
			const workflow = createTestWorkflow();
			service.initialize(workflow);
			service.push(workflow, { description: 'Change' });
			service.undo();

			const result = service.redo();
			expect(result).not.toBeNull();
		});

		it('should return null when no redo available', () => {
			const workflow = createTestWorkflow();
			service.initialize(workflow);

			const result = service.redo();
			expect(result).toBeNull();
		});

		it('should disable redo after redo is exhausted', () => {
			const workflow = createTestWorkflow();
			service.initialize(workflow);
			service.push(workflow, { description: 'Change' });
			service.undo();
			service.redo();

			expect(service.canRedo()).toBe(false);
		});
	});

	describe('transactions', () => {
		it('should combine operations into single undo entry', () => {
			const workflow = createTestWorkflow();
			service.initialize(workflow);

			service.startTransaction(workflow, 'Delete node + edges');
			// Multiple operations during transaction don't add to history
			service.push(workflow, { description: 'Delete node' });
			service.push(workflow, { description: 'Delete edge 1' });
			service.push(workflow, { description: 'Delete edge 2' });
			service.commitTransaction();

			expect(service.getState().historyLength).toBe(2); // initial + 1 commit
		});

		it('should discard on cancelTransaction', () => {
			const workflow = createTestWorkflow();
			service.initialize(workflow);

			service.startTransaction(workflow, 'Cancelled');
			service.cancelTransaction();

			expect(service.getState().historyLength).toBe(1);
			expect(service.getState().isInTransaction).toBe(false);
		});

		it('should warn on nested startTransaction', () => {
			const workflow = createTestWorkflow();
			service.initialize(workflow);

			service.startTransaction(workflow, 'First');
			// Second startTransaction should be ignored
			service.startTransaction(workflow, 'Second');

			expect(service.getState().isInTransaction).toBe(true);
		});

		it('should warn on commitTransaction without active transaction', () => {
			const workflow = createTestWorkflow();
			service.initialize(workflow);

			// Should not throw
			service.commitTransaction();
			expect(service.getState().historyLength).toBe(1);
		});
	});

	describe('clear', () => {
		it('should reset all history', () => {
			const workflow = createTestWorkflow();
			service.initialize(workflow);
			service.push(workflow, { description: 'Change' });

			service.clear();

			expect(service.getState().historyLength).toBe(0);
			expect(service.canUndo()).toBe(false);
			expect(service.canRedo()).toBe(false);
		});

		it('should keep current state as initial when provided', () => {
			const workflow = createTestWorkflow({ name: 'Current' });
			service.clear(workflow);

			expect(service.getState().historyLength).toBe(1);
			expect(service.canUndo()).toBe(false);
		});
	});

	describe('subscribe', () => {
		it('should immediately call callback with current state', () => {
			const callback = vi.fn();
			const workflow = createTestWorkflow();
			service.initialize(workflow);

			service.subscribe(callback);

			expect(callback).toHaveBeenCalledTimes(1);
			expect(callback).toHaveBeenCalledWith(
				expect.objectContaining({ canUndo: false, canRedo: false })
			);
		});

		it('should notify on state changes', () => {
			const callback = vi.fn();
			const workflow = createTestWorkflow();
			service.initialize(workflow);
			service.subscribe(callback);

			service.push(workflow, { description: 'Change' });

			// 1 for subscribe + 1 for push (notifyChange in initialize already happened before subscribe)
			expect(callback).toHaveBeenCalledTimes(2);
		});

		it('should stop notifying after unsubscribe', () => {
			const callback = vi.fn();
			const workflow = createTestWorkflow();
			service.initialize(workflow);
			const unsubscribe = service.subscribe(callback);

			unsubscribe();
			service.push(workflow, { description: 'Change' });

			// Only the initial subscribe call
			expect(callback).toHaveBeenCalledTimes(1);
		});
	});

	describe('setMaxEntries', () => {
		it('should trim history when reduced', () => {
			const workflow = createTestWorkflow();
			service.initialize(workflow);

			for (let i = 0; i < 10; i++) {
				service.push(createTestWorkflow({ name: `State ${i}` }));
			}
			expect(service.getState().historyLength).toBeGreaterThan(3);

			service.setMaxEntries(3);
			// After trimming, undo stack should be at most 3
			expect(service.getState().currentIndex).toBeLessThanOrEqual(2);
		});
	});

	describe('deep cloning', () => {
		it('should not share references between history entries', () => {
			const workflow = createTestWorkflow({
				nodes: [createTestNode({ id: 'node-1' })]
			});
			service.initialize(workflow);

			// Mutate original
			workflow.nodes[0].position.x = 999;
			service.push(workflow);

			const undone = service.undo();
			expect(undone).not.toBeNull();
			// The undone state should have the original position, not mutated
			expect(undone!.nodes[0].position.x).not.toBe(999);
		});
	});
});
