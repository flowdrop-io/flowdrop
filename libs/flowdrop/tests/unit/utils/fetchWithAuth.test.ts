/**
 * Tests for authenticatedFetch — the single fetch path that merges auth headers
 * and applies the 401/403 lifecycle consistently across all services.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  authenticatedFetch as rawAuthenticatedFetch,
  type AuthenticatedFetchOptions
} from '$lib/utils/fetchWithAuth.js';
import { createEndpointConfig } from '$lib/config/endpoints.js';
import { NoAuthProvider, type AuthProvider } from '$lib/types/auth.js';

/**
 * The tests' API lives at api.example.com, which the base names unless a test
 * says otherwise. URLs count as backend-supplied (the origin rule applies)
 * unless a test says `urlSource`.
 */
const authenticatedFetch = (
  url: string,
  init: RequestInit,
  opts: Omit<AuthenticatedFetchOptions, 'urlSource'> & { urlSource?: string }
) =>
  rawAuthenticatedFetch(url, init, {
    urlSource: 'backend-supplied',
    apiBase: 'https://api.example.com',
    ...opts
  } as AuthenticatedFetchOptions);

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

  it('gives the retry after a 401 its own timeout', async () => {
    fetchMock.mockResolvedValueOnce(unauthorized()).mockResolvedValueOnce(ok());
    const timer = vi.spyOn(globalThis, 'setTimeout');

    await authenticatedFetch(
      'https://api.example.com/p',
      {},
      {
        authProvider: {
          getAuthHeaders: async () => ({}),
          onUnauthorized: async () => true
        },
        timeoutMs: 5000
      }
    );

    expect(timer.mock.calls.filter(([, ms]) => ms === 5000)).toHaveLength(2);
    const first = fetchMock.mock.calls[0][1].signal;
    const second = fetchMock.mock.calls[1][1].signal;
    expect(first).toBeInstanceOf(AbortSignal);
    expect(second).not.toBe(first);
    timer.mockRestore();
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

    await authenticatedFetch('https://api.example.com/p', {}, { authProvider: undefined });

    expect(headersOf()).toEqual({
      Accept: 'application/json',
      'Content-Type': 'application/json'
    });
  });

  describe('origin rule', () => {
    const provider = (): AuthProvider => ({
      getAuthHeaders: async () => ({ Authorization: 'Bearer t1' }),
      onUnauthorized: vi.fn().mockResolvedValue(true),
      onForbidden: vi.fn()
    });

    it('sends the provider headers to the API base and, with no base, to the page origin only', async () => {
      fetchMock.mockResolvedValue(ok());
      vi.stubGlobal('location', { href: 'https://app.example.com/editor' });
      await rawAuthenticatedFetch(
        'https://api.example.com/v1/x',
        {},
        {
          urlSource: 'backend-supplied',
          authProvider: provider(),
          apiBase: 'https://api.example.com/v1'
        }
      );
      await rawAuthenticatedFetch(
        '/local',
        {},
        { urlSource: 'backend-supplied', authProvider: provider(), apiBase: undefined }
      );
      expect(headersOf(0).Authorization).toBe('Bearer t1');
      expect(headersOf(1).Authorization).toBe('Bearer t1');
    });

    it('judges a relative backend-supplied URL by the document base, which is where fetch sends it', async () => {
      fetchMock.mockResolvedValue(ok());
      vi.stubGlobal('location', { href: 'https://app.example.com/editor' });
      vi.stubGlobal('document', { baseURI: 'https://cdn.example.net/assets/' });
      const p = provider();
      const call = (url: string) =>
        rawAuthenticatedFetch(
          url,
          {},
          { urlSource: 'backend-supplied', authProvider: p, apiBase: undefined }
        );
      // fetch sends 'data/list' to cdn.example.net: that is the origin judged.
      await call('data/list');
      expect(headersOf(0).Authorization).toBe('Bearer t1');
      // The address bar's host is no longer the page's origin for this rule.
      await call('https://app.example.com/data/list');
      expect(headersOf(1).Authorization).toBeUndefined();
    });

    it('sends no provider headers, and calls no hooks, to another host or outside the base path', async () => {
      fetchMock.mockResolvedValue(unauthorized());
      vi.stubGlobal('location', { href: 'https://app.example.com/editor' });
      const p = provider();
      await rawAuthenticatedFetch(
        'https://evil.example.net/x',
        {},
        { urlSource: 'backend-supplied', authProvider: p, apiBase: 'https://api.example.com/v1' }
      );
      await rawAuthenticatedFetch(
        'https://api.example.com/other',
        {},
        { urlSource: 'backend-supplied', authProvider: p, apiBase: 'https://api.example.com/v1' }
      );
      expect(headersOf(0).Authorization).toBeUndefined();
      expect(headersOf(1).Authorization).toBeUndefined();
      expect(p.onUnauthorized).not.toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('takes the API base from config.baseUrl', async () => {
      fetchMock.mockResolvedValue(ok());
      vi.stubGlobal('location', { href: 'https://app.example.com/' });
      const config = createEndpointConfig('https://api.example.com/v1');
      await rawAuthenticatedFetch(
        'https://api.example.com/v1/a',
        {},
        { urlSource: 'backend-supplied', authProvider: provider(), config }
      );
      expect(headersOf().Authorization).toBe('Bearer t1');
    });

    it('refuses an opaque page origin', async () => {
      fetchMock.mockResolvedValue(ok());
      vi.stubGlobal('location', { href: 'data:text/html,x' });
      await rawAuthenticatedFetch(
        'data:text/plain,y',
        {},
        { urlSource: 'backend-supplied', authProvider: provider(), apiBase: undefined }
      ).catch(() => undefined);
      const sent = fetchMock.mock.calls[0]?.[1].headers as Record<string, string> | undefined;
      expect(sent?.Authorization).toBeUndefined();
    });
  });

  describe('host-configured URLs', () => {
    const provider = (): AuthProvider => ({
      getAuthHeaders: async () => ({ Authorization: 'Bearer t1' }),
      onUnauthorized: vi.fn().mockResolvedValue(true),
      onForbidden: vi.fn()
    });

    it('sends the provider headers to any origin the host configured', async () => {
      fetchMock.mockResolvedValue(ok());
      vi.stubGlobal('location', { href: 'https://app.example.com/editor' });
      const config = createEndpointConfig('https://api.example.com/v1');
      await rawAuthenticatedFetch(
        'https://signals.example.net/pipelines/1/pause',
        {},
        { urlSource: 'host-configured', config, authProvider: provider() }
      );
      expect(headersOf().Authorization).toBe('Bearer t1');
    });

    it('calls onUnauthorized and onForbidden for them', async () => {
      vi.stubGlobal('location', { href: 'https://app.example.com/editor' });
      const p = provider();
      fetchMock.mockResolvedValueOnce(unauthorized()).mockResolvedValueOnce(forbidden());
      await rawAuthenticatedFetch(
        'https://signals.example.net/x',
        {},
        { urlSource: 'host-configured', authProvider: p }
      );
      expect(p.onUnauthorized).toHaveBeenCalledOnce();
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(p.onForbidden).toHaveBeenCalledOnce();
    });
  });

  describe('redirects', () => {
    const provider: AuthProvider = { getAuthHeaders: async () => ({ 'X-API-Key': 'k' }) };

    it('refuses redirects while the provider headers are attached', async () => {
      fetchMock.mockResolvedValue(ok());
      await authenticatedFetch('https://api.example.com/p', {}, { authProvider: provider });
      expect(fetchMock.mock.calls[0][1].redirect).toBe('error');
    });

    it('respects a redirect mode the caller set', async () => {
      fetchMock.mockResolvedValue(ok());
      await authenticatedFetch(
        'https://api.example.com/p',
        { redirect: 'follow' },
        { authProvider: provider }
      );
      expect(fetchMock.mock.calls[0][1].redirect).toBe('follow');
    });

    it('leaves the redirect mode alone when no provider headers are attached', async () => {
      fetchMock.mockResolvedValue(ok());
      vi.stubGlobal('location', { href: 'https://app.example.com/' });
      await authenticatedFetch('https://other.example.net/p', {}, { authProvider: provider });
      await authenticatedFetch('https://api.example.com/p', {}, { authProvider: undefined });
      expect(fetchMock.mock.calls[0][1].redirect).toBeUndefined();
      expect(fetchMock.mock.calls[1][1].redirect).toBeUndefined();
    });

    it('leaves the redirect mode alone for a provider with no headers to send', async () => {
      fetchMock.mockResolvedValue(ok());
      await authenticatedFetch(
        'https://api.example.com/p',
        {},
        { authProvider: { getAuthHeaders: async () => ({}) } }
      );
      expect('redirect' in fetchMock.mock.calls[0][1]).toBe(false);
    });

    it('leaves the redirect mode alone for the no-auth fallback provider', async () => {
      fetchMock.mockResolvedValue(ok());
      await authenticatedFetch(
        'https://api.example.com/p',
        {},
        { authProvider: new NoAuthProvider() }
      );
      expect('redirect' in fetchMock.mock.calls[0][1]).toBe(false);
    });

    it('refuses redirects on the retry when the provider has headers by then', async () => {
      fetchMock.mockResolvedValueOnce(unauthorized()).mockResolvedValueOnce(ok());
      let token = '';
      await authenticatedFetch(
        'https://api.example.com/p',
        {},
        {
          authProvider: {
            getAuthHeaders: async () => (token ? { Authorization: token } : {}),
            onUnauthorized: async () => {
              token = 'Bearer fresh';
              return true;
            }
          }
        }
      );
      expect('redirect' in fetchMock.mock.calls[0][1]).toBe(false);
      expect(fetchMock.mock.calls[1][1].redirect).toBe('error');
    });
  });

  describe('refresh counting', () => {
    it('refreshes once for two requests whose 401s arrive at different times', async () => {
      let token = 'stale';
      const onUnauthorized = vi.fn(async () => {
        token = 'fresh';
        return true;
      });
      const authProvider: AuthProvider = {
        getAuthHeaders: async () => ({ Authorization: `Bearer ${token}` }),
        onUnauthorized
      };
      // Request 1's 401 comes back at once; request 2's only after the refresh finished.
      let releaseSecond!: () => void;
      const gate = new Promise<void>((r) => (releaseSecond = r));
      fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
        const fresh = (init.headers as Record<string, string>).Authorization === 'Bearer fresh';
        if (fresh) return ok();
        if (url.endsWith('/2')) await gate;
        return unauthorized();
      });

      const first = authenticatedFetch('https://api.example.com/1', {}, { authProvider });
      const second = authenticatedFetch('https://api.example.com/2', {}, { authProvider });
      expect((await first).status).toBe(200);
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
      releaseSecond();
      expect((await second).status).toBe(200);

      expect(onUnauthorized).toHaveBeenCalledTimes(1);
      // two stale sends + two fresh retries
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    it('does not ask again after a refresh that failed, and does not retry', async () => {
      const onUnauthorized = vi.fn().mockResolvedValue(false);
      const authProvider: AuthProvider = { getAuthHeaders: async () => ({}), onUnauthorized };
      let releaseSecond!: () => void;
      const gate = new Promise<void>((r) => (releaseSecond = r));
      fetchMock.mockImplementation(async (url: string) => {
        if (url.endsWith('/2')) await gate;
        return unauthorized();
      });
      const first = authenticatedFetch('https://api.example.com/1', {}, { authProvider });
      const second = authenticatedFetch('https://api.example.com/2', {}, { authProvider });
      await first;
      releaseSecond();
      expect((await second).status).toBe(401);
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('retries at most once per request', async () => {
      fetchMock.mockResolvedValue(unauthorized());
      const onUnauthorized = vi.fn().mockResolvedValue(true);
      const response = await authenticatedFetch(
        'https://api.example.com/p',
        {},
        { authProvider: { getAuthHeaders: async () => ({}), onUnauthorized } }
      );
      expect(response.status).toBe(401);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(onUnauthorized).toHaveBeenCalledOnce();
    });
  });

  describe('header merging', () => {
    it('lets endpoint and request headers win over the provider, ignoring case', async () => {
      fetchMock.mockResolvedValue(ok());
      const config = createEndpointConfig('https://api.example.com', {
        headers: { svc: { authorization: 'Bearer endpoint', 'X-A': '1' } }
      });
      await authenticatedFetch(
        'https://api.example.com/p',
        { headers: new Headers({ 'x-a': '2' }) },
        {
          config,
          endpointKey: 'svc',
          authProvider: { getAuthHeaders: async () => ({ Authorization: 'Bearer provider' }) }
        }
      );
      const sent = headersOf();
      const names = Object.keys(sent).map((n) => n.toLowerCase());
      expect(names.filter((n) => n === 'authorization')).toHaveLength(1);
      expect(Object.values(sent)).toContain('Bearer endpoint');
      expect(Object.values(sent)).not.toContain('Bearer provider');
      expect(names.filter((n) => n === 'x-a')).toHaveLength(1);
      expect(Object.values(sent)).toContain('2');
    });

    it('accepts tuple headers and lets a request header beat the provider in another case', async () => {
      fetchMock.mockResolvedValue(ok());
      await authenticatedFetch(
        'https://api.example.com/p',
        { headers: [['authorization', 'Bearer own']] },
        { authProvider: { getAuthHeaders: async () => ({ Authorization: 'Bearer provider' }) } }
      );
      expect(Object.values(headersOf())).toContain('Bearer own');
      expect(Object.values(headersOf())).not.toContain('Bearer provider');
    });
  });

  describe('timeout', () => {
    afterEach(() => vi.useRealTimers());

    /** A fetch that rejects with the signal's reason once it aborts. */
    const hangingFetch = (_u: string, init: RequestInit) =>
      new Promise((_res, rej) => {
        init.signal?.addEventListener('abort', () => rej(init.signal?.reason));
      });

    it('times out a fetch whose headers do not arrive, with a TimeoutError', async () => {
      vi.useFakeTimers();
      fetchMock.mockImplementation(hangingFetch);
      const pending = authenticatedFetch(
        'https://api.example.com/p',
        {},
        { authProvider: undefined, timeoutMs: 1000 }
      );
      const caught = pending.catch((e) => e);
      await vi.advanceTimersByTimeAsync(1000);
      expect(await caught).toMatchObject({ name: 'TimeoutError' });
    });

    it('works when AbortSignal.timeout is missing (older Safari)', async () => {
      vi.useFakeTimers();
      vi.stubGlobal(
        'AbortSignal',
        Object.assign(function () {}, { timeout: undefined })
      );
      fetchMock.mockImplementation(hangingFetch);
      const caught = authenticatedFetch(
        'https://api.example.com/p',
        {},
        { authProvider: undefined, timeoutMs: 1000 }
      ).catch((e) => e);
      await vi.advanceTimersByTimeAsync(1000);
      expect(await caught).toMatchObject({ name: 'TimeoutError' });
    });

    it('does not time out the body once the headers arrived', async () => {
      vi.useFakeTimers();
      let release!: () => void;
      const gate = new Promise<void>((r) => (release = r));
      fetchMock.mockImplementation(async () => {
        const body = new ReadableStream({
          async start(controller) {
            await gate;
            controller.enqueue(new TextEncoder().encode('{"a":1}'));
            controller.close();
          }
        });
        return new Response(body, { status: 200 });
      });
      const response = await authenticatedFetch(
        'https://api.example.com/p',
        {},
        { authProvider: undefined, timeoutMs: 1000 }
      );
      await vi.advanceTimersByTimeAsync(5000);
      release();
      expect(await response.json()).toEqual({ a: 1 });
    });

    it('still stops a body read when the caller aborts after the headers', async () => {
      const caller = new AbortController();
      fetchMock.mockImplementation(async (_u: string, init: RequestInit) => {
        const body = new ReadableStream({
          start(controller) {
            init.signal?.addEventListener('abort', () => controller.error(init.signal?.reason));
          }
        });
        return new Response(body, { status: 200 });
      });
      const response = await authenticatedFetch(
        'https://api.example.com/p',
        { signal: caller.signal },
        { authProvider: undefined, timeoutMs: 60_000 }
      );
      const reading = response.text().catch((e) => e);
      caller.abort(new DOMException('stop', 'AbortError'));
      expect(await reading).toMatchObject({ name: 'AbortError' });
    });

    it('gives the retry after a 401 a fresh timer, not the first one left running', async () => {
      vi.useFakeTimers();
      fetchMock.mockResolvedValueOnce(unauthorized()).mockImplementationOnce(hangingFetch);
      const caught = authenticatedFetch(
        'https://api.example.com/p',
        {},
        {
          authProvider: {
            getAuthHeaders: async () => ({}),
            onUnauthorized: async () => {
              await new Promise((r) => setTimeout(r, 900));
              return true;
            }
          },
          timeoutMs: 1000
        }
      ).catch((e) => e);
      // 900ms of login, then 1000ms for the retry: it must not abort early.
      await vi.advanceTimersByTimeAsync(900 + 999);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      let settled = false;
      void caught.then(() => (settled = true));
      await vi.advanceTimersByTimeAsync(0);
      expect(settled).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(await caught).toMatchObject({ name: 'TimeoutError' });
    });
  });

  describe('signals', () => {
    it('aborts the attempt when the caller signal aborts, with a timeout set', async () => {
      const caller = new AbortController();
      fetchMock.mockImplementation(
        (_u, init: RequestInit) =>
          new Promise((_res, rej) => {
            init.signal?.addEventListener('abort', () => rej(init.signal?.reason));
          })
      );
      const pending = authenticatedFetch(
        'https://api.example.com/p',
        { signal: caller.signal },
        { authProvider: undefined, timeoutMs: 60_000 }
      );
      await Promise.resolve();
      caller.abort(new DOMException('stop', 'AbortError'));
      await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    });
  });

  it('refuses, at the type level, a call without urlSource or without a base for a backend-supplied URL', () => {
    const call = () =>
      // @ts-expect-error -- a backend-supplied URL needs `config` or `apiBase`
      rawAuthenticatedFetch(
        'https://api.example.com/p',
        {},
        { urlSource: 'backend-supplied', authProvider: undefined }
      );
    const bare = () =>
      // @ts-expect-error -- every call says who chose the URL
      rawAuthenticatedFetch('https://api.example.com/p', {}, { authProvider: undefined });
    expect(typeof bare).toBe('function');
    expect(typeof call).toBe('function');
  });
});
