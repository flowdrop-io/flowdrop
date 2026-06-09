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
  /** Auth provider supplying `Authorization` etc. and 401/403 lifecycle hooks. */
  authProvider?: AuthProvider;
  /** Endpoint configuration, used with `endpointKey` to look up static headers. */
  config?: EndpointConfig;
  /** Endpoint key identifying which static headers to apply. */
  endpointKey?: string;
  /** Base headers for requests not tied to a configured endpoint. */
  baseHeaders?: Record<string, string>;
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
  init: RequestInit = {},
  opts: AuthenticatedFetchOptions = {}
): Promise<Response> {
  const headers = await buildHeaders(init, opts);
  let response = await fetch(url, { ...init, headers });

  // 401 → let the provider refresh, then retry once with fresh headers.
  if (response.status === 401 && opts.authProvider?.onUnauthorized) {
    const refreshed = await opts.authProvider.onUnauthorized();
    if (refreshed) {
      const retryHeaders = await buildHeaders(init, opts);
      response = await fetch(url, { ...init, headers: retryHeaders });
    }
  }

  // 403 → notify the provider (e.g. surface a permission error).
  if (response.status === 403 && opts.authProvider?.onForbidden) {
    await opts.authProvider.onForbidden();
  }

  return response;
}
