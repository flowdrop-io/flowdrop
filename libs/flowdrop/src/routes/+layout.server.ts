import type { LayoutServerLoad } from "./$types";

/**
 * Server-side layout load function
 * Loads runtime configuration on the server and passes it to the client
 * This ensures config is available before any components render
 */
export const load: LayoutServerLoad = async () => {
  // Read environment variables from the server
  const runtimeConfig = {
    apiBaseUrl:
      process.env.FLOWDROP_API_BASE_URL ||
      process.env.API_BASE_URL ||
      "/api/flowdrop",
    theme: (process.env.FLOWDROP_THEME as "light" | "dark" | "auto") || "auto",
    timeout: process.env.FLOWDROP_TIMEOUT
      ? parseInt(process.env.FLOWDROP_TIMEOUT, 10)
      : 30000,
    authType:
      (process.env.FLOWDROP_AUTH_TYPE as
        | "none"
        | "bearer"
        | "api_key"
        | "custom") || "none",
    authToken: process.env.FLOWDROP_AUTH_TOKEN || undefined,
    version: process.env.FLOWDROP_VERSION || "1.0.0",
    environment: process.env.NODE_ENV || "production",
  };

  return {
    runtimeConfig,
  };
};
