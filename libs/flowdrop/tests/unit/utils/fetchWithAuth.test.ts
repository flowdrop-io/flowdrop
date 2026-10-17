/**
 * Tests for authenticatedFetch — the single fetch path that merges auth headers
 * and applies the 401/403 lifecycle consistently across all services.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { authenticatedFetch } from '$lib/utils/fetchWithAuth.js';
import { createEndpointConfig } from '$lib/config/endpoints.js';
import type { AuthProvider } from '$lib/types/auth.js';

describe('authenticatedFetch', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const ok = () => new Response('{}', { status: 200 });
  const unauthorized = () => new Response('{}', { status: 401 });
  const forbidden = () => new Response('{}', { status: 403 });

  /** Headers passed to fetch on the Nth call (0-based). */
  const headersOf = (call = 0) => fetchMock.mock.calls[call][1].headers as Record<string, string>;

  it('merges static endpoint headers with auth headers when config is given', async () => {
    fetchMock.mockResolvedValue(ok());
    const config = createEndpointConfig('https://api.example.com', {
      headers: { playground: { 'X-Endpoint': 'yes' } }
    });
    const authProvider: AuthProvider = {
      getAuthHeaders: async () => ({ Authorization: 'Bearer t1' })
    };

    await authenticatedFetch(
      'https://api.example.com/p',
      {},
      {
        config,
        endpointKey: 'playground',
        authProvider
      }
    );

    expect(headersOf()).toMatchObject({
      'Content-Type': 'application/json',
      'X-Endpoint': 'yes',
      Authorization: 'Bearer t1'
    });
  });

  it('lets per-request headers override auth and endpoint headers', async () => {
    fetchMock.mockResolvedValue(ok());
    const authProvider: AuthProvider = {
      getAuthHeaders: async () => ({ Authorization: 'Bearer t1' })
    };

    await authenticatedFetch(
      'https://api.example.com/p',
      { headers: { Authorization: 'Bearer override' } },
      { authProvider }
    );

    expect(headersOf().Authorization).toBe('Bearer override');
  });

  it('refreshes and retries once with fresh headers on 401', async () => {
    fetchMock.mockResolvedValueOnce(unauthorized()).mockResolvedValueOnce(ok());
    const getAuthHeaders = vi
      .fn<[], Promise<Record<string, string>>>()
      .mockResolvedValueOnce({ Authorization: 'Bearer stale' })
      .mockResolvedValueOnce({ Authorization: 'Bearer fresh' });
    const onUnauthorized = vi.fn().mockResolvedValue(true);

    const response = await authenticatedFetch(
      'https://api.example.com/p',
      {},
      { authProvider: { getAuthHeaders, onUnauthorized } }
    );

    expect(onUnauthorized).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(headersOf(0).Authorization).toBe('Bearer stale');
    expect(headersOf(1).Authorization).toBe('Bearer fresh');
    expect(response.status).toBe(200);
  });

  it('shares one onUnauthorized call between concurrent 401s', async () => {
    fetchMock.mockImplementation(async (_url, init: RequestInit) =>
      (init.headers as Record<string, string>).Authorization === 'Bearer fresh'
        ? ok()
        : unauthorized()
    );
    let token = 'stale';
    let finishRefresh!: (refreshed: boolean) => void;
    const onUnauthorized = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          finishRefresh = (refreshed) => {
            token = 'fresh';
            resolve(refreshed);
          };
        })
    );
    const authProvider: AuthProvider = {
      getAuthHeaders: async () => ({ Authorization: `Bearer ${token}` }),
      onUnauthorized
    };

    const requests = [1, 2, 3].map((n) =>
      authenticatedFetch(`https://api.example.com/${n}`, {}, { authProvider })
    );
    await vi.waitFor(() => expect(onUnauthorized).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    finishRefresh(true);
    const responses = await Promise.all(requests);

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(responses.map((r) => r.status)).toEqual([200, 200, 200]);

    // Once settled, the next 401 asks the provider again.
    token = 'stale';
    const again = authenticatedFetch('https://api.example.com/4', {}, { authProvider });
    await vi.waitFor(() => expect(onUnauthorized).toHaveBeenCalledTimes(2));
    finishRefresh(true);
    await again;
  });

  it('does not retry on 401 when onUnauthorized reports no refresh', async () => {
    fetchMock.mockResolvedValue(unauthorized());
    const onUnauthorized = vi.fn().mockResolvedValue(false);

    const response = await authenticatedFetch(
      'https://api.example.com/p',
      {},
      { authProvider: { getAuthHeaders: async () => ({}), onUnauthorized } }
    );

    expect(onUnauthorized).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(401);
  });

  it('does not retry on 401 when the provider has no onUnauthorized hook', async () => {
    fetchMock.mockResolvedValue(unauthorized());

    const response = await authenticatedFetch(
      'https://api.example.com/p',
      {},
      { authProvider: { getAuthHeaders: async () => ({}) } }
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(401);
  });

  it('invokes onForbidden on 403 without retrying', async () => {
    fetchMock.mockResolvedValue(forbidden());
    const onForbidden = vi.fn().mockResolvedValue(undefined);

    const response = await authenticatedFetch(
      'https://api.example.com/p',
      {},
      { authProvider: { getAuthHeaders: async () => ({}), onForbidden } }
    );

    expect(onForbidden).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(403);
  });

  it('works without any auth provider (default JSON headers)', async () => {
    fetchMock.mockResolvedValue(ok());

    await authenticatedFetch('https://api.example.com/p');

    expect(headersOf()).toEqual({
      Accept: 'application/json',
      'Content-Type': 'application/json'
    });
  });
});
