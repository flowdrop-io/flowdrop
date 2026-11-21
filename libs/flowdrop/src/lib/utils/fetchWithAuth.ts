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
import type { AuthProvider } from '$lib/types/auth.js';
import { mayCarryInstanceAuth } from '$lib/utils/apiUrl.js';

/**
 * Fields common to every call. `config` + `endpointKey` source static endpoint
 * headers; `baseHeaders` serve ad-hoc requests not tied to an endpoint.
 */
interface AuthenticatedFetchBase {
  /**
   * Auth provider supplying `Authorization` etc. and 401/403 lifecycle hooks.
   * Required on purpose: every call site has to decide, and pass `undefined`
   * only where a request must go out without the host's auth. An optional key
   * let calls forget it, which is how requests reached backends without auth.
   *
   * Whether the provider is used for a URL depends on `urlSource` (see
   * {@link AuthenticatedFetchOptions}): a URL the host configured always gets
   * it; a URL the backend supplied gets it only on the page's own origin or
   * under the API base. When it is not used, the request goes out without the
   * provider's headers and its `onUnauthorized` and `onForbidden` hooks are not
   * called. Callers do not check this.
   */
  authProvider: AuthProvider | undefined;
  /** Endpoint key identifying which static headers to apply (with `config`). */
  endpointKey?: string;
  /** Base headers for requests not tied to a configured endpoint. */
  baseHeaders?: Record<string, string>;
  /**
   * Abort each attempt after this many milliseconds. The retry after a `401`
   * gets its own timeout, so a login the provider shows in `onUnauthorized`
   * does not use up the retry's time. A caller's own `init.signal` is combined
   * with it: either one aborts the attempt.
   */
  timeoutMs?: number;
}

/**
 * Options for {@link authenticatedFetch}. Besides the base fields, every call
 * says who chose the URL, with `urlSource`:
 *
 * - `'host-configured'`: the URL was built from the host's own configuration
 *   (`EndpointConfig`: `buildEndpointUrl`, an absolute endpoint template, a
 *   per-endpoint `baseUrl` such as `signals.baseUrl`). The provider's headers
 *   always go with it, whatever origin the host chose. `config` (with
 *   `endpointKey`) adds the endpoint's static headers.
 * - `'backend-supplied'`: the URL came from a response or a schema the backend
 *   sent (autocomplete URLs, dynamic schema URLs, API variable URLs, the
 *   save-as-copy URL). The provider's headers go only to the page's own origin
 *   or under the API base, so a backend cannot point the editor at another
 *   host and collect the host's credentials. The API base is `apiBase`, or
 *   `config.baseUrl`; `apiBase: undefined` says there is none (only the page's
 *   own origin qualifies). The type refuses a call with neither.
 */
export type AuthenticatedFetchOptions = AuthenticatedFetchBase &
  (
    | { urlSource: 'host-configured'; config?: EndpointConfig }
    | ({ urlSource: 'backend-supplied' } & (
        | { config: EndpointConfig; apiBase?: string }
        | { config?: EndpointConfig; apiBase: string | undefined }
      ))
  );

/** One signal that aborts when any of the given ones does. */
function anySignal(signals: AbortSignal[]): AbortSignal {
  if (typeof AbortSignal.any === 'function') return AbortSignal.any(signals);
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      break;
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  }
  return controller.signal;
}

/** The attempt's init: the caller's signal combined with its own timeout. */
function attemptInit(init: RequestInit, opts: AuthenticatedFetchOptions): RequestInit {
  if (opts.timeoutMs === undefined) return init;
  const timeout = AbortSignal.timeout(opts.timeoutMs);
  return { ...init, signal: init.signal ? anySignal([init.signal, timeout]) : timeout };
}

/** JSON defaults for requests not tied to a configured endpoint. */
const DEFAULT_HEADERS: Record<string, string> = {
  Accept: 'application/json',
  'Content-Type': 'application/json'
};

/** Headers in a `HeadersInit` of any form (record, tuples, `Headers`). */
function headerPairs(init: HeadersInit | undefined | null): [string, string][] {
  if (!init) return [];
  if (typeof Headers !== 'undefined' && init instanceof Headers) return [...init.entries()];
  if (Array.isArray(init)) return init.map(([k, v]) => [k, v]);
  return Object.entries(init as Record<string, string>).filter(
    (entry): entry is [string, string] => entry[1] !== undefined && entry[1] !== null
  );
}

/**
 * Whether the provider may be used for this URL. A host-configured URL always
 * may. A backend-supplied one may when the requested URL, resolved against the
 * page, is on the page's own origin or under the API base.
 */
function providerAllowed(url: string, opts: AuthenticatedFetchOptions): boolean {
  if (!opts.authProvider) return false;
  if (opts.urlSource === 'host-configured') return true;
  const pageUrl = typeof location === 'undefined' ? undefined : location.href;
  const apiBase = opts.apiBase ?? opts.config?.baseUrl ?? '';
  return mayCarryInstanceAuth(url, apiBase, pageUrl);
}

/**
 * Build the merged header set. Later layers replace earlier ones by header
 * name, ignoring case (`Authorization` and `authorization` are one header), in
 * this order:
 *
 * 1. defaults (`Content-Type`, plus `Accept` for requests without an endpoint
 *    key) and `baseHeaders`
 * 2. the auth provider's headers (only when `useProvider`)
 * 3. `config.headers[endpointKey]`, the static headers configured for the
 *    endpoint
 * 4. the request's own `init.headers` (any `HeadersInit`)
 *
 * Headers set for the endpoint (3) or the request (4) therefore always win
 * over the provider's, the same rule `endpoint.headers` follows in the
 * dynamic-schema and variable services. Re-invoked for the retry so a refreshed
 * token is picked up.
 */
async function buildHeaders(
  init: RequestInit,
  opts: AuthenticatedFetchOptions,
  useProvider: boolean
): Promise<Record<string, string>> {
  // Keyed by lower-case name; the last name spelling set is the one sent.
  const merged = new Map<string, [string, string]>();
  const set = (pairs: Iterable<[string, string]>) => {
    for (const [name, value] of pairs) merged.set(name.toLowerCase(), [name, value]);
  };

  const keyed = opts.config && opts.endpointKey;
  set(keyed ? [['Content-Type', 'application/json']] : Object.entries(DEFAULT_HEADERS));
  set(headerPairs(opts.baseHeaders));
  if (useProvider && opts.authProvider) set(headerPairs(await opts.authProvider.getAuthHeaders()));
  if (keyed) set(headerPairs(opts.config?.headers?.[opts.endpointKey as string]));
  set(headerPairs(init.headers));

  return Object.fromEntries(merged.values());
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
 * @param opts - Auth provider, API base and header source
 * @returns The raw {@link Response}; callers handle `.ok`/parsing themselves
 */
export async function authenticatedFetch(
  url: string,
  init: RequestInit,
  opts: AuthenticatedFetchOptions
): Promise<Response> {
  // Decided once, on the final URL (see `urlSource`): a backend-supplied URL
  // on another host gets neither the provider's headers nor its 401/403 hooks.
  const provider = providerAllowed(url, opts) ? opts.authProvider : undefined;
  const headers = await buildHeaders(init, opts, !!provider);
  let response = await fetch(url, { ...attemptInit(init, opts), headers });

  // 401 → let the provider refresh, then retry once with fresh headers.
  if (response.status === 401 && provider?.onUnauthorized) {
    const refreshed = await refreshAuth(provider);
    if (refreshed) {
      const retryHeaders = await buildHeaders(init, opts, true);
      response = await fetch(url, { ...attemptInit(init, opts), headers: retryHeaders });
    }
  }

  // 403 → notify the provider (e.g. surface a permission error).
  if (response.status === 403 && provider?.onForbidden) {
    await provider.onForbidden();
  }

  return response;
}
