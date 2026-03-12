/**
 * Development Configuration Helper
 *
 * This file is ONLY for the demo/development environment.
 * It is NOT part of the library package.
 *
 * The library code (src/lib/) should never import from this file.
 */

import {
  defaultEndpointConfig,
  type EndpointConfig,
} from "$lib/config/endpoints.js";
import {
  fetchRuntimeConfig,
  type RuntimeConfig,
} from "$lib/config/runtimeConfig";

/**
 * Get development API configuration from runtime config
 * This is only used in the demo application, not in the library
 */
export async function getDevEndpointConfig(): Promise<EndpointConfig> {
  try {
    const runtimeConfig = await fetchRuntimeConfig();
    return {
      ...defaultEndpointConfig,
      baseUrl: runtimeConfig.apiBaseUrl,
    };
  } catch (error) {
    console.error("Failed to fetch runtime config, using defaults:", error);
    return defaultEndpointConfig;
  }
}

/**
 * Get development configuration values from runtime config
 */
export async function getDevConfig(): Promise<RuntimeConfig> {
  try {
    return await fetchRuntimeConfig();
  } catch (error) {
    console.error("Failed to fetch runtime config, using defaults:", error);
    // Return default configuration
    return {
      apiBaseUrl: "/api/flowdrop",
      theme: "auto",
      timeout: 30000,
      authType: "none",
      version: "1.0.0",
      environment: "development",
    };
  }
}

/**
 * Get development configuration values synchronously
 * Falls back to environment variables in development
 *
 * WARNING: This should only be used as a last resort fallback.
 * Prefer using server-loaded config from +layout.server.ts
 */
export function getDevConfigSync(): RuntimeConfig {
  // Check if we're in the browser and running Vite dev server
  if (typeof window !== "undefined" && import.meta.env.DEV) {
    return {
      apiBaseUrl:
        import.meta.env.VITE_API_BASE_URL ||
        import.meta.env.VITE_DRUPAL_API_URL ||
        import.meta.env.VITE_FLOWDROP_API_URL ||
        "http://localhost:8080/api/flowdrop", // More explicit default for dev
      theme:
        (import.meta.env.VITE_FLOWDROP_THEME as "light" | "dark" | "auto") ||
        "auto",
      timeout: import.meta.env.VITE_FLOWDROP_TIMEOUT
        ? parseInt(import.meta.env.VITE_FLOWDROP_TIMEOUT)
        : 30000,
      authType:
        (import.meta.env.VITE_FLOWDROP_AUTH_TYPE as
          | "none"
          | "bearer"
          | "api_key"
          | "custom") || "none",
      authToken: import.meta.env.VITE_FLOWDROP_AUTH_TOKEN || undefined,
      version: "1.0.0-dev",
      environment: "development",
    };
  }

  // In production or SSR, return defaults (should use server-loaded config instead)
  return {
    apiBaseUrl: "/api/flowdrop",
    theme: "auto",
    timeout: 30000,
    authType: "none",
    version: "1.0.0",
    environment: "production",
  };
}
