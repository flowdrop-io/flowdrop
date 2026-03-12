/**
 * Client-side hooks
 *
 * This file runs before the app starts in the browser.
 * We use it to initialize MSW before any components try to fetch data.
 */

// Initialize MSW mock server if enabled
if (import.meta.env.VITE_MOCK_API === "true") {
  const { startMockServer } = await import("./mocks/index.js");
  await startMockServer();
  console.log("🔶 Mock API server started globally");
}
