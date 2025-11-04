/**
 * Mock for $app/forms
 * Provides minimal implementations for SvelteKit forms in library context
 */

// Mock enhance function
export const enhance = (form, options = {}) => {
	return (event) => {
		event.preventDefault();
		// Basic form handling for library context
		if (options.onResult) {
			options.onResult({ type: 'success' });
		}
	};
};

// Mock applyAction function
export const applyAction = (action) => {
	// No-op for library context
	return action;
};
