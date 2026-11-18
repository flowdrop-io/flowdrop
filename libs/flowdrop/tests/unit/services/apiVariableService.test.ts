/**
 * apiVariableService: which headers an API-variable request carries.
 * Precedence is defaults < AuthProvider < headers set on the endpoint, and the
 * provider's headers go only to the page's own origin or under the API base.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { fetchVariableSchema } from '$lib/services/apiVariableService.js';
import type { ApiVariablesConfig } from '$lib/types/index.js';
import type { EndpointConfig } from '$lib/config/endpoints.js';

const authProvider = {
  getAuthHeaders: async () => ({ Authorization: 'Bearer tok', 'X-Tenant': 'provider' })
};

const apiConfig = { baseUrl: 'https://api.example/v1' } as EndpointConfig;

function config(url: string, headers?: Record<string, string>): ApiVariablesConfig {
  return { endpoint: { url, headers, cacheEnabled: false } } as ApiVariablesConfig;
}

function stubFetch() {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({ variables: {} }),
    text: async () => ''
  }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function sentHeaders(fetchMock: ReturnType<typeof stubFetch>): Record<string, string> {
  return (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].headers as Record<
    string,
    string
  >;
}

describe('fetchVariableSchema headers', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends the AuthProvider headers to the API base', async () => {
    const fetchMock = stubFetch();
    await fetchVariableSchema(apiConfig, 'wf', 'n1', config('/vars'), authProvider);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.example/v1/vars');
    expect(sentHeaders(fetchMock)).toMatchObject({
      Accept: 'application/json',
      Authorization: 'Bearer tok'
    });
  });

  it('sends the AuthProvider headers to the page origin', async () => {
    const fetchMock = stubFetch();
    await fetchVariableSchema(null, 'wf', 'n1', config(`${location.origin}/vars`), authProvider);
    expect(sentHeaders(fetchMock).Authorization).toBe('Bearer tok');
  });

  it('sends no AuthProvider headers to another host', async () => {
    const fetchMock = stubFetch();
    await fetchVariableSchema(
      apiConfig,
      'wf',
      'n1',
      config('https://elsewhere.example/vars'),
      authProvider
    );
    const headers = sentHeaders(fetchMock);
    expect(headers.Authorization).toBeUndefined();
    expect(headers['X-Tenant']).toBeUndefined();
    expect(headers.Accept).toBe('application/json');
  });

  it('lets a header set on the endpoint win over the provider', async () => {
    const fetchMock = stubFetch();
    await fetchVariableSchema(
      apiConfig,
      'wf',
      'n1',
      config('/vars', { 'X-Tenant': 'endpoint' }),
      authProvider
    );
    const headers = sentHeaders(fetchMock);
    expect(headers['X-Tenant']).toBe('endpoint');
    expect(headers.Authorization).toBe('Bearer tok');
  });

  it('keeps the endpoint headers on another host', async () => {
    const fetchMock = stubFetch();
    await fetchVariableSchema(
      apiConfig,
      'wf',
      'n1',
      config('https://elsewhere.example/vars', { 'X-Key': 'k' }),
      authProvider
    );
    expect(sentHeaders(fetchMock)['X-Key']).toBe('k');
  });
});
