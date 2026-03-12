/**
 * Fetch authentication utilities
 *
 * Shared logic for building HTTP headers with authentication.
 * Used by components that make authenticated API requests (e.g., FormAutocomplete).
 *
 * @module utils/fetchWithAuth
 */

import type { AuthProvider } from "$lib/types/auth.js";

/**
 * Build fetch headers with optional authentication
 *
 * Constructs standard JSON request headers and merges in authentication
 * headers from the provided AuthProvider, if available.
 *
 * @param authProvider - Optional auth provider to get headers from
 * @returns Promise resolving to a complete headers object
 *
 * @example
 * ```typescript
 * const headers = await buildFetchHeaders(authProvider);
 * const response = await fetch(url, { headers });
 * ```
 */
export async function buildFetchHeaders(
  authProvider?: AuthProvider,
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (authProvider) {
    const authHeaders = await authProvider.getAuthHeaders();
    Object.assign(headers, authHeaders);
  }

  return headers;
}
