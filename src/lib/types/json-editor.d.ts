/**
 * TypeScript type definitions for @json-editor/json-editor
 * 
 * This provides minimal type safety for the JSON Editor library.
 * Only includes the features we use in SchemaFormAdapter.
 */

export interface JSONEditorOptions {
	/** The JSON Schema to use for the form */
	schema: Record<string, unknown>;
	/** The starting value for the form */
	startval?: Record<string, unknown>;
	/** The theme to use (e.g., "barebones", "html", "bootstrap4") */
	theme?: string;
	/** The icon library to use (e.g., "fontawesome5") */
	iconlib?: string;
	/** Whether to show errors */
	show_errors?: "interaction" | "change" | "always" | "never";
	/** Disable form editing */
	disable_edit_json?: boolean;
	/** Disable properties button */
	disable_properties?: boolean;
	/** Disable array add/delete buttons */
	disable_array_add?: boolean;
	disable_array_delete?: boolean;
	disable_array_reorder?: boolean;
	/** Remove all collapse buttons */
	disable_collapse?: boolean;
	/** Remove all required properties */
	required_by_default?: boolean;
	/** Display required properties first */
	display_required_only?: boolean;
	/** Remove buttons */
	no_additional_properties?: boolean;
	/** Keep oneof editor open by default */
	keep_oneof_values?: boolean;
	/** Prompt before removing */
	prompt_before_delete?: boolean;
	/** Custom validation */
	custom_validators?: Array<(schema: Record<string, unknown>, value: unknown, path: string) => Array<{
		path: string;
		property: string;
		message: string;
	}>>;
	/** Callback templates */
	callbacks?: {
		template?: Record<string, (editor: JSONEditor, e: unknown) => string>;
	};
}

export interface ValidationError {
	path: string;
	property: string;
	message: string;
}

/**
 * JSONEditor class interface
 */
export interface JSONEditor {
	/**
	 * Get the current value from the editor
	 */
	getValue(): Record<string, unknown>;

	/**
	 * Set the value in the editor
	 */
	setValue(value: Record<string, unknown>): void;

	/**
	 * Validate the current value
	 */
	validate(): ValidationError[];

	/**
	 * Destroy the editor instance and clean up
	 */
	destroy(): void;

	/**
	 * Enable the editor
	 */
	enable(): void;

	/**
	 * Disable the editor
	 */
	disable(): void;

	/**
	 * Get a specific editor instance by path
	 */
	getEditor(path: string): JSONEditor | null;

	/**
	 * Watch a path for changes
	 */
	watch(path: string, callback: () => void): void;

	/**
	 * Unwatch a path
	 */
	unwatch(path: string, callback: () => void): void;

	/**
	 * Register a custom validator
	 */
	registerCustomValidator(validator: (schema: Record<string, unknown>, value: unknown, path: string) => ValidationError[]): void;
}

/**
 * JSONEditor constructor interface
 */
export interface JSONEditorConstructor {
	new (element: HTMLElement, options: JSONEditorOptions): JSONEditor;

	/**
	 * Default options and settings
	 */
	defaults: {
		options: Partial<JSONEditorOptions>;
		languages: Record<string, Record<string, string>>;
		language: string;
		callbacks: {
			template?: Record<string, (editor: JSONEditor, e: unknown) => string>;
		};
		custom_validators: Array<(schema: Record<string, unknown>, value: unknown, path: string) => ValidationError[]>;
		resolvers: Array<(schema: Record<string, unknown>) => string | undefined>;
	};
}

declare module "@json-editor/json-editor" {
	const JSONEditor: JSONEditorConstructor;
	export default JSONEditor;
}

