/**
 * Unit Tests - ApiContext
 *
 * The former module-level API singleton (setEndpointConfig/getEndpointConfig/
 * nodeApi/workflowApi) has been removed in 2.0. Each FlowDrop instance now owns
 * an {@link ApiContext}, which holds the endpoint config + auth provider and
 * lazily builds an EnhancedFlowDropApiClient. These tests cover that contract.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiContext } from '$lib/stores/apiContext.js';
import { EnhancedFlowDropApiClient } from '$lib/api/enhanced-client.js';
import { NoAuthProvider, StaticAuthProvider } from '$lib/types/auth.js';
import { createMockEndpointConfig, mockFetchResponse } from '../../utils/index.js';
import { mockApiResponses } from '../../fixtures/index.js';

describe('ApiContext', () => {
  let api: ApiContext;

  beforeEach(() => {
    vi.clearAllMocks();
    api = new ApiContext();
    global.fetch = vi.fn();
  });

  describe('configuration state', () => {
    it('starts unconfigured', () => {
      expect(api.isConfigured()).toBe(false);
      expect(api.config).toBeNull();
    });

    it('defaults to NoAuthProvider before configure()', () => {
      expect(api.authProvider).toBeInstanceOf(NoAuthProvider);
    });

    it('becomes configured after configure()', () => {
      api.configure(createMockEndpointConfig('/api/flowdrop'));
      expect(api.isConfigured()).toBe(true);
      expect(api.config?.baseUrl).toBe('/api/flowdrop');
    });

    it('stores the auth provider passed to configure()', () => {
      const authProvider = new StaticAuthProvider({ type: 'bearer', token: 'tok' });
      api.configure(createMockEndpointConfig(), authProvider);
      expect(api.authProvider).toBe(authProvider);
    });

    it('preserves an existing provider when reconfigured without one', () => {
      // Guards the playground mount path: the mount option configures the
      // provider, then a nested component re-runs configure(endpointConfig)
      // with no provider — which must NOT reset auth to NoAuthProvider.
      const authProvider = new StaticAuthProvider({ type: 'bearer', token: 'tok' });
      api.configure(createMockEndpointConfig(), authProvider);
      api.configure(createMockEndpointConfig('/other/api'));
      expect(api.authProvider).toBe(authProvider);
    });

    it('swaps the provider at runtime via setAuthProvider()', () => {
      const first = new StaticAuthProvider({ type: 'bearer', token: 'a' });
      const second = new StaticAuthProvider({ type: 'bearer', token: 'b' });
      api.configure(createMockEndpointConfig(), first);
      api.setAuthProvider(second);
      expect(api.authProvider).toBe(second);
    });

    it('propagates setAuthProvider() to the live client', () => {
      const first = new StaticAuthProvider({ type: 'bearer', token: 'a' });
      const second = new NoAuthProvider();
      api.configure(createMockEndpointConfig(), first);
      const client = api.client; // build + cache the client
      api.setAuthProvider(second);
      expect(client.getAuthProvider()).toBe(second);
    });
  });

  describe('client', () => {
    it('throws when accessed before configure()', () => {
      expect(() => api.client).toThrow('Endpoint configuration not set');
    });

    it('lazily creates an EnhancedFlowDropApiClient once configured', () => {
      api.configure(createMockEndpointConfig('/api/flowdrop'));
      const client = api.client;
      expect(client).toBeInstanceOf(EnhancedFlowDropApiClient);
      // Cached: same instance on repeat access.
      expect(api.client).toBe(client);
    });

    it('rebuilds the client when reconfigured', () => {
      api.configure(createMockEndpointConfig('/api/flowdrop'));
      const first = api.client;
      api.configure(createMockEndpointConfig('/other/api'));
      expect(api.client).not.toBe(first);
    });

    it('uses the configured auth provider for the client', () => {
      const authProvider = new StaticAuthProvider({ type: 'bearer', token: 'tok' });
      api.configure(createMockEndpointConfig(), authProvider);
      expect(api.client.getAuthProvider()).toBe(authProvider);
    });

    it('issues requests through the configured endpoints', async () => {
      const mockData = mockApiResponses.nodes.list;
      global.fetch = vi.fn(() => Promise.resolve(mockFetchResponse(mockData.data)));

      api.configure(createMockEndpointConfig('/api/flowdrop'));
      const nodes = await api.client.getAvailableNodes();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/flowdrop/nodes',
        expect.objectContaining({ method: 'GET' })
      );
      expect(nodes).toEqual(mockData.data);
    });
  });
});
