/**
 * Mock for $app/navigation
 * Provides minimal implementations for SvelteKit navigation in library context
 */

// Mock goto function
export const goto = async () => {
	// No-op for library context
	console.warn('Navigation not available in library context');
};

// Mock invalidate function
export const invalidate = async () => {
	// No-op for library context
	return Promise.resolve();
};

// Mock invalidateAll function
export const invalidateAll = async () => {
	// No-op for library context
	return Promise.resolve();
};

// Mock preloadData function
export const preloadData = async () => {
	// No-op for library context
	return Promise.resolve({});
};

// Mock preloadCode function
export const preloadCode = async () => {
	// No-op for library context
	return Promise.resolve();
};
