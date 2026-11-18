/**
 * EnhancedFlowDropApiClient sends its requests through authenticatedFetch:
 * one header order, one origin rule, a timeout per attempt.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EnhancedFlowDropApiClient } from '$lib/api/enhanced-client.js';
import { createEndpointConfig } from '$lib/config/endpoints.js';
import type { AuthProvider } from '$lib/types/auth.js';

const okNodes = () =>
  new Response(JSON.stringify({ success: true, data: [] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });

describe('EnhancedFlowDropApiClient request path', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn(async () => okNodes());
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  const sent = (i = 0) => fetchMock.mock.calls[i][1] as RequestInit;
  const provider: AuthProvider = {
    getAuthHeaders: async () => ({ Authorization: 'Bearer provider' })
  };

  it('lets headers configured for the endpoint win over the provider, ignoring case', async () => {
    const config = createEndpointConfig('/api/flowdrop', {
      headers: { 'nodes.list': { authorization: 'Bearer endpoint' } }
    });
    await new EnhancedFlowDropApiClient(config, provider).getAvailableNodes();
    const headers = sent().headers as Record<string, string>;
    expect(Object.keys(headers).filter((k) => k.toLowerCase() === 'authorization')).toHaveLength(1);
    expect(Object.values(headers)).toContain('Bearer endpoint');
  });

  it('sends the provider headers under an absolute API base on another origin than the page', async () => {
    const config = createEndpointConfig('https://api.example.com/v1');
    await new EnhancedFlowDropApiClient(config, provider).getAvailableNodes();
    expect((sent().headers as Record<string, string>).Authorization).toBe('Bearer provider');
  });

  it('gives every attempt its own timeout signal', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('network')).mockResolvedValueOnce(okNodes());
    const config = createEndpointConfig('/api/flowdrop', {
      retry: { enabled: true, maxAttempts: 2, delay: 0, backoff: 'fixed' }
    } as never);
    await new EnhancedFlowDropApiClient(config).getAvailableNodes();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sent(0).signal).not.toBe(sent(1).signal);
  });

  it('reports a timeout as an ApiError', async () => {
    fetchMock.mockRejectedValue(new DOMException('t', 'TimeoutError'));
    await expect(
      new EnhancedFlowDropApiClient(createEndpointConfig('/api/flowdrop')).getAvailableNodes()
    ).rejects.toMatchObject({ message: expect.stringContaining('timeout') });
  });
});
