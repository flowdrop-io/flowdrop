/**
 * Tests for Auto-Save Service
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initAutoSave, AutoSaveManager } from '$lib/services/autoSaveService.js';

// Mock dependencies
const mockGetBehaviorSettings = vi.fn();
const mockIsDirty = vi.fn();
const mockOnSettingsChange = vi.fn();

vi.mock('$lib/stores/settingsStore.svelte.js', () => ({
	getBehaviorSettings: (...args: unknown[]) => mockGetBehaviorSettings(...args),
	onSettingsChange: (...args: unknown[]) => mockOnSettingsChange(...args)
}));

vi.mock('$lib/stores/workflowStore.svelte.js', () => ({
	isDirty: () => mockIsDirty()
}));

vi.mock('$lib/utils/logger.js', () => ({
	logger: {
		error: vi.fn(),
		warn: vi.fn(),
		info: vi.fn(),
		debug: vi.fn()
	}
}));

describe('initAutoSave', () => {
	let settingsChangeCallback: ((event: { category: string }) => void) | null = null;

	beforeEach(() => {
		vi.useFakeTimers();
		settingsChangeCallback = null;

		mockGetBehaviorSettings.mockReturnValue({
			autoSave: true,
			autoSaveInterval: 5000
		});
		mockIsDirty.mockReturnValue(false);
		mockOnSettingsChange.mockImplementation((cb: (event: { category: string }) => void) => {
			settingsChangeCallback = cb;
			return () => {
				settingsChangeCallback = null;
			};
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should return a cleanup function', () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		const cleanup = initAutoSave({ onSave });

		expect(typeof cleanup).toBe('function');
		cleanup();
	});

	it('should call onSave when dirty and interval fires', async () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		mockIsDirty.mockReturnValue(true);

		const cleanup = initAutoSave({ onSave });

		// Advance past the auto-save interval
		await vi.advanceTimersByTimeAsync(5000);

		expect(onSave).toHaveBeenCalledTimes(1);
		cleanup();
	});

	it('should NOT call onSave when not dirty', async () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		mockIsDirty.mockReturnValue(false);

		const cleanup = initAutoSave({ onSave });

		await vi.advanceTimersByTimeAsync(5000);

		expect(onSave).not.toHaveBeenCalled();
		cleanup();
	});

	it('should call onSuccess after successful save', async () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		const onSuccess = vi.fn();
		mockIsDirty.mockReturnValue(true);

		const cleanup = initAutoSave({ onSave, onSuccess });
		await vi.advanceTimersByTimeAsync(5000);

		expect(onSuccess).toHaveBeenCalledTimes(1);
		cleanup();
	});

	it('should call onError when save fails', async () => {
		const onSave = vi.fn().mockRejectedValue(new Error('Save failed'));
		const onError = vi.fn();
		mockIsDirty.mockReturnValue(true);

		const cleanup = initAutoSave({ onSave, onError });
		await vi.advanceTimersByTimeAsync(5000);

		expect(onError).toHaveBeenCalledTimes(1);
		expect(onError).toHaveBeenCalledWith(expect.any(Error));
		cleanup();
	});

	it('should not start interval when autoSave is disabled', async () => {
		mockGetBehaviorSettings.mockReturnValue({
			autoSave: false,
			autoSaveInterval: 5000
		});

		const onSave = vi.fn().mockResolvedValue(undefined);
		mockIsDirty.mockReturnValue(true);

		const cleanup = initAutoSave({ onSave });
		await vi.advanceTimersByTimeAsync(10000);

		expect(onSave).not.toHaveBeenCalled();
		cleanup();
	});

	it('should update interval when behavior settings change', async () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		mockIsDirty.mockReturnValue(true);

		const cleanup = initAutoSave({ onSave });

		// Change settings to faster interval
		mockGetBehaviorSettings.mockReturnValue({
			autoSave: true,
			autoSaveInterval: 1000
		});
		settingsChangeCallback?.({ category: 'behavior' });

		await vi.advanceTimersByTimeAsync(1000);
		expect(onSave).toHaveBeenCalled();
		cleanup();
	});

	it('should clean up interval and unsubscribe on cleanup', () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		const cleanup = initAutoSave({ onSave });

		cleanup();

		// Settings change after cleanup should not cause errors
		settingsChangeCallback?.({ category: 'behavior' });
	});
});

describe('AutoSaveManager', () => {
	beforeEach(() => {
		vi.useFakeTimers();

		mockGetBehaviorSettings.mockReturnValue({
			autoSave: true,
			autoSaveInterval: 5000
		});
		mockIsDirty.mockReturnValue(false);
		mockOnSettingsChange.mockImplementation(() => () => {});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should start and stop', () => {
		const manager = new AutoSaveManager({
			onSave: vi.fn().mockResolvedValue(undefined)
		});

		manager.start();
		expect(manager.isRunning()).toBe(true);

		manager.stop();
		expect(manager.isRunning()).toBe(false);
	});

	it('should not start twice', () => {
		const manager = new AutoSaveManager({
			onSave: vi.fn().mockResolvedValue(undefined)
		});

		manager.start();
		manager.start(); // Should be no-op
		expect(manager.isRunning()).toBe(true);

		manager.stop();
	});

	it('should report isEnabled based on settings', () => {
		const manager = new AutoSaveManager({
			onSave: vi.fn().mockResolvedValue(undefined)
		});

		mockGetBehaviorSettings.mockReturnValue({ autoSave: true, autoSaveInterval: 5000 });
		expect(manager.isEnabled()).toBe(true);

		mockGetBehaviorSettings.mockReturnValue({ autoSave: false, autoSaveInterval: 5000 });
		expect(manager.isEnabled()).toBe(false);
	});

	it('saveNow should trigger save when dirty', async () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		mockIsDirty.mockReturnValue(true);

		const manager = new AutoSaveManager({ onSave });
		await manager.saveNow();

		expect(onSave).toHaveBeenCalledTimes(1);
	});

	it('saveNow should skip when not dirty', async () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		mockIsDirty.mockReturnValue(false);

		const manager = new AutoSaveManager({ onSave });
		await manager.saveNow();

		expect(onSave).not.toHaveBeenCalled();
	});
});
