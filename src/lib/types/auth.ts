/**
 * Authentication Provider Types for FlowDrop
 *
 * Provides interfaces and implementations for authentication in FlowDrop.
 * AuthProvider is passed at mount time and cannot be changed without remounting.
 *
 * @module types/auth
 */

/**
 * Authentication provider interface
 *
 * Defines the contract for authentication providers that can be passed to FlowDrop.
 * Implementations handle token retrieval, authentication state, and error handling.
 *
 * @example
 * ```typescript
 * const authProvider: AuthProvider = {
 *   getAuthHeaders: async () => ({ Authorization: "Bearer token123" }),
 *   isAuthenticated: () => true
 * };
 * ```
 */
export interface AuthProvider {
	/**
	 * Get current authentication headers
	 *
	 * Called before every API request to retrieve current auth headers.
	 * Should return fresh headers each time (e.g., after token refresh).
	 *
	 * @returns Promise resolving to a record of header name-value pairs
	 */
	getAuthHeaders(): Promise<Record<string, string>>;

	/**
	 * Check if currently authenticated
	 *
	 * Used to determine if API requests should be attempted.
	 * Should return synchronously for performance.
	 *
	 * @returns true if authenticated, false otherwise
	 */
	isAuthenticated(): boolean;

	/**
	 * Called when API returns 401 Unauthorized
	 *
	 * Allows the provider to attempt token refresh or re-authentication.
	 * If this returns true, the failed request will be retried with new headers.
	 *
	 * @returns Promise resolving to true if auth was refreshed and request should retry
	 */
	onUnauthorized?(): Promise<boolean>;

	/**
	 * Called when API returns 403 Forbidden
	 *
	 * Allows the provider to handle permission errors (e.g., show error UI).
	 * Unlike 401, this typically means the user is authenticated but lacks permission.
	 */
	onForbidden?(): Promise<void>;
}

/**
 * Configuration for static authentication
 *
 * Used to configure StaticAuthProvider with different auth types.
 */
export interface StaticAuthConfig {
	/** Authentication type */
	type: 'none' | 'bearer' | 'api_key' | 'custom';
	/** Bearer token (used when type is "bearer") */
	token?: string;
	/** API key (used when type is "api_key") */
	apiKey?: string;
	/** Custom headers (used when type is "custom") */
	headers?: Record<string, string>;
}

/**
 * Static authentication provider
 *
 * Provides authentication using static credentials configured at instantiation.
 * Suitable for simple use cases where tokens don't change during the session.
 * Also used internally for backward compatibility with existing endpointConfig.auth.
 *
 * @example
 * ```typescript
 * // Bearer token authentication
 * const authProvider = new StaticAuthProvider({
 *   type: "bearer",
 *   token: "your-jwt-token"
 * });
 *
 * // API key authentication
 * const authProvider = new StaticAuthProvider({
 *   type: "api_key",
 *   apiKey: "your-api-key"
 * });
 *
 * // Custom headers
 * const authProvider = new StaticAuthProvider({
 *   type: "custom",
 *   headers: {
 *     "X-Custom-Auth": "value",
 *     "X-Tenant-ID": "tenant123"
 *   }
 * });
 * ```
 */
export class StaticAuthProvider implements AuthProvider {
	/** Cached authentication headers */
	private headers: Record<string, string>;

	/**
	 * Create a new StaticAuthProvider
	 *
	 * @param config - Static authentication configuration
	 */
	constructor(config: StaticAuthConfig) {
		this.headers = {};

		switch (config.type) {
			case 'bearer':
				if (config.token) {
					this.headers['Authorization'] = `Bearer ${config.token}`;
				}
				break;
			case 'api_key':
				if (config.apiKey) {
					this.headers['X-API-Key'] = config.apiKey;
				}
				break;
			case 'custom':
				if (config.headers) {
					this.headers = { ...config.headers };
				}
				break;
			case 'none':
			default:
				// No headers needed
				break;
		}
	}

	/**
	 * Get authentication headers
	 *
	 * Returns the statically configured headers.
	 *
	 * @returns Promise resolving to authentication headers
	 */
	async getAuthHeaders(): Promise<Record<string, string>> {
		return this.headers;
	}

	/**
	 * Check if authenticated
	 *
	 * Returns true if any auth headers are configured.
	 *
	 * @returns true if headers are configured
	 */
	isAuthenticated(): boolean {
		return Object.keys(this.headers).length > 0;
	}

	/**
	 * Handle unauthorized response
	 *
	 * Static provider cannot refresh tokens, so always returns false.
	 *
	 * @returns Promise resolving to false (cannot refresh)
	 */
	async onUnauthorized(): Promise<boolean> {
		// Static provider cannot refresh tokens
		return false;
	}

	/**
	 * Handle forbidden response
	 *
	 * Static provider has no special handling for 403.
	 */
	async onForbidden(): Promise<void> {
		// No special handling for static provider
	}
}

/**
 * Configuration for callback-based authentication
 *
 * Used to configure CallbackAuthProvider with dynamic token retrieval.
 */
export interface CallbackAuthConfig {
	/**
	 * Function to get the current access token
	 *
	 * Called before each API request to get a fresh token.
	 * Should return null if not authenticated.
	 */
	getToken: () => Promise<string | null>;

	/**
	 * Optional callback when 401 Unauthorized is received
	 *
	 * Can be used to trigger token refresh.
	 *
	 * @returns Promise resolving to true if token was refreshed successfully
	 */
	onUnauthorized?: () => Promise<boolean>;

	/**
	 * Optional callback when 403 Forbidden is received
	 *
	 * Can be used to show permission error UI.
	 */
	onForbidden?: () => Promise<void>;
}

/**
 * Callback-based authentication provider
 *
 * Provides authentication using callback functions for dynamic token retrieval.
 * Ideal for enterprise integrations where the parent application manages auth.
 *
 * @example
 * ```typescript
 * const authProvider = new CallbackAuthProvider({
 *   getToken: async () => {
 *     return authService.getAccessToken();
 *   },
 *   onUnauthorized: async () => {
 *     const refreshed = await authService.refreshToken();
 *     return refreshed;
 *   },
 *   onForbidden: async () => {
 *     showError("You don't have permission to access this resource");
 *   }
 * });
 * ```
 */
export class CallbackAuthProvider implements AuthProvider {
	/** Function to get the current token */
	private getToken: () => Promise<string | null>;

	/** Optional unauthorized callback */
	private onUnauthorizedCallback?: () => Promise<boolean>;

	/** Optional forbidden callback */
	private onForbiddenCallback?: () => Promise<void>;

	/**
	 * Create a new CallbackAuthProvider
	 *
	 * @param config - Callback authentication configuration
	 */
	constructor(config: CallbackAuthConfig) {
		this.getToken = config.getToken;
		this.onUnauthorizedCallback = config.onUnauthorized;
		this.onForbiddenCallback = config.onForbidden;
	}

	/**
	 * Get authentication headers
	 *
	 * Calls the getToken callback to retrieve the current token.
	 *
	 * @returns Promise resolving to authentication headers
	 */
	async getAuthHeaders(): Promise<Record<string, string>> {
		const token = await this.getToken();
		if (token) {
			return { Authorization: `Bearer ${token}` };
		}
		return {};
	}

	/**
	 * Check if authenticated
	 *
	 * For callback-based auth, we assume authenticated if getToken exists.
	 * The actual token validity is checked when making requests.
	 *
	 * @returns true (assumes authenticated, actual check happens on request)
	 */
	isAuthenticated(): boolean {
		// For callback-based auth, we assume authenticated if getToken exists
		// The actual token validity is checked when making requests
		return true;
	}

	/**
	 * Handle unauthorized response
	 *
	 * Calls the onUnauthorized callback if provided.
	 *
	 * @returns Promise resolving to true if auth was refreshed
	 */
	async onUnauthorized(): Promise<boolean> {
		if (this.onUnauthorizedCallback) {
			return this.onUnauthorizedCallback();
		}
		return false;
	}

	/**
	 * Handle forbidden response
	 *
	 * Calls the onForbidden callback if provided.
	 */
	async onForbidden(): Promise<void> {
		if (this.onForbiddenCallback) {
			await this.onForbiddenCallback();
		}
	}
}

/**
 * No-op authentication provider
 *
 * Used when no authentication is required.
 * Provides empty headers and always returns not authenticated.
 */
export class NoAuthProvider implements AuthProvider {
	/**
	 * Get authentication headers
	 *
	 * Returns empty headers (no auth).
	 *
	 * @returns Promise resolving to empty object
	 */
	async getAuthHeaders(): Promise<Record<string, string>> {
		return {};
	}

	/**
	 * Check if authenticated
	 *
	 * Always returns false (no auth configured).
	 *
	 * @returns false
	 */
	isAuthenticated(): boolean {
		return false;
	}
}

/**
 * Create an AuthProvider from legacy endpointConfig.auth configuration
 *
 * Used internally for backward compatibility with existing code that uses
 * the old auth configuration format in EndpointConfig.
 *
 * @internal This function is for internal library use only and is not part of the public API
 * @param authConfig - Legacy auth configuration from EndpointConfig
 * @returns AuthProvider instance
 */
export function createAuthProviderFromLegacyConfig(authConfig?: {
	type: 'none' | 'bearer' | 'api_key' | 'custom';
	token?: string;
	apiKey?: string;
	headers?: Record<string, string>;
}): AuthProvider {
	if (!authConfig || authConfig.type === 'none') {
		return new NoAuthProvider();
	}

	return new StaticAuthProvider(authConfig);
}
