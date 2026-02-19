/**
 * UISchema Types for FlowDrop Form Layout
 *
 * Inspired by JSON Forms (EclipseSource) UISchema specification.
 * Controls how form fields are arranged, grouped, and displayed
 * without modifying the underlying data schema (ConfigSchema).
 *
 * The UISchema is a separate concern from the data schema:
 * - ConfigSchema defines what data is valid (validation)
 * - UISchema defines how the form is rendered (presentation)
 *
 * @see https://jsonforms.io/docs/uischema
 *
 * @example
 * ```json
 * {
 *   "type": "VerticalLayout",
 *   "elements": [
 *     { "type": "Control", "scope": "#/properties/model" },
 *     {
 *       "type": "Group",
 *       "label": "Advanced Settings",
 *       "collapsible": true,
 *       "defaultOpen": false,
 *       "elements": [
 *         { "type": "Control", "scope": "#/properties/temperature" },
 *         { "type": "Control", "scope": "#/properties/maxTokens" }
 *       ]
 *     }
 *   ]
 * }
 * ```
 */

/**
 * Supported UISchema element types.
 * Designed for future extension with HorizontalLayout, Categorization, etc.
 */
export type UISchemaElementType = 'VerticalLayout' | 'Group' | 'Control';

/**
 * Base interface for all UISchema elements.
 */
export interface UISchemaElementBase {
	/** Discriminator for the element type */
	type: UISchemaElementType;
}

/**
 * Control element - references a single field in the data schema.
 * Uses JSON Pointer syntax for the scope path.
 *
 * @example
 * ```json
 * { "type": "Control", "scope": "#/properties/temperature" }
 * ```
 */
export interface UISchemaControl extends UISchemaElementBase {
	type: 'Control';
	/**
	 * JSON Pointer to the property in the data schema.
	 * Must follow the format: #/properties/<fieldName>
	 */
	scope: string;
	/**
	 * Optional label override. If not provided, the field's
	 * schema title or key is used.
	 */
	label?: string;
}

/**
 * Layout container that arranges its child elements vertically.
 * Can be used as root element or nested inside groups.
 *
 * @example
 * ```json
 * {
 *   "type": "VerticalLayout",
 *   "elements": [
 *     { "type": "Control", "scope": "#/properties/name" },
 *     { "type": "Control", "scope": "#/properties/email" }
 *   ]
 * }
 * ```
 */
export interface UISchemaVerticalLayout extends UISchemaElementBase {
	type: 'VerticalLayout';
	/** Child elements to render vertically */
	elements: UISchemaElement[];
}

/**
 * Group element - renders a fieldset with a label and optional collapsible behavior.
 * Extends the JSON Forms Group with FlowDrop-specific collapse options.
 *
 * @example
 * ```json
 * {
 *   "type": "Group",
 *   "label": "Advanced Settings",
 *   "description": "Fine-tuning parameters",
 *   "collapsible": true,
 *   "defaultOpen": false,
 *   "elements": [
 *     { "type": "Control", "scope": "#/properties/temperature" },
 *     { "type": "Control", "scope": "#/properties/maxTokens" }
 *   ]
 * }
 * ```
 */
export interface UISchemaGroup extends UISchemaElementBase {
	type: 'Group';
	/** Display label for the fieldset legend / summary */
	label: string;
	/** Child elements within the group */
	elements: UISchemaElement[];
	/** Optional description displayed below the label */
	description?: string;
	/**
	 * Whether the group can be collapsed.
	 * When true, renders as `<details>/<summary>`.
	 * @default true
	 */
	collapsible?: boolean;
	/**
	 * Whether the group is initially open (expanded).
	 * Only relevant when collapsible is true.
	 * @default true
	 */
	defaultOpen?: boolean;
}

/**
 * Union type of all supported UISchema elements.
 * This is the recursive type used in elements arrays.
 */
export type UISchemaElement = UISchemaControl | UISchemaVerticalLayout | UISchemaGroup;

/**
 * Type guard: checks if element is a Control
 */
export function isUISchemaControl(element: UISchemaElement): element is UISchemaControl {
	return element.type === 'Control';
}

/**
 * Type guard: checks if element is a VerticalLayout
 */
export function isUISchemaVerticalLayout(
	element: UISchemaElement
): element is UISchemaVerticalLayout {
	return element.type === 'VerticalLayout';
}

/**
 * Type guard: checks if element is a Group
 */
export function isUISchemaGroup(element: UISchemaElement): element is UISchemaGroup {
	return element.type === 'Group';
}
