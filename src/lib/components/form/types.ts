/**
 * Form Field Types
 * Shared types for form components in the FlowDrop workflow editor
 *
 * These types provide a foundation for dynamic form rendering based on JSON Schema
 * and support extensibility for complex field types like arrays and objects.
 */

/**
 * Supported field types for form rendering
 * Can be extended to support complex types like 'array' and 'object'
 */
export type FieldType =
    | "string"
    | "number"
    | "integer"
    | "boolean"
    | "select"
    | "array"
    | "object";

/**
 * Field format for specialized rendering
 * - multiline: Renders as textarea
 * - hidden: Field is hidden from UI but included in form submission
 */
export type FieldFormat = "multiline" | "hidden" | string;

/**
 * Option type for select and checkbox group fields
 */
export interface FieldOption {
    /** The value stored when this option is selected */
    value: string;
    /** The display label for this option */
    label: string;
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
 * Field schema definition derived from JSON Schema property
 * Used to determine which field component to render
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
    /** Enum values for select/checkbox fields */
    enum?: unknown[];
    /** Whether multiple values can be selected */
    multiple?: boolean;
    /** Format hint for specialized rendering */
    format?: FieldFormat;
    /** Options for select type fields (alternative to enum) */
    options?: FieldOption[];
    /** Placeholder text */
    placeholder?: string;
    /** Minimum value for numbers */
    minimum?: number;
    /** Maximum value for numbers */
    maximum?: number;
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
    return options.length > 0 && typeof options[0] === "object" && "value" in options[0];
}

/**
 * Normalize options to FieldOption format
 * Converts string arrays to FieldOption arrays for consistent handling
 */
export function normalizeOptions(options: FieldOption[] | string[] | unknown[]): FieldOption[] {
    if (!options || options.length === 0) {
        return [];
    }

    if (isFieldOptionArray(options as FieldOption[] | string[])) {
        return options as FieldOption[];
    }

    return (options as string[]).map((opt) => ({
        value: String(opt),
        label: String(opt)
    }));
}

