/**
 * Tests for InterruptService
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InterruptService } from '$lib/services/interruptService.js';

// Mock dependencies
const mockGetEndpointConfig = vi.fn();
const mockBuildEndpointUrl = vi.fn();
const mockGetEndpointHeaders = vi.fn();

vi.mock('$lib/services/api.js', () => ({
	getEndpointConfig: () => mockGetEndpointConfig()
}));

vi.mock('$lib/config/endpoints.js', () => ({
	buildEndpointUrl: (...args: unknown[]) => mockBuildEndpointUrl(...args),
	getEndpointHeaders: (...args: unknown[]) => mockGetEndpointHeaders(...args)
}));

vi.mock('$lib/utils/logger.js', () => ({
	logger: {
		error: vi.fn(),
		warn: vi.fn(),
		info: vi.fn(),
		debug: vi.fn()
	}
}));

function createMockInterruptConfig() {
	return {
		baseUrl: '/api',
		endpoints: {
			interrupts: {
				get: '/interrupts/{interruptId}',
				resolve: '/interrupts/{interruptId}/resolve',
				cancel: '/interrupts/{interruptId}/cancel',
				listBySession: '/sessions/{sessionId}/interrupts',
				listByPipeline: '/pipelines/{pipelineId}/interrupts'
			}
		}
	};
}

describe('InterruptService', () => {
	let service: InterruptService;
	const originalFetch = global.fetch;

	beforeEach(() => {
		// Reset singleton by accessing private static field
		// @ts-expect-error Accessing private static for test reset
		InterruptService.instance = undefined;
		service = InterruptService.getInstance();

		global.fetch = vi.fn();
		mockGetEndpointConfig.mockReturnValue(createMockInterruptConfig());
		mockBuildEndpointUrl.mockImplementation((_config: unknown, path: string, params?: Record<string, string>) => {
			let url = `/api${path}`;
			if (params) {
				for (const [key, value] of Object.entries(params)) {
					url = url.replace(`{${key}}`, value);
				}
			}
			return url;
		});
		mockGetEndpointHeaders.mockReturnValue({ 'Content-Type': 'application/json' });
	});

	afterEach(() => {
		service.stopPolling();
		global.fetch = originalFetch;
	});

	describe('singleton', () => {
		it('should return the same instance', () => {
			const instance1 = InterruptService.getInstance();
			const instance2 = InterruptService.getInstance();
			expect(instance1).toBe(instance2);
		});
	});

	describe('polling config', () => {
		it('should set and get polling config', () => {
			service.setPollingConfig({ interval: 3000, enabled: true });
			const config = service.getPollingConfig();
			expect(config.interval).toBe(3000);
			expect(config.enabled).toBe(true);
		});

		it('should merge partial config', () => {
			const original = service.getPollingConfig();
			service.setPollingConfig({ interval: 2000 });
			const updated = service.getPollingConfig();
			expect(updated.interval).toBe(2000);
			expect(updated.maxBackoff).toBe(original.maxBackoff);
		});
	});

	describe('isConfigured', () => {
		it('should return true when interrupt endpoints exist', () => {
			expect(service.isConfigured()).toBe(true);
		});

		it('should return false when no interrupt endpoints', () => {
			mockGetEndpointConfig.mockReturnValue({ endpoints: {} });
			expect(service.isConfigured()).toBe(false);
		});

		it('should return false when no config', () => {
			mockGetEndpointConfig.mockReturnValue(null);
			expect(service.isConfigured()).toBe(false);
		});
	});

	describe('getInterrupt', () => {
		it('should fetch interrupt by ID', async () => {
			const mockInterrupt = { id: 'int-1', type: 'confirmation', status: 'pending' };
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: true,
				json: async () => ({ data: mockInterrupt })
			});

			const result = await service.getInterrupt('int-1');
			expect(result).toEqual(mockInterrupt);
			expect(global.fetch).toHaveBeenCalledWith(
				'/api/interrupts/int-1',
				expect.objectContaining({ headers: expect.any(Object) })
			);
		});

		it('should throw when interrupt not found', async () => {
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: true,
				json: async () => ({ data: null })
			});

			await expect(service.getInterrupt('nonexistent')).rejects.toThrow('Interrupt not found');
		});

		it('should throw on HTTP error', async () => {
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: false,
				status: 500,
				statusText: 'Internal Server Error',
				json: async () => ({ error: 'Server error' })
			});

			await expect(service.getInterrupt('int-1')).rejects.toThrow('Server error');
		});
	});

	describe('resolveInterrupt', () => {
		it('should POST resolution value', async () => {
			const mockInterrupt = { id: 'int-1', type: 'confirmation', status: 'resolved' };
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: true,
				json: async () => ({ data: mockInterrupt })
			});

			const result = await service.resolveInterrupt('int-1', true);
			expect(result).toEqual(mockInterrupt);

			const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
			expect(fetchCall[0]).toBe('/api/interrupts/int-1/resolve');
			expect(fetchCall[1].method).toBe('POST');
			expect(JSON.parse(fetchCall[1].body)).toEqual({ value: true });
		});

		it('should throw when no data returned', async () => {
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: true,
				json: async () => ({ data: null })
			});

			await expect(service.resolveInterrupt('int-1', true)).rejects.toThrow(
				'Failed to resolve interrupt'
			);
		});
	});

	describe('cancelInterrupt', () => {
		it('should POST cancellation', async () => {
			const mockInterrupt = { id: 'int-1', type: 'confirmation', status: 'cancelled' };
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: true,
				json: async () => ({ data: mockInterrupt })
			});

			const result = await service.cancelInterrupt('int-1');
			expect(result).toEqual(mockInterrupt);

			const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
			expect(fetchCall[0]).toBe('/api/interrupts/int-1/cancel');
			expect(fetchCall[1].method).toBe('POST');
		});
	});

	describe('listSessionInterrupts', () => {
		it('should fetch interrupts for session', async () => {
			const mockInterrupts = [
				{ id: 'int-1', status: 'pending' },
				{ id: 'int-2', status: 'resolved' }
			];
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: true,
				json: async () => ({ data: mockInterrupts })
			});

			const result = await service.listSessionInterrupts('session-1');
			expect(result).toEqual(mockInterrupts);
			expect(global.fetch).toHaveBeenCalledWith(
				'/api/sessions/session-1/interrupts',
				expect.any(Object)
			);
		});

		it('should return empty array when no data', async () => {
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: true,
				json: async () => ({ data: null })
			});

			const result = await service.listSessionInterrupts('session-1');
			expect(result).toEqual([]);
		});
	});

	describe('listPipelineInterrupts', () => {
		it('should fetch interrupts for pipeline', async () => {
			const mockInterrupts = [{ id: 'int-1', status: 'pending' }];
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: true,
				json: async () => ({ data: mockInterrupts })
			});

			const result = await service.listPipelineInterrupts('pipeline-1');
			expect(result).toEqual(mockInterrupts);
		});
	});

	describe('polling', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			service.stopPolling();
			vi.useRealTimers();
		});

		it('should not start when polling is disabled', () => {
			service.setPollingConfig({ enabled: false });
			const callback = vi.fn();

			service.startPolling('session-1', callback);
			expect(service.isPolling()).toBe(false);
		});

		it('should track polling session ID', () => {
			service.setPollingConfig({ enabled: true, interval: 1000 });
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: true,
				json: async () => ({ data: [] })
			});

			service.startPolling('session-1', vi.fn());
			expect(service.isPolling()).toBe(true);
			expect(service.getPollingSessionId()).toBe('session-1');
		});

		it('should stop polling', () => {
			service.setPollingConfig({ enabled: true, interval: 1000 });
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: true,
				json: async () => ({ data: [] })
			});

			service.startPolling('session-1', vi.fn());
			service.stopPolling();

			expect(service.isPolling()).toBe(false);
			expect(service.getPollingSessionId()).toBeNull();
		});
	});
});
