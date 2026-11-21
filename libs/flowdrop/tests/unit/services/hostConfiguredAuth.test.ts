/**
 * Requests built from the host's own EndpointConfig always carry the
 * AuthProvider's headers, on any origin the host chose. Backend-supplied URLs
 * keep the origin rule (covered next to each service's own tests).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PipelineSignalService } from '$lib/services/pipelineSignalService.js';
import { cancelRun } from '$lib/services/runsService.js';
import { fetchDynamicSchema } from '$lib/services/dynamicSchemaService.js';
import { fetchVariableSchema, clearVariableCache } from '$lib/services/apiVariableService.js';
import { createEndpointConfig, type EndpointConfig } from '$lib/config/endpoints.js';
import type { AuthProvider } from '$lib/types/auth.js';
import type { WorkflowNode } from '$lib/types/index.js';

const base = createEndpointConfig('https://api.example.com/v1');
const withEndpoints = (endpoints: Record<string, unknown>): EndpointConfig =>
  ({ ...base, endpoints: { ...base.endpoints, ...endpoints } }) as EndpointConfig;

describe('host-configured request URLs', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const authProvider = (): AuthProvider => ({
    getAuthHeaders: async () => ({ Authorization: 'Bearer tok' }),
    onUnauthorized: vi.fn().mockResolvedValue(false)
  });
  const sent = (call = 0) => fetchMock.mock.calls[call][1].headers as Record<string, string>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(new Response('{"success":true,"data":{}}'));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('location', {
      href: 'https://app.example.com/editor',
      origin: 'https://app.example.com'
    });
    clearVariableCache();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('sends the headers for signals on another origin than the page and the API base', async () => {
    const config = withEndpoints({
      signals: {
        baseUrl: 'https://signals.example.net/ops',
        pause: '/pipelines/{pipelineId}/pause',
        resume: '/pipelines/{pipelineId}/resume',
        cancel: '/pipelines/{pipelineId}/cancel'
      }
    });
    await new PipelineSignalService().pause(config, 'p1', {}, authProvider());
    expect(fetchMock.mock.calls[0][0]).toBe('https://signals.example.net/ops/pipelines/p1/pause');
    expect(sent().Authorization).toBe('Bearer tok');
  });

  it('calls onUnauthorized for a 401 on such a signals request', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 401 }));
    const provider = authProvider();
    const config = withEndpoints({
      signals: {
        baseUrl: 'https://signals.example.net/ops',
        pause: '/p/{pipelineId}/pause',
        resume: '/p/{pipelineId}/resume',
        cancel: '/p/{pipelineId}/cancel'
      }
    });
    await new PipelineSignalService().pause(config, 'p1', {}, provider);
    expect(provider.onUnauthorized).toHaveBeenCalledOnce();
  });

  it('sends the headers for an absolute endpoint template on another origin', async () => {
    const config = withEndpoints({
      pipelines: {
        ...base.endpoints.pipelines,
        cancel: 'https://runs.example.org/pipelines/{id}/cancel'
      }
    });
    await cancelRun(config, 'p9', authProvider());
    expect(fetchMock.mock.calls[0][0]).toBe('https://runs.example.org/pipelines/p9/cancel');
    expect(sent().Authorization).toBe('Bearer tok');
  });

  it('still sends no headers to a backend-supplied dynamic schema URL on another origin', async () => {
    const config = createEndpointConfig('https://api.example.com/v1');
    const node = { id: 'n1', type: 'x', data: { config: {} } } as unknown as WorkflowNode;
    await fetchDynamicSchema(
      config,
      { url: 'https://elsewhere.example/schema' },
      node,
      'wf',
      authProvider()
    );
    expect(sent().Authorization).toBeUndefined();
  });

  it('still sends no headers to a backend-supplied API variable URL on another origin', async () => {
    const config = createEndpointConfig('https://api.example.com/v1');
    await fetchVariableSchema(
      config,
      'wf',
      'n1',
      { endpoint: { url: 'https://elsewhere.example/vars' } },
      authProvider()
    );
    expect(sent().Authorization).toBeUndefined();
  });
});
