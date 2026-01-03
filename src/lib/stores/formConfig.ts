/**
 * Form Configuration Store
 * 
 * Provides global configuration for form rendering mode.
 * Users can set this during app initialization to choose between json-editor and native modes.
 * 
 * @example
 * ```typescript
 * // In your app initialization (hooks.client.ts or +layout.svelte)
 * import { setFormMode } from '@d34dman/flowdrop';
 * 
 * // Use json-editor (default)
 * setFormMode('json-editor');
 * 
 * // Or use native Svelte forms
 * setFormMode('native');
 * ```
 */

import { writable } from "svelte/store";

/**
 * Form rendering mode type
 */
export type FormMode = "json-editor" | "native";

/**
 * Form configuration interface
 */
export interface FormConfig {
	/** Default mode for form rendering */
	mode: FormMode;
}

/**
 * Default configuration
 */
const defaultConfig: FormConfig = {
	mode: "json-editor"
};

/**
 * Form configuration store
 */
export const formConfig = writable<FormConfig>(defaultConfig);

/**
 * Set the global form rendering mode
 * 
 * @param mode - The form rendering mode ("json-editor" or "native")
 * 
 * @example
 * ```typescript
 * import { setFormMode } from '@d34dman/flowdrop';
 * 
 * // Set to use json-editor
 * setFormMode('json-editor');
 * 
 * // Set to use native forms
 * setFormMode('native');
 * ```
 */
export function setFormMode(mode: FormMode): void {
	formConfig.update((config) => ({
		...config,
		mode
	}));
}

/**
 * Get the current form configuration
 * 
 * @returns The current form configuration
 */
export function getFormConfig(): FormConfig {
	let config: FormConfig = defaultConfig;
	formConfig.subscribe((c) => {
		config = c;
	})();
	return config;
}

