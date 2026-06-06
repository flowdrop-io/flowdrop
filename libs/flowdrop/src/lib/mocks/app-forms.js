/**
 * Mock for $app/forms
 * Provides minimal implementations for SvelteKit forms in library context
 */

/**
 * Mock enhance function
 * @param {HTMLFormElement} _form
 * @param {{ onResult?: (result: { type: string }) => void }} [options]
 */
export const enhance = (_form, options = {}) => {
  /** @param {SubmitEvent} event */
  return (event) => {
    event.preventDefault();
    // Basic form handling for library context
    if (options.onResult) {
      options.onResult({ type: 'success' });
    }
  };
};

/**
 * Mock applyAction function
 * @param {unknown} action
 */
export const applyAction = (action) => {
  // No-op for library context
  return action;
};
