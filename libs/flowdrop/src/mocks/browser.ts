/**
 * MSW Browser Worker Setup
 * Initializes the service worker for browser-based API mocking
 */

import { setupWorker } from "msw/browser";
import { handlers } from "./handlers/index.js";

/**
 * Create the MSW browser service worker
 * This intercepts fetch requests in the browser and returns mock responses
 */
export const worker = setupWorker(...handlers);

/**
 * Start the MSW browser worker
 * Call this function early in your application to enable API mocking
 *
 * @param options - Optional MSW worker start options
 * @returns Promise that resolves when the worker is ready
 *
 * @example
 * ```ts
 * // In your main entry point (e.g., +layout.svelte)
 * import { startMockServer } from "./mocks/browser";
 *
 * if (import.meta.env.DEV || import.meta.env.VITE_ENABLE_MOCKS === "true") {
 *   await startMockServer();
 * }
 * ```
 */
export async function startMockServer(
  options?: Parameters<typeof worker.start>[0],
) {
  return worker.start({
    // Default options - can be overridden
    onUnhandledRequest: "bypass", // Don't warn about requests we don't handle
    serviceWorker: {
      url: "/mockServiceWorker.js",
    },
    quiet: false, // Set to true to suppress console output
    ...options,
  });
}

/**
 * Stop the MSW browser worker
 * Call this to disable API mocking
 */
export function stopMockServer() {
  worker.stop();
}

/**
 * Reset all handlers to their initial state
 * Useful for testing when you want to clear any runtime handler modifications
 */
export function resetHandlers() {
  worker.resetHandlers();
}

/**
 * Add runtime handlers
 * Useful for testing scenarios where you need to override default behavior
 *
 * @param newHandlers - Additional handlers to add
 */
export function addHandlers(...newHandlers: Parameters<typeof worker.use>) {
  worker.use(...newHandlers);
}
