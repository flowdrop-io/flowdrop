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
   * Abort each attempt when the response headers have not arrived after this
   * many milliseconds; reading the body is not timed. The retry after a `401`
   * gets its own timeout, so a login the provider shows in `onUnauthorized`
   * does not use up the retry's time. A caller's own `init.signal` is combined
   * with it: either one aborts the attempt, and the caller's still covers the
   * body.
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
 *   `config.baseUrl` when `apiBase` is `undefined` or left out; with neither,
 *   only the page's own origin qualifies. The type refuses a call that names
 *   neither key.
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

/**
 * Send one attempt. With `timeoutMs`, the attempt aborts (with a `TimeoutError`
 * reason, as `AbortSignal.timeout` does) when the response headers have not
 * arrived in time. The timer stops once they have, so reading a slow body is
 * not cut off; the caller's own `init.signal` still covers the body. A manual
 * controller and timer serve every browser, including those without
 * `AbortSignal.timeout`.
 */
async function sendAttempt(url: string, init: RequestInit, opts: AuthenticatedFetchOptions) {
  if (opts.timeoutMs === undefined) return fetch(url, init);
  const timeout = new AbortController();
  const timer = setTimeout(
    () =>
      timeout.abort(
        new DOMException(`The operation timed out after ${opts.timeoutMs}ms`, 'TimeoutError')
      ),
    opts.timeoutMs
  );
  try {
    const signal = init.signal ? anySignal([init.signal, timeout.signal]) : timeout.signal;
    return await fetch(url, { ...init, signal });
  } finally {
    clearTimeout(timer);
  }
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
 * document's base, is on the page's own origin or under the API base.
 */
function providerAllowed(url: string, opts: AuthenticatedFetchOptions): boolean {
  if (!opts.authProvider) return false;
  if (opts.urlSource === 'host-configured') return true;
  // A relative URL is resolved against the document's base, as `fetch` does (a
  // `<base>` element moves it away from `location.href`). The page's origin is
  // the address bar's, not the base's: a `<base>` pointing at a CDN does not make
  // the CDN the page.
  const hasLocation = typeof location !== 'undefined';
  const baseUrl =
    typeof document !== 'undefined' && document.baseURI
      ? document.baseURI
      : hasLocation
        ? location.href
        : undefined;
  // A srcdoc frame reports its parent's origin but is not the page the editor was
  // served from: it has none.
  const pageOrigin = !hasLocation
    ? undefined
    : location.href.startsWith('about:')
      ? null
      : (location.origin ?? new URL(location.href).origin);
  const apiBase = opts.apiBase ?? opts.config?.baseUrl ?? '';
  return mayCarryInstanceAuth(url, apiBase, baseUrl, pageOrigin);
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
 * token is picked up. `providerAdded` says whether the provider contributed at
 * least one header (a provider with nothing to send, such as the no-auth
 * fallback, has nothing to protect from a redirect).
 */
async function buildHeaders(
  init: RequestInit,
  opts: AuthenticatedFetchOptions,
  useProvider: boolean
): Promise<{ headers: Record<string, string>; providerAdded: boolean }> {
  // Keyed by lower-case name; the last name spelling set is the one sent.
  const merged = new Map<string, [string, string]>();
  const set = (pairs: Iterable<[string, string]>) => {
    for (const [name, value] of pairs) merged.set(name.toLowerCase(), [name, value]);
  };

  const keyed = opts.config && opts.endpointKey;
  set(keyed ? [['Content-Type', 'application/json']] : Object.entries(DEFAULT_HEADERS));
  set(headerPairs(opts.baseHeaders));
  let providerAdded = false;
  if (useProvider && opts.authProvider) {
    const fromProvider = headerPairs(await opts.authProvider.getAuthHeaders());
    providerAdded = fromProvider.length > 0;
    set(fromProvider);
  }
  if (keyed) set(headerPairs(opts.config?.headers?.[opts.endpointKey as string]));
  set(headerPairs(init.headers));

  return { headers: Object.fromEntries(merged.values()), providerAdded };
}

interface RefreshState {
  /** Refreshes that have finished (successfully or not). */
  completed: number;
  /** What the latest finished refresh reported. */
  lastResult: boolean;
  inflight?: Promise<boolean>;
}

const refreshStates = new WeakMap<AuthProvider, RefreshState>();

function stateOf(authProvider: AuthProvider): RefreshState {
  let state = refreshStates.get(authProvider);
  if (!state) {
    state = { completed: 0, lastResult: false };
    refreshStates.set(authProvider, state);
  }
  return state;
}

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
  const state = stateOf(authProvider);
  if (!state.inflight) {
    const finish = (result: boolean) => {
      state.completed += 1;
      state.lastResult = result;
      state.inflight = undefined;
      return result;
    };
    state.inflight = authProvider.onUnauthorized().then(finish, (error) => {
      finish(false);
      throw error;
    });
  }
  return state.inflight;
}

/**
 * Whether to retry after a `401`. A request sent before a refresh finished
 * does not start another one: it takes that refresh's result and retries with
 * the fresh headers. Otherwise it joins the refresh in flight or starts one.
 */
function refreshedSince(authProvider: AuthProvider, completedAtSend: number): Promise<boolean> {
  const state = stateOf(authProvider);
  if (state.completed > completedAtSend) return Promise.resolve(state.lastResult);
  return refreshAuth(authProvider);
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
  // Decided once, on the requested URL (see `urlSource`): a backend-supplied
  // URL on another host gets neither the provider's headers nor its 401/403
  // hooks. Redirects are not followed while provider headers are attached (below),
  // so a redirect cannot carry them to another host.
  const provider = providerAllowed(url, opts) ? opts.authProvider : undefined;
  const attempt = (built: {
    headers: Record<string, string>;
    providerAdded: boolean;
  }): Promise<Response> => {
    const redirect =
      built.providerAdded && init.redirect === undefined ? { redirect: 'error' as const } : {};
    return sendAttempt(url, { ...init, ...redirect, headers: built.headers }, opts);
  };
  const completedAtSend = provider ? stateOf(provider).completed : 0;
  let response = await attempt(await buildHeaders(init, opts, !!provider));

  // 401 → let the provider refresh, then retry once with fresh headers. A
  // refresh that finished after this request was sent counts: no second one.
  if (response.status === 401 && provider?.onUnauthorized) {
    const refreshed = await refreshedSince(provider, completedAtSend);
    if (refreshed) {
      response = await attempt(await buildHeaders(init, opts, true));
    }
  }

  // 403 → notify the provider (e.g. surface a permission error).
  if (response.status === 403 && provider?.onForbidden) {
    await provider.onForbidden();
  }

  return response;
}
