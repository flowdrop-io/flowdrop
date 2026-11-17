/**
 * Authenticated fetch
 *
 * The single fetch path for FlowDrop's per-instance services. It builds request
 * headers (static endpoint headers + the {@link AuthProvider}'s headers + any
 * caller headers) and uniformly applies the auth lifecycle: on `401` it invokes
 * `onUnauthorized()` and — if that reports a successful refresh — retries the
 * request once with freshly fetched headers; on `403` it invokes
 * `onForbidden()`. Callers receive the raw {@link Response} and keep their own
 * status/parse handling.
 *
 * Routing every service through this helper means a configured `AuthProvider`
 * authenticates *and* refreshes consistently — matching the behaviour the typed
 * workflow/node API gets from {@link EnhancedFlowDropApiClient}.
 *
 * @module utils/fetchWithAuth
 */

import type { EndpointConfig } from '$lib/config/endpoints.js';
import { getEndpointHeaders } from '$lib/config/endpoints.js';
import type { AuthProvider } from '$lib/types/auth.js';

/**
 * Options describing how to authenticate and where the base headers come from.
 *
 * Provide `config` + `endpointKey` to source static endpoint headers (the usual
 * case for endpoint-keyed services), or `baseHeaders` for ad-hoc requests that
 * are not tied to a configured endpoint (e.g. a user-configured autocomplete
 * URL). When neither is given the request carries only JSON defaults plus auth.
 */
export interface AuthenticatedFetchOptions {
  /**
   * Auth provider supplying `Authorization` etc. and 401/403 lifecycle hooks.
   * Required on purpose: every call site has to decide, and pass `undefined`
   * only where a request must go out without the host's auth. An optional key
   * let calls forget it, which is how requests reached backends without auth.
   */
  authProvider: AuthProvider | undefined;
  /** Endpoint configuration, used with `endpointKey` to look up static headers. */
  config?: EndpointConfig;
  /** Endpoint key identifying which static headers to apply. */
  endpointKey?: string;
  /** Base headers for requests not tied to a configured endpoint. */
  baseHeaders?: Record<string, string>;
  /**
   * Abort each attempt after this many milliseconds. The retry after a `401`
   * gets its own timeout, so a login the provider shows in `onUnauthorized`
   * does not use up the retry's time.
   */
  timeoutMs?: number;
}

/** The attempt's init: its own timeout signal when one is asked for. */
function attemptInit(init: RequestInit, opts: AuthenticatedFetchOptions): RequestInit {
  return opts.timeoutMs === undefined
    ? init
    : { ...init, signal: AbortSignal.timeout(opts.timeoutMs) };
}

const DEFAULT_HEADERS: Record<string, string> = {
  Accept: 'application/json',
  'Content-Type': 'application/json'
};

/**
 * Build the merged header set: base headers < auth headers < per-request headers.
 *
 * Re-invoked for the retry so a refreshed token is picked up.
 */
async function buildHeaders(
  init: RequestInit,
  opts: AuthenticatedFetchOptions
): Promise<Record<string, string>> {
  const headers: Record<string, string> =
    opts.config && opts.endpointKey
      ? getEndpointHeaders(opts.config, opts.endpointKey)
      : { ...DEFAULT_HEADERS, ...opts.baseHeaders };

  if (opts.authProvider) {
    Object.assign(headers, await opts.authProvider.getAuthHeaders());
  }

  if (init.headers) {
    Object.assign(headers, init.headers as Record<string, string>);
  }

  return headers;
}

const pendingRefreshes = new WeakMap<AuthProvider, Promise<boolean>>();

/**
 * Call the provider's `onUnauthorized()`, sharing one call between every
 * request that gets a `401` while it is pending. A form whose autocomplete
 * fields all look up their labels at once would otherwise refresh the token
 * (or prompt for a login) once per field.
 *
 * @param authProvider - The provider whose session expired
 * @returns Whether the provider refreshed its credentials
 */
export function refreshAuth(authProvider: AuthProvider): Promise<boolean> {
  if (!authProvider.onUnauthorized) return Promise.resolve(false);
  let pending = pendingRefreshes.get(authProvider);
  if (!pending) {
    pending = authProvider.onUnauthorized().finally(() => {
      pendingRefreshes.delete(authProvider);
    });
    pendingRefreshes.set(authProvider, pending);
  }
  return pending;
}

/**
 * Perform an authenticated fetch with consistent 401/403 handling.
 *
 * @param url - The fully-resolved request URL
 * @param init - Standard fetch options (method, body, signal, headers, …)
 * @param opts - Auth provider and header source
 * @returns The raw {@link Response}; callers handle `.ok`/parsing themselves
 */
export async function authenticatedFetch(
  url: string,
  init: RequestInit,
  opts: AuthenticatedFetchOptions
): Promise<Response> {
  const headers = await buildHeaders(init, opts);
  let response = await fetch(url, { ...attemptInit(init, opts), headers });

  // 401 → let the provider refresh, then retry once with fresh headers.
  if (response.status === 401 && opts.authProvider?.onUnauthorized) {
    const refreshed = await refreshAuth(opts.authProvider);
    if (refreshed) {
      const retryHeaders = await buildHeaders(init, opts);
      response = await fetch(url, { ...attemptInit(init, opts), headers: retryHeaders });
    }
  }

  // 403 → notify the provider (e.g. surface a permission error).
  if (response.status === 403 && opts.authProvider?.onForbidden) {
    await opts.authProvider.onForbidden();
  }

  return response;
}
