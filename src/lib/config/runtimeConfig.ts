/**
 * Runtime Configuration Service
 *
 * Provides runtime configuration fetched from the server.
 * This allows the application to use environment variables set at deployment
 * time rather than build time.
 */

export interface RuntimeConfig {
	/** Base URL for the FlowDrop API */
	apiBaseUrl: string;
	/** Theme preference */
	theme: "light" | "dark" | "auto";
	/** Request timeout in milliseconds */
	timeout: number;
	/** Authentication type */
	authType: "none" | "bearer" | "api_key" | "custom";
	/** Authentication token */
	authToken?: string;
	/** Application version */
	version: string;
	/** Environment name */
	environment: string;
}

/** Cached runtime configuration */
let cachedConfig: RuntimeConfig | null = null;

/** Cache timestamp */
let cacheTimestamp = 0;

/** Cache duration in milliseconds (5 minutes) */
const CACHE_DURATION = 5 * 60 * 1000;

/**
 * Fetch runtime configuration from the server
 *
 * @param force - Force fetch even if cached
 * @returns Promise resolving to runtime configuration
 */
export async function fetchRuntimeConfig(force = false): Promise<RuntimeConfig> {
	const now = Date.now();

	// Return cached config if available and not expired
	if (!force && cachedConfig && now - cacheTimestamp < CACHE_DURATION) {
		return cachedConfig;
	}

	try {
		const response = await fetch("/api/config");

		if (!response.ok) {
			throw new Error(`Failed to fetch runtime config: ${response.statusText}`);
		}

		const config = (await response.json()) as RuntimeConfig;

		// Update cache
		cachedConfig = config;
		cacheTimestamp = now;

		return config;
	} catch (error) {
		console.error("Failed to fetch runtime configuration:", error);

		// Return default configuration if fetch fails
		const defaultConfig: RuntimeConfig = {
			apiBaseUrl: "/api/flowdrop",
			theme: "auto",
			timeout: 30000,
			authType: "none",
			version: "1.0.0",
			environment: "production",
		};

		// Cache the default config to avoid repeated failed requests
		if (!cachedConfig) {
			cachedConfig = defaultConfig;
			cacheTimestamp = now;
		}

		return cachedConfig || defaultConfig;
	}
}

/**
 * Get runtime configuration synchronously from cache
 *
 * @returns Cached runtime configuration or null if not loaded
 */
export function getRuntimeConfig(): RuntimeConfig | null {
	return cachedConfig;
}

/**
 * Clear the runtime configuration cache
 */
export function clearRuntimeConfigCache(): void {
	cachedConfig = null;
	cacheTimestamp = 0;
}

/**
 * Initialize runtime configuration
 * Should be called once when the application starts
 *
 * @returns Promise resolving to runtime configuration
 */
export async function initRuntimeConfig(): Promise<RuntimeConfig> {
	return fetchRuntimeConfig(true);
}

