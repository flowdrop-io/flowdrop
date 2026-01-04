/**
 * Global test setup for FlowDrop
 * 
 * This file runs before all tests and sets up the testing environment.
 */

import { afterEach, vi } from "vitest";

// Note: Install these dependencies when ready to use Testing Library
// import { cleanup } from "@testing-library/svelte";
// import "@testing-library/jest-dom/vitest";

/**
 * Clean up after each test
 * 
 * This ensures that each test starts with a clean slate and prevents
 * test pollution where one test affects another.
 */
afterEach(() => {
	// cleanup(); // Uncomment when @testing-library/svelte is installed
	vi.clearAllMocks();
});

/**
 * Mock window.matchMedia
 * 
 * Many components use matchMedia for responsive design.
 */
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: vi.fn().mockImplementation((query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn()
	}))
});

/**
 * Mock IntersectionObserver
 * 
 * Used by various components for viewport detection.
 */
global.IntersectionObserver = class IntersectionObserver {
	constructor() {}
	disconnect() {}
	observe() {}
	takeRecords() {
		return [];
	}
	unobserve() {}
} as unknown as typeof IntersectionObserver;

/**
 * Mock ResizeObserver
 * 
 * Used by @xyflow/svelte for canvas resizing.
 */
global.ResizeObserver = class ResizeObserver {
	constructor() {}
	disconnect() {}
	observe() {}
	unobserve() {}
} as unknown as typeof ResizeObserver;

/**
 * Suppress console errors in tests
 * 
 * You can temporarily enable them for debugging by commenting this out.
 */
const originalError = console.error;
beforeAll(() => {
	console.error = (...args: unknown[]) => {
		// Filter out known noisy errors
		const message = args[0]?.toString() || "";
		if (
			message.includes("Not implemented: HTMLFormElement.prototype.requestSubmit") ||
			message.includes("Error: Could not parse CSS stylesheet")
		) {
			return;
		}
		originalError.call(console, ...args);
	};
});

afterAll(() => {
	console.error = originalError;
});

/**
 * Extend Vitest matchers
 * 
 * Add custom matchers here if needed.
 */
// expect.extend({
// 	// Add custom matchers here when needed
// });

