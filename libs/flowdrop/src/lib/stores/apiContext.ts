/**
 * Per-instance API context for FlowDrop.
 *
 * Holds the endpoint configuration and auth provider for one FlowDrop
 * instance and lazily exposes an {@link EnhancedFlowDropApiClient} built from
 * them. Replaces the former module-level singleton in `services/api.ts`:
 * each instance owns its own configuration so multiple editors can talk to
 * different backends on a single page.
 *
 * Resolved in components via `getInstance().api`; configured at mount time by
 * `mountFlowDropApp` / `mountPlayground` (or `<App>` when used directly).
 *
 * @module stores/apiContext
 */

import type { EndpointConfig } from '../config/endpoints.js';
import type { AuthProvider } from '../types/auth.js';
import { NoAuthProvider } from '../types/auth.js';
import { EnhancedFlowDropApiClient } from '../api/enhanced-client.js';

/**
 * Per-instance endpoint configuration, auth provider, and API client.
 *
 * The config is `null` until {@link configure} is called — mirroring the
 * legacy "throws if not configured" contract. The client is created lazily on
 * first access and rebuilt whenever the configuration changes.
 */
export class ApiContext {
  #config: EndpointConfig | null = null;
  #authProvider: AuthProvider = new NoAuthProvider();
  #client: EnhancedFlowDropApiClient | null = null;

  /** The current endpoint configuration, or null until {@link configure}d. */
  get config(): EndpointConfig | null {
    return this.#config;
  }

  /** The current auth provider (defaults to {@link NoAuthProvider}). */
  get authProvider(): AuthProvider {
    return this.#authProvider;
  }

  /**
   * The API client for this instance, created lazily from the configured
   * endpoints and auth provider.
   *
   * @throws Error if the context has not been configured yet.
   */
  get client(): EnhancedFlowDropApiClient {
    if (!this.#config) {
      throw new Error(
        'Endpoint configuration not set. Configure the instance via fd.api.configure() ' +
          '(done automatically by mountFlowDropApp / <App>) before using fd.api.client.'
      );
    }
    return (this.#client ??= new EnhancedFlowDropApiClient(this.#config, this.#authProvider));
  }

  /**
   * Configure this instance's endpoints and (optionally) auth provider.
   * Discards any previously built client so the next access rebuilds it.
   */
  configure(config: EndpointConfig, authProvider?: AuthProvider): void {
    this.#config = config;
    if (authProvider) {
      this.#authProvider = authProvider;
    }
    // Drop the cached client so it picks up the new config/auth on next access.
    this.#client = null;
  }

  /**
   * Swap the auth provider at runtime — e.g. on login or logout — without
   * reconfiguring endpoints or remounting. Propagates to the live client so
   * in-flight components keep working against the same instance.
   *
   * Per-instance services read `fd.api.authProvider` per request, so they pick
   * up the new provider on their next call automatically.
   *
   * @param authProvider - The new authentication provider
   */
  setAuthProvider(authProvider: AuthProvider): void {
    this.#authProvider = authProvider;
    // Keep the cached client (and its in-flight consumers) in sync.
    this.#client?.setAuthProvider(authProvider);
  }

  /** Whether {@link configure} has been called with a usable config. */
  isConfigured(): boolean {
    return Boolean(this.#config);
  }
}
