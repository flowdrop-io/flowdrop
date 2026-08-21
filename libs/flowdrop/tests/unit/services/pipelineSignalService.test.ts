/**
 * Tests for PipelineSignalService
 *
 * The whole value of this service is `classifyRefusal`: every refusal it
 * returns drives a different, user-visible explanation, and until now nothing
 * asserted the mapping at all. That mattered most for the three 409s, which
 * share one status code — the classification used to depend on matching
 * substrings of the server's prose, so a backend reword could silently show an
 * operator the wrong explanation with nothing erroring anywhere.
 *
 * These tests pin both paths deliberately: the `error_code` path that replaces
 * the guessing, and the substring path that must keep working for backends
 * predating the codes.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PipelineSignalService } from '$lib/services/pipelineSignalService.js';
import type { EndpointConfig } from '$lib/config/endpoints.js';

const mockBuildEndpointUrl = vi.fn();

vi.mock('$lib/config/endpoints.js', () => ({
  buildEndpointUrl: (...args: unknown[]) => mockBuildEndpointUrl(...args)
}));

vi.mock('$lib/utils/logger.js', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }
}));

vi.mock('$lib/utils/fetchWithAuth.js', () => ({
  authenticatedFetch: (url: string, init?: RequestInit) => fetch(url, init)
}));

function signalConfig() {
  return {
    baseUrl: '/api',
    endpoints: {
      signals: {
        baseUrl: '/api',
        pause: '/pipelines/{pipelineId}/pause',
        resume: '/pipelines/{pipelineId}/resume',
        cancel: '/pipelines/{pipelineId}/cancel'
      }
    }
  } as unknown as EndpointConfig;
}

/** A refusal response with the given status and JSON body. */
function refusal(status: number, body: Record<string, unknown>): Response {
  return {
    ok: false,
    status,
    statusText: 'Conflict',
    json: async () => body
  } as unknown as Response;
}

describe('PipelineSignalService', () => {
  let service: PipelineSignalService;
  let config: EndpointConfig;
  const originalFetch = global.fetch;

  beforeEach(() => {
    service = new PipelineSignalService();
    config = signalConfig();
    global.fetch = vi.fn();
    mockBuildEndpointUrl.mockImplementation(
      (_config: unknown, path: string, params?: Record<string, string>) => {
        let url = `/api${path}`;
        for (const [key, value] of Object.entries(params ?? {})) {
          url = url.replace(`{${key}}`, value);
        }
        return url;
      }
    );
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('isSupported', () => {
    it('is false for a backend with no signal plane, which is a supported setup', () => {
      expect(service.isSupported(null)).toBe(false);
      expect(service.isSupported({ endpoints: {} } as unknown as EndpointConfig)).toBe(false);
      expect(service.isSupported(config)).toBe(true);
    });
  });

  describe('accepted', () => {
    it('reports accepted, never applied — the backend observes signals cooperatively', async () => {
      vi.mocked(global.fetch).mockResolvedValue({ ok: true, status: 202 } as Response);

      const result = await service.pause(config, 'pipeline-1');

      expect(result).toEqual({ status: 'accepted', signal: 'pause', pipelineId: 'pipeline-1' });
    });
  });

  describe('classification by error_code', () => {
    // The point of the codes: the message is deliberately unhelpful in each
    // case, so a passing assertion here can only come from the code.
    const cases: Array<[string, string]> = [
      ['PIPELINE_TERMINAL', 'terminal'],
      ['INWARD_SIGNAL_ALREADY_PENDING', 'duplicate'],
      ['NO_ACTIVE_PAUSE', 'not-paused']
    ];

    it.each(cases)('maps %s without reading the message', async (code, reason) => {
      vi.mocked(global.fetch).mockResolvedValue(
        refusal(409, { success: false, error: 'Request could not be completed.', error_code: code })
      );

      const result = await service.cancel(config, 'pipeline-1');

      expect(result).toEqual({
        status: 'refused',
        reason,
        message: 'Request could not be completed.'
      });
    });

    it('does not guess from prose when the code is one it does not model', async () => {
      // A code it cannot map still proves the backend classified deliberately,
      // so falling back to substrings would override a considered answer with a
      // guess — note the message would otherwise classify as `terminal`.
      vi.mocked(global.fetch).mockResolvedValue(
        refusal(409, {
          error: 'Pipeline is in a terminal state (completed); cannot signal.',
          error_code: 'SOME_FUTURE_REFUSAL'
        })
      );

      const result = await service.cancel(config, 'pipeline-1');

      expect(result).toMatchObject({ status: 'refused', reason: 'rejected' });
    });
  });

  describe('classification by substring (backends predating the codes)', () => {
    const cases: Array<[string, string]> = [
      ['Pipeline is in a terminal state (completed); cannot signal.', 'terminal'],
      ['An inward signal is already pending for this pipeline', 'duplicate'],
      ['No active pause signal for this pipeline', 'not-paused'],
      ['Refused for reasons of its own', 'rejected']
    ];

    it.each(cases)('maps %j when no code is published', async (error, reason) => {
      vi.mocked(global.fetch).mockResolvedValue(refusal(409, { success: false, error }));

      const result = await service.cancel(config, 'pipeline-1');

      expect(result).toMatchObject({ status: 'refused', reason });
    });

    it('ignores a non-string error_code rather than trusting it', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        refusal(409, { error: 'No active pause signal for this pipeline', error_code: 42 })
      );

      const result = await service.resume(config, 'pipeline-1');

      expect(result).toMatchObject({ status: 'refused', reason: 'not-paused' });
    });
  });

  describe('classification by status', () => {
    it('reads absence and denial from the status, ahead of any code', async () => {
      vi.mocked(global.fetch).mockResolvedValue(refusal(404, { error: 'Pipeline not found' }));
      await expect(service.cancel(config, 'gone')).resolves.toMatchObject({ reason: 'not-found' });

      vi.mocked(global.fetch).mockResolvedValue(refusal(403, { error: 'Access denied' }));
      await expect(service.cancel(config, 'theirs')).resolves.toMatchObject({
        reason: 'forbidden'
      });
    });

    it('falls back to a synthesized message when the body carries none', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => {
          throw new Error('not json');
        }
      } as unknown as Response);

      const result = await service.cancel(config, 'pipeline-1');

      expect(result).toEqual({
        status: 'refused',
        reason: 'rejected',
        message: 'HTTP 500: Internal Server Error'
      });
    });
  });

  describe('unsupported', () => {
    it('answers unsupported rather than throwing when there is no signal plane', async () => {
      const result = await service.pause(null, 'pipeline-1');

      expect(result).toEqual({ status: 'unsupported' });
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
