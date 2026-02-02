/**
 * Form Field Types
 * Shared types for form components in the FlowDrop workflow editor
 *
 * These types provide a foundation for dynamic form rendering based on JSON Schema
 * and support extensibility for complex field types like arrays and objects.
 */

import type { AutocompleteConfig, VariableSchema, TemplateVariablesConfig } from '$lib/types/index.js';

/**
 * Supported field types for form rendering
 * Aligned with JSON Schema specification (draft-07)
 *
 * Note: 'select' type was removed in favor of using standard JSON Schema patterns:
 * - Use `enum` for simple value lists
 * - Use `oneOf` with `const`/`title` for labeled options
 */
export type FieldType = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';

/**
 * Field format for specialized rendering
 * - multiline: Renders as textarea
 * - hidden: Field is hidden from UI but included in form submission
 * - range: Renders as range slider for numeric values
 * - json: Renders as CodeMirror JSON editor
 * - code: Alias for json, renders as CodeMirror editor
 * - markdown: Renders as SimpleMDE Markdown editor
 * - template: Renders as CodeMirror editor with Twig/Liquid syntax highlighting
 * - autocomplete: Renders as text input with autocomplete suggestions from callback URL
 */
export type FieldFormat =
	| 'multiline'
	| 'hidden'
	| 'range'
	| 'json'
	| 'code'
	| 'markdown'
	| 'template'
	| 'autocomplete'
	| string;

/**
 * Option type for select and checkbox group fields
 *
 * @deprecated Use JSON Schema `oneOf` with `const`/`title` instead for labeled options.
 * This type is kept for backwards compatibility but will be removed in a future version.
 *
 * @example Standard JSON Schema approach:
 * ```json
 * {
 *   "type": "string",
 *   "oneOf": [
 *     { "const": "draft", "title": "Draft" },
 *     { "const": "published", "title": "Published" }
 *   ]
 * }
 * ```
 */
export interface FieldOption {
	/** The value stored when this option is selected */
	value: string;
	/** The display label for this option */
	label: string;
}

/**
 * JSON Schema oneOf item for labeled options
 * This is the standard JSON Schema way to define labeled select options
 *
 * @example
 * ```json
 * {
 *   "type": "string",
 *   "oneOf": [
 *     { "const": "draft", "title": "Draft" },
 *     { "const": "published", "title": "Published" }
 *   ]
 * }
 * ```
 */
export interface OneOfItem {
	/** The constant value for this option (JSON Schema `const` keyword) */
	const: string | number | boolean;
	/** Human-readable label for this option (JSON Schema `title` keyword) */
	title?: string;
	/** Optional description for this option */
	description?: string;
}

/**
 * Base properties shared by all form fields
 */
export interface BaseFieldProps {
	/** Unique identifier for the field (used for id and name attributes) */
	id: string;
	/** Current value of the field */
	value: unknown;
	/** Whether the field is required */
	required?: boolean;
	/** Whether the field is disabled */
	disabled?: boolean;
	/** Placeholder text for input fields */
	placeholder?: string;
	/** ARIA description ID for accessibility */
	ariaDescribedBy?: string;
	/** Callback when the field value changes */
	onChange: (value: unknown) => void;
}

/**
 * Properties for text input fields
 */
export interface TextFieldProps extends BaseFieldProps {
	value: string;
	onChange: (value: string) => void;
}

/**
 * Properties for multiline text fields (textarea)
 */
export interface TextareaFieldProps extends BaseFieldProps {
	value: string;
	/** Number of visible rows */
	rows?: number;
	onChange: (value: string) => void;
}

/**
 * Properties for number input fields
 */
export interface NumberFieldProps extends BaseFieldProps {
	value: number | string;
	/** Minimum allowed value */
	min?: number;
	/** Maximum allowed value */
	max?: number;
	/** Step increment for the input */
	step?: number;
	onChange: (value: number | string) => void;
}

/**
 * Properties for boolean toggle fields
 */
export interface ToggleFieldProps extends BaseFieldProps {
	value: boolean;
	/** Label shown when toggle is on */
	onLabel?: string;
	/** Label shown when toggle is off */
	offLabel?: string;
	onChange: (value: boolean) => void;
}

/**
 * Properties for range slider fields
 */
export interface RangeFieldProps extends BaseFieldProps {
	value: number | string;
	/** Minimum allowed value */
	min?: number;
	/** Maximum allowed value */
	max?: number;
	/** Step increment for the slider */
	step?: number;
	onChange: (value: number) => void;
}

/**
 * Properties for select dropdown fields
 */
export interface SelectFieldProps extends BaseFieldProps {
	value: string;
	/** Available options for selection */
	options: FieldOption[] | string[];
	onChange: (value: string) => void;
}

/**
 * Properties for checkbox group fields (multiple selection)
 */
export interface CheckboxGroupFieldProps extends BaseFieldProps {
	value: string[];
	/** Available options for selection */
	options: string[];
	onChange: (value: string[]) => void;
}

/**
 * Properties for array fields (dynamic lists)
 */
export interface ArrayFieldProps extends BaseFieldProps {
	value: unknown[];
	/** Schema for array items */
	itemSchema: FieldSchema;
	/** Minimum number of items required */
	minItems?: number;
	/** Maximum number of items allowed */
	maxItems?: number;
	/** Label for the add button */
	addLabel?: string;
	onChange: (value: unknown[]) => void;
}

/**
 * Properties for code editor fields (CodeMirror-based)
 */
export interface CodeEditorFieldProps extends BaseFieldProps {
	/** Current value - can be string (raw JSON) or object */
	value: unknown;
	/** Whether to use dark theme */
	darkTheme?: boolean;
	/** Editor height in pixels or CSS value */
	height?: string;
	/** Whether to auto-format JSON on blur */
	autoFormat?: boolean;
	/** Callback when value changes */
	onChange: (value: unknown) => void;
}

/**
 * Properties for markdown editor fields (SimpleMDE-based)
 */
export interface MarkdownEditorFieldProps extends BaseFieldProps {
	/** Current value (markdown string) */
	value: string;
	/** Editor height in pixels or CSS value */
	height?: string;
	/** Whether to show the toolbar */
	showToolbar?: boolean;
	/** Whether to show the status bar */
	showStatusBar?: boolean;
	/** Whether to enable spell checking */
	spellChecker?: boolean;
	/** Callback when value changes */
	onChange: (value: string) => void;
}

/**
 * Properties for template editor fields (CodeMirror with Twig/Liquid syntax)
 */
export interface TemplateEditorFieldProps extends BaseFieldProps {
	/** Current template value */
	value: string;
	/** Whether to use dark theme */
	darkTheme?: boolean;
	/** Editor height in pixels or CSS value */
	height?: string;
	/**
	 * Configuration for template variable autocomplete.
	 * Controls which variables are available and how they are displayed.
	 */
	variables?: TemplateVariablesConfig;
	/**
	 * Variable schema for advanced autocomplete with nested drilling.
	 * When provided, enables dot notation (user.name) and array access (items[0]).
	 * @deprecated Use `variables.schema` instead
	 */
	variableSchema?: VariableSchema;
	/** Placeholder variable example for the hint */
	placeholderExample?: string;
	/** Callback when value changes */
	onChange: (value: string) => void;
}

/**
 * Properties for autocomplete fields
 * Fetches suggestions from a callback URL with support for debouncing and keyboard navigation
 */
export interface AutocompleteFieldProps extends BaseFieldProps {
	/** Current value (single string or array of strings for multiple selection) */
	value: string | string[];
	/** Autocomplete configuration from schema */
	autocomplete: AutocompleteConfig;
	/** Base URL for resolving relative callback URLs */
	baseUrl?: string;
	/** Callback when value changes */
	onChange: (value: string | string[]) => void;
}

/**
 * Autocomplete configuration imported from main types
 * Re-exported here for convenience
 */
export type { AutocompleteConfig } from '$lib/types/index.js';

/**
 * Field schema definition derived from JSON Schema property
 * Used to determine which field component to render
 *
 * FlowDrop follows JSON Schema draft-07 specification for field definitions.
 * For select/dropdown fields, use standard JSON Schema patterns:
 * - `enum` for simple value lists (no labels)
 * - `oneOf` with `const`/`title` for labeled options
 */
export interface FieldSchema {
	/** The field type from JSON Schema */
	type: FieldType | string;
	/** Display title for the field */
	title?: string;
	/** Description for help text */
	description?: string;
	/** Default value for the field */
	default?: unknown;
	/** Enum values for select/checkbox fields (simple values without labels) */
	enum?: unknown[];
	/**
	 * JSON Schema oneOf for labeled options (standard approach)
	 * Use this instead of the deprecated `options` property
	 *
	 * @example
	 * ```json
	 * {
	 *   "type": "string",
	 *   "oneOf": [
	 *     { "const": "draft", "title": "Draft" },
	 *     { "const": "published", "title": "Published" }
	 *   ]
	 * }
	 * ```
	 */
	oneOf?: OneOfItem[];
	/** Whether multiple values can be selected (for enum/oneOf) */
	multiple?: boolean;
	/** Format hint for specialized rendering */
	format?: FieldFormat;
	/**
	 * Options for select type fields
	 * @deprecated Use JSON Schema `oneOf` with `const`/`title` instead.
	 * This property is kept for backwards compatibility but will be removed in a future version.
	 */
	options?: FieldOption[];
	/** Placeholder text */
	placeholder?: string;
	/** Minimum value for numbers */
	minimum?: number;
	/** Maximum value for numbers */
	maximum?: number;
	/** Step increment for number/range inputs */
	step?: number;
	/** Minimum length for strings */
	minLength?: number;
	/** Maximum length for strings */
	maxLength?: number;
	/** Validation pattern for strings */
	pattern?: string;
	/** Item schema for array fields */
	items?: FieldSchema;
	/** Minimum number of items for array fields */
	minItems?: number;
	/** Maximum number of items for array fields */
	maxItems?: number;
	/** Property schemas for object fields (future use) */
	properties?: Record<string, FieldSchema>;
	/** Required properties for object fields (future use) */
	required?: string[];
	/** Autocomplete configuration for fetching suggestions from callback URL */
	autocomplete?: AutocompleteConfig;
	/**
	 * Whether the field is read-only (JSON Schema readOnly keyword).
	 * When true, the field is displayed but cannot be edited.
	 */
	readOnly?: boolean;
	/**
	 * Configuration for template variable autocomplete.
	 * Controls which input ports provide variables and how they are displayed.
	 *
	 * @example
	 * ```json
	 * {
	 *   "type": "string",
	 *   "format": "template",
	 *   "variables": {
	 *     "ports": ["data", "context"],
	 *     "showHints": true
	 *   }
	 * }
	 * ```
	 */
	variables?: TemplateVariablesConfig;
	/** Allow additional properties not defined by the schema */
	[key: string]: unknown;
}

/**
 * Props for the FormField factory component
 * Renders the appropriate field component based on schema
 */
export interface FormFieldFactoryProps {
	/** Unique key/id for the field */
	fieldKey: string;
	/** Field schema definition */
	schema: FieldSchema;
	/** Current field value */
	value: unknown;
	/** Whether the field is required */
	required?: boolean;
	/** Animation delay index for staggered animations */
	animationIndex?: number;
	/** Callback when the field value changes */
	onChange: (value: unknown) => void;
}

/**
 * Props for the FormFieldWrapper component
 * Provides label, description, and layout for field content
 */
export interface FormFieldWrapperProps {
	/** Field identifier for label association */
	id: string;
	/** Display label text */
	label: string;
	/** Whether the field is required */
	required?: boolean;
	/** Description/help text for the field */
	description?: string;
	/** Animation delay in milliseconds */
	animationDelay?: number;
}

/**
 * Type guard to check if options are FieldOption objects
 */
export function isFieldOptionArray(options: FieldOption[] | string[]): options is FieldOption[] {
	return options.length > 0 && typeof options[0] === 'object' && 'value' in options[0];
}

/**
 * Type guard to check if items are OneOfItem objects (JSON Schema oneOf pattern)
 */
export function isOneOfArray(items: unknown[]): items is OneOfItem[] {
	return (
		items.length > 0 && typeof items[0] === 'object' && items[0] !== null && 'const' in items[0]
	);
}

/**
 * Convert JSON Schema oneOf items to FieldOption format
 * This bridges the standard oneOf pattern to the internal FieldOption structure
 *
 * @param oneOfItems - Array of JSON Schema oneOf items with const/title
 * @returns Array of FieldOption objects
 */
export function oneOfToOptions(oneOfItems: OneOfItem[]): FieldOption[] {
	return oneOfItems.map((item) => ({
		value: String(item.const),
		label: item.title ?? String(item.const)
	}));
}

/**
 * Normalize options to FieldOption format
 * Handles multiple input formats for consistent internal handling:
 * - JSON Schema oneOf items (standard) -> converted to FieldOption
 * - FieldOption array (legacy) -> passed through
 * - String array -> converted to FieldOption
 *
 * @param options - Options in various formats
 * @returns Normalized FieldOption array
 */
export function normalizeOptions(
	options: FieldOption[] | string[] | OneOfItem[] | unknown[]
): FieldOption[] {
	if (!options || options.length === 0) {
		return [];
	}

	// Handle JSON Schema oneOf pattern (standard)
	if (isOneOfArray(options)) {
		return oneOfToOptions(options);
	}

	// Handle FieldOption array (legacy, deprecated)
	if (isFieldOptionArray(options as FieldOption[] | string[])) {
		return options as FieldOption[];
	}

	// Handle string array (simple enum values)
	return (options as string[]).map((opt) => ({
		value: String(opt),
		label: String(opt)
	}));
}

/**
 * Get options from a schema, handling both oneOf (standard) and options (legacy) patterns
 * Prefers oneOf if both are present
 *
 * @param schema - Field schema that may contain oneOf or options
 * @returns Normalized FieldOption array
 */
export function getSchemaOptions(schema: FieldSchema): FieldOption[] {
	// Prefer standard oneOf pattern
	if (schema.oneOf && schema.oneOf.length > 0) {
		return oneOfToOptions(schema.oneOf);
	}

	// Fall back to deprecated options property
	if (schema.options && schema.options.length > 0) {
		return schema.options;
	}

	return [];
}

/**
 * Props interface for the SchemaForm component
 *
 * SchemaForm is a standalone form generator that creates dynamic forms
 * from JSON Schema definitions without requiring FlowDrop workflow nodes.
 *
 * @example
 * ```typescript
 * const props: SchemaFormProps = {
 *   schema: {
 *     type: "object",
 *     properties: {
 *       name: { type: "string", title: "Name" },
 *       age: { type: "number", title: "Age" }
 *     },
 *     required: ["name"]
 *   },
 *   values: { name: "John", age: 30 },
 *   onChange: (values) => console.log("Changed:", values),
 *   showActions: true,
 *   onSave: (values) => console.log("Saved:", values)
 * };
 * ```
 */
export interface SchemaFormProps {
	/**
	 * JSON Schema definition for the form.
	 * Should follow JSON Schema draft-07 format with type: "object".
	 * Properties define the form fields to render.
	 */
	schema: {
		type: 'object';
		properties: Record<string, FieldSchema>;
		required?: string[];
		additionalProperties?: boolean;
	};

	/**
	 * Current form values as key-value pairs.
	 * Keys should correspond to properties defined in the schema.
	 * Missing values will use schema defaults if defined.
	 */
	values?: Record<string, unknown>;

	/**
	 * Callback fired whenever any field value changes.
	 * Receives the complete updated values object.
	 * Use this for controlled form state management.
	 * @param values - Updated form values
	 */
	onChange?: (values: Record<string, unknown>) => void;

	/**
	 * Whether to display Save and Cancel action buttons.
	 * When false, the form operates in "inline" mode without buttons.
	 * @default false
	 */
	showActions?: boolean;

	/**
	 * Label text for the save button.
	 * Only used when showActions is true.
	 * @default "Save"
	 */
	saveLabel?: string;

	/**
	 * Label text for the cancel button.
	 * Only used when showActions is true.
	 * @default "Cancel"
	 */
	cancelLabel?: string;

	/**
	 * Callback fired when the Save button is clicked.
	 * Receives the final form values after collecting from DOM.
	 * @param values - Final form values
	 */
	onSave?: (values: Record<string, unknown>) => void;

	/**
	 * Callback fired when the Cancel button is clicked.
	 * Use this to reset form state or close modals.
	 */
	onCancel?: () => void;

	/**
	 * Whether the form is in a loading state.
	 * Disables all inputs and shows a loading spinner on the save button.
	 * @default false
	 */
	loading?: boolean;

	/**
	 * Whether the form is disabled.
	 * Prevents all interactions including save.
	 * @default false
	 */
	disabled?: boolean;

	/**
	 * Custom CSS class to apply to the form container.
	 * Use for additional styling customization.
	 */
	class?: string;

	/**
	 * Authentication provider for autocomplete fields.
	 * Used to add authentication headers when fetching suggestions from callback URLs.
	 */
	authProvider?: import('$lib/types/index.js').AuthProvider;

	/**
	 * Base URL for resolving relative autocomplete callback URLs.
	 * @default ""
	 */
	baseUrl?: string;
}
