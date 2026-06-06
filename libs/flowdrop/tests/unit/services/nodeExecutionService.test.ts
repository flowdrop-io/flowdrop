/**
 * Tests for NodeExecutionService
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NodeExecutionService } from '$lib/services/nodeExecutionService.js';

// Mock dependencies
const mockGetEndpointConfig = vi.fn();
const mockBuildEndpointUrl = vi.fn();

vi.mock('$lib/services/api.js', () => ({
  getEndpointConfig: () => mockGetEndpointConfig()
}));

vi.mock('$lib/config/endpoints.js', () => ({
  buildEndpointUrl: (...args: unknown[]) => mockBuildEndpointUrl(...args)
}));

vi.mock('$lib/config/constants.js', () => ({
  NODE_EXECUTION_CACHE_TIMEOUT_MS: 30000,
  PIPELINE_API_UNAVAILABLE_DURATION_MS: 300000
}));

vi.mock('$lib/utils/logger.js', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  }
}));

function createMockPipelineConfig() {
  return {
    baseUrl: '/api',
    endpoints: {
      pipelines: {
        get: '/pipelines/{id}'
      }
    }
  };
}

describe('NodeExecutionService', () => {
  let service: NodeExecutionService;
  const originalFetch = global.fetch;

  beforeEach(() => {
    // @ts-expect-error Accessing private static for test reset
    NodeExecutionService.instance = undefined;
    service = NodeExecutionService.getInstance();

    global.fetch = vi.fn();
    mockGetEndpointConfig.mockReturnValue(createMockPipelineConfig());
    mockBuildEndpointUrl.mockImplementation(
      (_config: unknown, path: string, params?: Record<string, string>) => {
        let url = `/api${path}`;
        if (params) {
          for (const [key, value] of Object.entries(params)) {
            url = url.replace(`{${key}}`, value);
          }
        }
        return url;
      }
    );
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('singleton', () => {
    it('should return the same instance', () => {
      const instance1 = NodeExecutionService.getInstance();
      const instance2 = NodeExecutionService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getNodeExecutionInfo', () => {
    it('should return null without pipelineId', async () => {
      const result = await service.getNodeExecutionInfo('node-1');
      expect(result).toBeNull();
    });

    it('should fetch and map node_statuses data', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          jobs: [
            {
              node_id: 'node-1',
              status: 'completed',
              started: '2026-06-06T13:05:47+02:00',
              completed: '2026-06-06T13:05:49+02:00'
            }
          ],
          node_statuses: {
            'node-1': {
              status: 'completed',
              executions: 3,
              execution_time: 1500,
              status_counts: { completed: 3 }
            }
          }
        })
      });

      const result = await service.getNodeExecutionInfo('node-1', 'pipeline-1');
      expect(result).not.toBeNull();
      expect(result!.status).toBe('completed');
      expect(result!.executionCount).toBe(3);
      expect(result!.isExecuting).toBe(false);
      expect(result!.jobs).toHaveLength(1);
    });

    it('should fall back to jobs when node_statuses entry is missing', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          jobs: [
            {
              node_id: 'node-1',
              status: 'completed',
              started: '2026-06-06T13:05:47+02:00',
              execution_time: 1500
            }
          ],
          node_statuses: {}
        })
      });

      const result = await service.getNodeExecutionInfo('node-1', 'pipeline-1');
      expect(result).not.toBeNull();
      expect(result!.status).toBe('completed');
      expect(result!.executionCount).toBe(1);
    });

    it('should return idle status when node not in jobs', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          jobs: [],
          node_statuses: {}
        })
      });

      const result = await service.getNodeExecutionInfo('node-1', 'pipeline-1');
      expect(result).not.toBeNull();
      expect(result!.status).toBe('idle');
    });

    it('should return null on fetch error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500
      });

      const result = await service.getNodeExecutionInfo('node-1', 'pipeline-1');
      expect(result).toBeNull();
    });
  });

  describe('getMultipleNodeExecutionInfo', () => {
    it('should return empty object without pipelineId', async () => {
      const result = await service.getMultipleNodeExecutionInfo(['node-1', 'node-2']);
      expect(result).toEqual({});
    });

    it('should fetch and map multiple nodes', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          jobs: [
            { node_id: 'node-1', status: 'completed', started: '2026-06-06T13:05:47+02:00' },
            { node_id: 'node-2', status: 'running', started: '2026-06-06T13:05:48+02:00' }
          ],
          node_statuses: {
            'node-1': { status: 'completed', executions: 2 },
            'node-2': { status: 'running', executions: 1 }
          }
        })
      });

      const result = await service.getMultipleNodeExecutionInfo(
        ['node-1', 'node-2', 'node-3'],
        'pipeline-1'
      );

      expect(result['node-1'].status).toBe('completed');
      expect(result['node-1'].executionCount).toBe(2);
      expect(result['node-2'].status).toBe('running');
      expect(result['node-2'].isExecuting).toBe(true);
      expect(result['node-3'].status).toBe('idle'); // Default for missing
    });

    it('should preserve skipped status (regression: canvas overlay used to flicker to Completed)', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          jobs: [
            { node_id: 'node-1', status: 'skipped' },
            { node_id: 'node-2', status: 'completed', started: '2026-06-06T13:05:47+02:00' }
          ]
        })
      });

      const result = await service.getMultipleNodeExecutionInfo(['node-1', 'node-2'], 'pipeline-1');

      expect(result['node-1'].status).toBe('skipped');
      expect(result['node-2'].status).toBe('completed');
    });

    it('should surface loop iterations as per-job history (latest status + executions count)', async () => {
      // Loop scenario: node-1 ran twice, then the never-started
      // next-iteration job was swept to skipped when the loop exited.
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          jobs: [
            {
              id: '1996',
              label: 'Invoke tool #1',
              node_id: 'node-1',
              status: 'completed',
              started: '2026-06-06T13:05:49+02:00',
              completed: '2026-06-06T13:05:50+02:00'
            },
            { id: '2005', label: 'Invoke tool #2', node_id: 'node-1', status: 'skipped' }
          ],
          node_statuses: {
            'node-1': {
              status: 'skipped',
              executions: 1,
              status_counts: { completed: 1, skipped: 1 }
            }
          }
        })
      });

      const result = await service.getMultipleNodeExecutionInfo(['node-1'], 'pipeline-1');

      // Graph shows where the run ended up (latest job) ...
      expect(result['node-1'].status).toBe('skipped');
      // ... plus the multi-execution indicator ...
      expect(result['node-1'].executionCount).toBe(1);
      // ... and the per-iteration history for inspection.
      expect(result['node-1'].jobs).toHaveLength(2);
      expect(result['node-1'].jobs![0].label).toBe('Invoke tool #1');
      expect(result['node-1'].jobs![0].status).toBe('completed');
      expect(result['node-1'].jobs![0].executionTime).toBe(1000);
      expect(result['node-1'].jobs![1].status).toBe('skipped');
    });

    it('should mark API unavailable on 404', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 404
      });

      const result = await service.getMultipleNodeExecutionInfo(['node-1'], 'pipeline-1');
      expect(result['node-1'].status).toBe('idle');

      // Second call should return defaults without fetching
      (global.fetch as ReturnType<typeof vi.fn>).mockClear();
      const result2 = await service.getMultipleNodeExecutionInfo(['node-1'], 'pipeline-1');
      expect(result2['node-1'].status).toBe('idle');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return defaults on non-404 error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500
      });

      const result = await service.getMultipleNodeExecutionInfo(['node-1'], 'pipeline-1');
      expect(result['node-1'].status).toBe('idle');
    });
  });

  describe('cache', () => {
    it('should cache node execution info', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          jobs: [{ node_id: 'node-1', status: 'completed', started: '2026-06-06T13:05:47+02:00' }],
          node_statuses: { 'node-1': { status: 'completed', executions: 1 } }
        })
      });

      await service.getNodeExecutionInfo('node-1', 'pipeline-1');
      const cached = service.getCachedNodeExecutionInfo('node-1');
      expect(cached).not.toBeNull();
      expect(cached!.status).toBe('completed');
    });

    it('should return null for uncached nodes', () => {
      expect(service.getCachedNodeExecutionInfo('nonexistent')).toBeNull();
    });

    it('should clear single node cache', async () => {
      service.updateNodeExecutionInfo('node-1', { status: 'completed' });
      service.clearNodeCache('node-1');
      expect(service.getCachedNodeExecutionInfo('node-1')).toBeNull();
    });

    it('should clear all cache', () => {
      service.updateNodeExecutionInfo('node-1', { status: 'completed' });
      service.updateNodeExecutionInfo('node-2', { status: 'running' });
      service.clearAllCache();

      expect(service.getCachedNodeExecutionInfo('node-1')).toBeNull();
      expect(service.getCachedNodeExecutionInfo('node-2')).toBeNull();
    });
  });

  describe('updateNodeExecutionInfo', () => {
    it('should merge with existing cache entry', () => {
      service.updateNodeExecutionInfo('node-1', {
        status: 'running',
        executionCount: 1
      });
      service.updateNodeExecutionInfo('node-1', { status: 'completed' });

      const cached = service.getCachedNodeExecutionInfo('node-1');
      expect(cached!.status).toBe('completed');
      expect(cached!.executionCount).toBe(1);
    });

    it('should create entry with defaults when no existing cache', () => {
      service.updateNodeExecutionInfo('node-1', { status: 'running' });

      const cached = service.getCachedNodeExecutionInfo('node-1');
      expect(cached!.status).toBe('running');
      expect(cached!.executionCount).toBe(0);
      expect(cached!.isExecuting).toBe(false);
    });
  });

  describe('updateMultipleNodeExecutionInfo', () => {
    it('should update multiple nodes', () => {
      service.updateMultipleNodeExecutionInfo({
        'node-1': { status: 'completed' },
        'node-2': { status: 'failed' }
      });

      expect(service.getCachedNodeExecutionInfo('node-1')!.status).toBe('completed');
      expect(service.getCachedNodeExecutionInfo('node-2')!.status).toBe('failed');
    });
  });

  describe('resetApiAvailability', () => {
    it('should allow fetching after reset', async () => {
      // First mark API as unavailable via 404
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 404
      });
      await service.getMultipleNodeExecutionInfo(['node-1'], 'pipeline-1');

      // Reset
      service.resetApiAvailability();

      // Now it should try fetching again
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ jobs: [] })
      });
      await service.getMultipleNodeExecutionInfo(['node-1'], 'pipeline-1');
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('isCacheStale', () => {
    it('should report stale after clearing', () => {
      service.clearAllCache();
      expect(service.isCacheStale()).toBe(true);
    });
  });
});
