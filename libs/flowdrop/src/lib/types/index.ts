/**
 * Core types for the Workflow Library
 */

import type { Node, Edge, XYPosition } from '@xyflow/svelte';
import { ConnectionLineType } from '@xyflow/svelte';
import type { EndpointConfig } from '../config/endpoints.js';

/**
 * Built-in node categories that ship with FlowDrop.
 * These categories have predefined icons, colors, and display names.
 */
export type BuiltinNodeCategory =
	| 'triggers'
	| 'inputs'
	| 'outputs'
	| 'prompts'
	| 'models'
	| 'processing'
	| 'logic'
	| 'data'
	| 'tools'
	| 'helpers'
	| 'vector stores'
	| 'embeddings'
	| 'memories'
	| 'agents'
	| 'ai'
	| 'interrupts'
	| 'bundles';

/**
 * Node category for organizing nodes in the sidebar.
 * Includes all built-in categories plus any custom string.
 * Custom categories can be defined via the `/categories` API endpoint.
 *
 * @example
 * ```typescript
 * // Built-in category
 * const cat: NodeCategory = 'triggers';
 *
 * // Custom category
 * const custom: NodeCategory = 'my-custom-category';
 * ```
 */
export type NodeCategory = BuiltinNodeCategory | (string & Record<never, never>);

/**
 * Built-in workflow format identifiers that ship with FlowDrop.
 */
export type BuiltinWorkflowFormat = 'flowdrop' | 'agentspec';

/**
 * Workflow format identifier.
 * Determines sidebar node filtering and export behavior.
 * Includes built-in formats plus any custom string for third-party adapters.
 */
export type WorkflowFormat = BuiltinWorkflowFormat | (string & Record<never, never>);

/**
 * Default workflow format used when none is specified.
 */
export const DEFAULT_WORKFLOW_FORMAT: WorkflowFormat = 'flowdrop';

/**
 * Category definition with metadata for display and organization.
 * Fetched from the `/categories` API endpoint or provided as defaults.
 */
export interface CategoryDefinition {
	/** Machine name / unique identifier */
	name: string;
	/** Display label shown in UI */
	label: string;
	/** Icon identifier (e.g. 'mdi:brain') */
	icon?: string;
	/** Color token or CSS value (e.g. 'var(--fd-node-purple)') */
	color?: string;
	/** Category description */
	description?: string;
	/** Sort weight for ordering (lower = earlier) */
	weight?: number;
}

/**
 * Port data type configuration
 */
export interface PortDataTypeConfig {
	/** Unique identifier for the data type */
	id: string;
	/** Display name for the data type */
	name: string;
	/** Description of the data type */
	description?: string;
	/** Color for the data type (CSS color value) */
	color: string;
	/** Category grouping for the data type */
	category?: string;
	/** Alternative names/aliases for this data type */
	aliases?: string[];
	/** Whether this data type is enabled */
	enabled?: boolean;
}

/**
 * Port compatibility rule configuration
 * Simple rule: sourceType can connect TO targetType
 */
export interface PortCompatibilityRule {
	/** Source data type ID (what you're connecting FROM) */
	from: string;
	/** Target data type ID (what you're connecting TO) */
	to: string;
	/** Optional description of why this connection is allowed */
	description?: string;
}

/**
 * Complete port configuration system
 */
export interface PortConfig {
	/** Available data types */
	dataTypes: PortDataTypeConfig[];
	/** Compatibility rules between data types */
	compatibilityRules: PortCompatibilityRule[];
	/** Default data type to use when none specified */
	defaultDataType: string;
	/** Version of the port configuration */
	version?: string;
}

/**
 * Node data type - now dynamic based on configuration
 * Will be string literals of available data type IDs
 */
export type NodeDataType = string;

/**
 * Node port configuration
 */
export interface NodePort {
	id: string;
	name: string;
	type: 'input' | 'output' | 'metadata';
	dataType: NodeDataType;
	required?: boolean;
	description?: string;
	defaultValue?: unknown;
	/**
	 * Optional JSON Schema describing the structure of data on this port.
	 * Used for template variable autocomplete to drill into nested properties.
	 */
	schema?: OutputSchema | InputSchema;
}

/**
 * Absolute position of a port handle in canvas space.
 * Used by proximity connect and other features that need port positions.
 */
export interface PortCoordinate {
	/** Absolute X position in canvas space */
	x: number;
	/** Absolute Y position in canvas space */
	y: number;
	/** Handle ID in format: ${nodeId}-${direction}-${portId} */
	handleId: string;
	/** The node this port belongs to */
	nodeId: string;
	/** Port direction */
	direction: 'input' | 'output';
	/** Port data type for compatibility checks */
	dataType: string;
}

/** Map of handle IDs to their absolute canvas coordinates */
export type PortCoordinateMap = Map<string, PortCoordinate>;

/**
 * Dynamic port configuration for user-defined inputs/outputs
 * These are defined in the node's config and allow users to create
 * custom input/output handles at runtime similar to gateway branches
 */
export interface DynamicPort {
	/** Unique identifier for the port (used for handle IDs and connections) */
	name: string;
	/** Display label shown in the UI */
	label: string;
	/** Description of what this port accepts/provides */
	description?: string;
	/** Data type for the port (affects color and connection validation) */
	dataType: NodeDataType;
	/** Whether this port is required for execution */
	required?: boolean;
}

/**
 * Branch configuration for gateway nodes
 *
 * Branches define conditional output paths in gateway/switch nodes.
 * Each branch creates an output handle that can be connected to downstream nodes.
 * Branches are stored in `config.branches` array and support dynamic addition/removal
 * through the node configuration panel.
 *
 * @example
 * ```typescript
 * const branches: Branch[] = [
 *   { name: "high", label: "High Priority", condition: "priority > 8" },
 *   { name: "medium", label: "Medium Priority", condition: "priority >= 4" },
 *   { name: "default", label: "Default", isDefault: true }
 * ];
 * ```
 */
export interface Branch {
	/** Unique identifier for the branch (used as handle ID and for connections) */
	name: string;
	/** Display label shown in the UI (optional, defaults to name) */
	label?: string;
	/** Description of when this branch is activated */
	description?: string;
	/** Optional value associated with the branch (e.g., for Switch matching) */
	value?: string;
	/** Optional condition expression for this branch */
	condition?: string;
	/** Whether this is the default/fallback branch */
	isDefault?: boolean;
}

/**
 * Convert a DynamicPort to a NodePort
 * @param port - The dynamic port configuration
 * @param portType - Whether this is an input or output port
 * @returns A NodePort compatible with the rendering system
 */
export function dynamicPortToNodePort(port: DynamicPort, portType: 'input' | 'output'): NodePort {
	return {
		id: port.name,
		name: port.label,
		type: portType,
		dataType: port.dataType,
		required: port.required ?? false,
		description: port.description
	};
}

/**
 * Built-in node types for explicit component rendering.
 * These are the node types that ship with FlowDrop.
 */
export type BuiltinNodeType =
	| 'note'
	| 'simple'
	| 'square'
	| 'tool'
	| 'gateway'
	| 'terminal'
	| 'default';

/**
 * Node type for component rendering.
 * Includes built-in types and allows custom registered types.
 *
 * Built-in types: note, simple, square, tool, gateway, terminal, default
 * Custom types: Any string registered via nodeComponentRegistry
 *
 * @example
 * ```typescript
 * // Built-in type
 * const type: NodeType = "simple";
 *
 * // Custom registered type
 * const customType: NodeType = "mylib:fancy";
 * ```
 */
export type NodeType = BuiltinNodeType | (string & Record<never, never>);

/**
 * HTTP method types for dynamic schema endpoints
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH';

/**
 * Autocomplete configuration for form fields
 *
 * Defines how autocomplete suggestions are fetched from a callback URL.
 * Supports both "on-type" (debounced search) and "on-focus" (load all options) modes.
 *
 * @example
 * ```typescript
 * const autocompleteConfig: AutocompleteConfig = {
 *   url: "/api/users/search",
 *   queryParam: "q",
 *   minChars: 2,
 *   debounceMs: 300,
 *   fetchOnFocus: true,
 *   labelField: "name",
 *   valueField: "id",
 *   allowFreeText: false
 * };
 * ```
 */
export interface AutocompleteConfig {
	/**
	 * The callback URL to fetch autocomplete suggestions from.
	 * Can be relative (resolved against API base URL) or absolute.
	 */
	url: string;

	/**
	 * Query parameter name to pass the search term.
	 * @default "q"
	 */
	queryParam?: string;

	/**
	 * Minimum number of characters before fetching suggestions.
	 * Set to 0 to fetch immediately on focus (when fetchOnFocus is true).
	 * @default 0
	 */
	minChars?: number;

	/**
	 * Debounce delay in milliseconds before fetching suggestions.
	 * Prevents excessive API calls while typing.
	 * @default 300
	 */
	debounceMs?: number;

	/**
	 * Whether to fetch all options when the field is focused.
	 * When true, an empty query is sent on focus to load initial options.
	 * @default false
	 */
	fetchOnFocus?: boolean;

	/**
	 * The field name in the response objects to use as the display label.
	 * @default "label"
	 */
	labelField?: string;

	/**
	 * The field name in the response objects to use as the stored value.
	 * @default "value"
	 */
	valueField?: string;

	/**
	 * Whether to allow values that are not in the suggestions list.
	 * When true, users can enter and submit any text.
	 * When false, only values from suggestions are accepted.
	 * @default false
	 */
	allowFreeText?: boolean;

	/**
	 * Whether to allow multiple selections.
	 * When true, users can select multiple values displayed as tags.
	 * When false, only a single value can be selected.
	 * @default false
	 */
	multiple?: boolean;
}

/**
 * Dynamic schema endpoint configuration
 * Used when the config schema needs to be fetched at runtime from a REST endpoint
 *
 * @example
 * ```typescript
 * const schemaEndpoint: DynamicSchemaEndpoint = {
 *   url: "/api/nodes/{nodeTypeId}/schema",
 *   method: "GET",
 *   headers: { "X-Custom-Header": "value" },
 *   parameterMapping: {
 *     nodeTypeId: "metadata.id",
 *     instanceId: "id"
 *   }
 * };
 * ```
 */
export interface DynamicSchemaEndpoint {
	/**
	 * The URL to fetch the schema from.
	 * Supports template variables in curly braces (e.g., "/api/nodes/{nodeTypeId}/schema")
	 * Variables are resolved from node metadata, config, or instance data.
	 */
	url: string;

	/**
	 * HTTP method to use for fetching the schema.
	 * @default "GET"
	 */
	method?: HttpMethod;

	/**
	 * Custom headers to include in the request
	 */
	headers?: Record<string, string>;

	/**
	 * Maps template variables to their source paths.
	 * Keys are variable names used in the URL, values are dot-notation paths
	 * to resolve from the node context (e.g., "metadata.id", "config.apiKey", "id")
	 */
	parameterMapping?: Record<string, string>;

	/**
	 * Request body for POST/PUT/PATCH methods.
	 * Can include template variables like the URL.
	 */
	body?: Record<string, unknown>;

	/**
	 * Timeout in milliseconds for the schema fetch request
	 * @default 10000
	 */
	timeout?: number;

	/**
	 * Whether to cache the fetched schema per node instance
	 * @default true
	 */
	cacheSchema?: boolean;
}

/**
 * External edit link configuration
 * Used when the node configuration should be handled by an external 3rd party form
 *
 * @example
 * ```typescript
 * const editLink: ExternalEditLink = {
 *   url: "https://admin.example.com/nodes/{nodeTypeId}/edit/{instanceId}",
 *   label: "Configure in Admin Panel",
 *   parameterMapping: {
 *     nodeTypeId: "metadata.id",
 *     instanceId: "id"
 *   },
 *   openInNewTab: true
 * };
 * ```
 */
export interface ExternalEditLink {
	/**
	 * The URL to the external edit form.
	 * Supports template variables in curly braces (e.g., "/admin/nodes/{nodeTypeId}/edit")
	 * Variables are resolved from node metadata, config, or instance data.
	 */
	url: string;

	/**
	 * Display label for the edit link button
	 * @default "Configure Externally"
	 */
	label?: string;

	/**
	 * Icon to display alongside the label (Iconify icon name)
	 * @default "heroicons:arrow-top-right-on-square"
	 */
	icon?: string;

	/**
	 * Maps template variables to their source paths.
	 * Keys are variable names used in the URL, values are dot-notation paths
	 * to resolve from the node context (e.g., "metadata.id", "config.apiKey", "id")
	 */
	parameterMapping?: Record<string, string>;

	/**
	 * Whether to open the link in a new tab
	 * @default true
	 */
	openInNewTab?: boolean;

	/**
	 * Optional tooltip/description for the link
	 */
	description?: string;

	/**
	 * Callback URL parameter name for FlowDrop to receive updates
	 * If set, the external form should redirect back with config updates
	 */
	callbackUrlParam?: string;
}

/**
 * Admin/Edit configuration for nodes with dynamic or external configuration
 * Used when the config schema cannot be determined at workflow load time
 * or when configuration is handled by a 3rd party system.
 *
 * @example
 * ```typescript
 * // Option 1: External edit link only (opens external form in new tab)
 * const configEdit: ConfigEditOptions = {
 *   externalEditLink: {
 *     url: "https://admin.example.com/configure/{nodeId}",
 *     label: "Open Configuration Portal"
 *   }
 * };
 *
 * // Option 2: Dynamic schema (fetches schema from REST endpoint)
 * const configEdit: ConfigEditOptions = {
 *   dynamicSchema: {
 *     url: "/api/nodes/{nodeTypeId}/schema",
 *     method: "GET"
 *   }
 * };
 *
 * // Option 3: Both (user can choose)
 * const configEdit: ConfigEditOptions = {
 *   externalEditLink: {
 *     url: "https://admin.example.com/configure/{nodeId}",
 *     label: "Advanced Configuration"
 *   },
 *   dynamicSchema: {
 *     url: "/api/nodes/{nodeTypeId}/schema"
 *   },
 *   preferDynamicSchema: true
 * };
 * ```
 */
export interface ConfigEditOptions {
	/**
	 * External link configuration for 3rd party form
	 * When configured, shows a link/button to open external configuration
	 */
	externalEditLink?: ExternalEditLink;

	/**
	 * Dynamic schema endpoint configuration
	 * When configured, fetches the config schema from the specified endpoint
	 */
	dynamicSchema?: DynamicSchemaEndpoint;

	/**
	 * When both externalEditLink and dynamicSchema are configured,
	 * determines which to use by default
	 * @default false (prefer external link)
	 */
	preferDynamicSchema?: boolean;

	/**
	 * Show a "Refresh Schema" button when using dynamic schema
	 * Allows users to manually refresh the schema
	 * @default true
	 */
	showRefreshButton?: boolean;

	/**
	 * Message to display when schema is being loaded
	 * @default "Loading configuration options..."
	 */
	loadingMessage?: string;

	/**
	 * Message to display when schema fetch fails
	 * @default "Failed to load configuration. Use external editor instead."
	 */
	errorMessage?: string;
}

/**
 * UI-related extension settings for nodes
 * Used to control visual behavior in the workflow editor
 */
export interface NodeUIExtensions {
	/** Show/hide unconnected handles (ports) to reduce visual noise */
	hideUnconnectedHandles?: boolean;
	/** Custom styles or theme overrides */
	style?: Record<string, unknown>;
	/** Any other UI-specific settings */
	[key: string]: unknown;
}

/**
 * Custom extension properties for 3rd party integrations
 * Allows storing additional configuration and UI state data
 *
 * @example
 * ```typescript
 * const extensions: NodeExtensions = {
 *   ui: {
 *     hideUnconnectedHandles: true,
 *     style: { opacity: 0.8 }
 *   },
 *   "myapp:analytics": {
 *     trackUsage: true,
 *     customField: "value"
 *   }
 * };
 * ```
 */
export interface NodeExtensions {
	/**
	 * UI-related settings for the node
	 * Used to control visual behavior in the workflow editor
	 */
	ui?: NodeUIExtensions;
	/**
	 * Per-instance admin/edit configuration override
	 * Allows overriding the node type's configEdit settings for specific instances
	 */
	configEdit?: ConfigEditOptions;
	/**
	 * Namespaced extension data from 3rd party integrations
	 * Use your package/organization name as the key (e.g., "myapp", "acme:analyzer")
	 */
	[namespace: string]: unknown;
}

/**
 * Node configuration metadata
 */
export interface NodeMetadata {
	id: string;
	name: string;
	type?: NodeType;
	/**
	 * Array of supported node types that this node can be rendered as.
	 * If not specified, defaults to the single 'type' field or 'default'.
	 * This allows nodes to support multiple rendering modes (e.g., both 'simple' and 'default').
	 * Can include both built-in types and custom registered types.
	 */
	supportedTypes?: NodeType[];
	description: string;
	category: NodeCategory;
	version: string;
	icon?: string;
	color?: string;
	/** Badge label displayed in the node header (e.g., "TOOL", "API", "LLM"). Overridable per-instance via config.instanceBadge. */
	badge?: string;
	/** Port dataType to expose on tool nodes. Defaults to 'tool'. Set to another type (e.g., 'trigger') to show that port instead. */
	portDataType?: string;
	inputs: NodePort[];
	outputs: NodePort[];
	configSchema?: ConfigSchema;
	/**
	 * Optional UI Schema that controls how configSchema fields are
	 * arranged, grouped, and displayed in the configuration form.
	 *
	 * When not provided, fields render in flat order (backward compatible).
	 * Uses JSON Forms-inspired format with VerticalLayout, Group, and Control elements.
	 *
	 * @see UISchemaElement for the element type definitions
	 * @see https://jsonforms.io/docs/uischema
	 */
	uiSchema?: import('./uischema.js').UISchemaElement;
	/** Default configuration values for this node type */
	config?: Record<string, unknown>;
	tags?: string[];
	/** Workflow formats this node is compatible with. Omit = universal (all formats). */
	formats?: WorkflowFormat[];
	/**
	 * Admin/Edit configuration for nodes with dynamic or external configuration.
	 * Used when the config schema cannot be determined at workflow load time
	 * or when configuration is handled by a 3rd party system.
	 *
	 * Supports two options:
	 * 1. External edit link - Opens a 3rd party form in a new tab
	 * 2. Dynamic schema - Fetches the config schema from a REST endpoint
	 *
	 * @example
	 * ```typescript
	 * configEdit: {
	 *   externalEditLink: {
	 *     url: "https://admin.example.com/nodes/{nodeTypeId}/configure",
	 *     label: "Configure in Admin Portal"
	 *   },
	 *   dynamicSchema: {
	 *     url: "/api/nodes/{nodeTypeId}/schema",
	 *     method: "GET"
	 *   }
	 * }
	 * ```
	 */
	configEdit?: ConfigEditOptions;
	/**
	 * Custom extension properties for 3rd party integrations
	 * Allows storing additional configuration and UI state data at the node type level
	 */
	extensions?: NodeExtensions;
}

/**
 * Common base interface for all schema properties
 */
export interface BaseProperty {
	type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'integer' | 'mixed' | 'float';
	description?: string;
	title?: string;
	default?: unknown;
	enum?: unknown[];
	minimum?: number;
	maximum?: number;
	minLength?: number;
	maxLength?: number;
	pattern?: string;
	format?: string;
	items?: BaseProperty;
	properties?: Record<string, BaseProperty>;
	[key: string]: unknown; // Allow additional JSON Schema properties
}

/**
 * Common base interface for all schemas
 */
export interface BaseSchema {
	type: 'object';
	properties: Record<string, BaseProperty>;
	required?: string[];
	additionalProperties?: boolean;
}

/**
 * Configuration schema property with specific attributes
 */
export interface ConfigProperty extends BaseProperty {
	type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'integer';
	title?: string;
	description?: string;
	default?: unknown;
	enum?: unknown[];
	multiple?: boolean; // For enum fields, allows multiple selection via checkboxes
	minimum?: number;
	maximum?: number;
	minLength?: number;
	maxLength?: number;
	pattern?: string;
	format?: 'multiline' | 'hidden' | string; // Special formats: multiline for textarea, hidden to hide field
	items?: ConfigProperty;
	properties?: Record<string, ConfigProperty>;
	[key: string]: unknown; // Allow additional JSON Schema properties
}

/**
 * Configuration schema interface
 */
export interface ConfigSchema extends BaseSchema {
	properties: Record<string, ConfigProperty>;
}

/**
 * Input schema property with specific attributes
 */
export interface InputProperty extends BaseProperty {
	type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'integer' | 'mixed';
	title?: string;
	description?: string;
	required?: boolean;
	default?: unknown;
	enum?: unknown[];
	minimum?: number;
	maximum?: number;
	minLength?: number;
	maxLength?: number;
	pattern?: string;
	format?: 'multiline' | string;
	items?: InputProperty;
	properties?: Record<string, InputProperty>;
	[key: string]: unknown;
}

/**
 * Input schema interface
 */
export interface InputSchema extends BaseSchema {
	properties: Record<string, InputProperty>;
}

/**
 * Output schema property with specific attributes
 */
export interface OutputProperty extends BaseProperty {
	type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'integer' | 'mixed' | 'float';
	description: string; // Required for outputs
	title?: string;
	default?: unknown;
	enum?: unknown[];
	minimum?: number;
	maximum?: number;
	minLength?: number;
	maxLength?: number;
	pattern?: string;
	format?: string;
	items?: OutputProperty;
	properties?: Record<string, OutputProperty>;
	[key: string]: unknown;
}

/**
 * Output schema interface
 */
export interface OutputSchema extends BaseSchema {
	properties: Record<string, OutputProperty>;
}

/**
 * Primitive types for template variables
 */
export type TemplateVariableType =
	| 'string'
	| 'number'
	| 'boolean'
	| 'array'
	| 'object'
	| 'integer'
	| 'mixed'
	| 'float';

/**
 * Represents a variable available for template interpolation.
 * Used by the template editor for autocomplete suggestions.
 *
 * Supports hierarchical drilling:
 * - Objects have `properties` for dot notation (e.g., `user.name`)
 * - Arrays have `items` for index access (e.g., `items[0].name`)
 *
 * @example
 * ```typescript
 * const userVariable: TemplateVariable = {
 *   name: "user",
 *   label: "User Data",
 *   type: "object",
 *   properties: {
 *     name: { name: "name", type: "string", label: "User Name" },
 *     email: { name: "email", type: "string", label: "Email Address" },
 *     address: {
 *       name: "address",
 *       type: "object",
 *       label: "Address",
 *       properties: {
 *         city: { name: "city", type: "string", label: "City" },
 *         country: { name: "country", type: "string", label: "Country" }
 *       }
 *     }
 *   }
 * };
 * ```
 */
export interface TemplateVariable {
	/** Variable name (used in template as {{ name }}) */
	name: string;
	/** Display label for the variable in autocomplete dropdown */
	label?: string;
	/** Description shown in autocomplete tooltip */
	description?: string;
	/** Data type of the variable */
	type: TemplateVariableType;
	/** For objects: child properties accessible via dot notation */
	properties?: Record<string, TemplateVariable>;
	/** For arrays: schema of array items accessible via index notation */
	items?: TemplateVariable;
	/** Source port ID this variable comes from */
	sourcePort?: string;
	/** Source node ID */
	sourceNode?: string;
}

/**
 * Schema passed to template editor for autocomplete functionality.
 * Contains all available variables derived from connected upstream nodes.
 *
 * @example
 * ```typescript
 * const variableSchema: VariableSchema = {
 *   variables: {
 *     user: { name: "user", type: "object", properties: { ... } },
 *     items: { name: "items", type: "array", items: { ... } },
 *     config: { name: "config", type: "object", properties: { ... } }
 *   }
 * };
 * ```
 */
export interface VariableSchema {
	/** Map of available variables keyed by variable name */
	variables: Record<string, TemplateVariable>;
}

/**
 * Configuration for template variable autocomplete.
 * Used in template fields to control which variables are available
 * and how they are derived.
 *
 * Supports three modes:
 * 1. **Schema-only** (existing): Variables from static schema and/or upstream ports
 * 2. **API-only** (new): Variables fetched from backend endpoint
 * 3. **Hybrid** (new): Merge API variables with static schema/ports
 *
 * @example
 * ```json
 * {
 *   "type": "string",
 *   "format": "template",
 *   "variables": {
 *     "ports": ["data", "context"],
 *     "includePortName": true
 *   }
 * }
 * ```
 *
 * @example API Mode
 * ```json
 * {
 *   "type": "string",
 *   "format": "template",
 *   "variables": {
 *     "api": {
 *       "endpoint": {
 *         "url": "/api/variables/{workflowId}/{nodeId}"
 *       }
 *     }
 *   }
 * }
 * ```
 */
export interface TemplateVariablesConfig {
	/**
	 * Specifies which input port IDs should provide variables for autocomplete.
	 * Only connections to these ports will provide variables.
	 *
	 * - If not specified, all input ports with connections are used.
	 * - If specified as an empty array, no variables will be derived from ports.
	 */
	ports?: string[];

	/**
	 * Pre-defined variable schema to use instead of (or in addition to) deriving from ports.
	 * Useful for providing static variables or overriding derived ones.
	 */
	schema?: VariableSchema;

	/**
	 * Whether to include the port name as a prefix for variables.
	 * When true, variables are named like `data.user` instead of just `user`.
	 * Useful when multiple ports might have overlapping variable names.
	 * @default false
	 */
	includePortName?: boolean;

	/**
	 * Whether to show available variables as clickable hints below the editor.
	 * @default true
	 */
	showHints?: boolean;

	/**
	 * API mode configuration for fetching variables from backend endpoint.
	 * When configured, variables will be fetched from the specified endpoint
	 * and can be merged with static schema and/or port-derived variables.
	 */
	api?: ApiVariablesConfig;
}

/**
 * Configuration for API-based variable fetching.
 * Enables dynamic variable suggestions from backend endpoints.
 *
 * @example
 * ```typescript
 * const apiConfig: ApiVariablesConfig = {
 *   endpoint: {
 *     url: "/api/variables/{workflowId}/{nodeId}",
 *     method: "GET"
 *   },
 *   cacheTtl: 300000,
 *   mergeWithSchema: true,
 *   fallbackOnError: true
 * };
 * ```
 */
export interface ApiVariablesConfig {
	/**
	 * Endpoint configuration for fetching variable schema
	 */
	endpoint: ApiVariablesEndpoint;

	/**
	 * Cache TTL in milliseconds.
	 * Variables are cached to prevent excessive API calls during editing.
	 * @default 300000 (5 minutes)
	 */
	cacheTtl?: number;

	/**
	 * Whether to merge API variables with static schema.
	 * When true, variables from both API and schema are combined.
	 * @default true
	 */
	mergeWithSchema?: boolean;

	/**
	 * Whether to merge API variables with port-derived variables.
	 * When true, variables from both API and ports are combined.
	 * @default false
	 */
	mergeWithPorts?: boolean;

	/**
	 * Whether to fallback to schema/ports on API error.
	 * When true, gracefully degrades to static variables if API fails.
	 * When false, shows error message to user.
	 * @default true
	 */
	fallbackOnError?: boolean;
}

/**
 * Endpoint configuration for fetching variable schemas from backend API.
 * Supports template variables in URL (e.g., {workflowId}, {nodeId})
 * which are resolved at runtime from node context.
 *
 * @example GET Request
 * ```typescript
 * const endpoint: ApiVariablesEndpoint = {
 *   url: "/api/variables/{workflowId}/{nodeId}",
 *   method: "GET"
 * };
 * ```
 *
 * @example POST Request with Body
 * ```typescript
 * const endpoint: ApiVariablesEndpoint = {
 *   url: "/api/variables",
 *   method: "POST",
 *   body: {
 *     workflowId: "{workflowId}",
 *     nodeId: "{nodeId}"
 *   }
 * };
 * ```
 */
export interface ApiVariablesEndpoint {
	/**
	 * URL to fetch variables from.
	 * Supports template placeholders:
	 * - `{workflowId}` - Resolved from workflow ID
	 * - `{nodeId}` - Resolved from node instance ID
	 *
	 * @example "/api/variables/{workflowId}/{nodeId}"
	 * @example "https://api.example.com/variables?workflow={workflowId}&node={nodeId}"
	 */
	url: string;

	/**
	 * HTTP method for the request.
	 * @default "GET"
	 */
	method?: HttpMethod;

	/**
	 * Custom headers to include in the request.
	 * Note: Authentication headers are automatically added via AuthProvider.
	 */
	headers?: Record<string, string>;

	/**
	 * Request body for POST/PUT/PATCH methods.
	 * Supports template variables like the URL.
	 */
	body?: Record<string, unknown>;

	/**
	 * Request timeout in milliseconds.
	 * @default 30000 (30 seconds)
	 */
	timeout?: number;

	/**
	 * Whether to cache the fetched schema.
	 * When false, schema is fetched on every editor load.
	 * @default true
	 */
	cacheEnabled?: boolean;
}

/**
 * Union type for all schema types
 */
export type Schema = ConfigSchema | InputSchema | OutputSchema;

/**
 * Union type for all property types
 */
export type Property = ConfigProperty | InputProperty | OutputProperty;

/**
 * Schema type discriminator
 */
export type SchemaType = 'config' | 'input' | 'output';

/**
 * Utility type to get the appropriate property type based on schema type
 */
export type SchemaProperty<T extends SchemaType> = T extends 'config'
	? ConfigProperty
	: T extends 'input'
		? InputProperty
		: T extends 'output'
			? OutputProperty
			: never;

/**
 * Utility type to get the appropriate schema type based on schema type
 */
export type SchemaTypeMap<T extends SchemaType> = T extends 'config'
	? ConfigSchema
	: T extends 'input'
		? InputSchema
		: T extends 'output'
			? OutputSchema
			: never;

/**
 * Node configuration values
 *
 * Key-value pairs of user-entered configuration values based on the node's configSchema.
 * This is where all node-specific settings are stored, including:
 *
 * **Standard Properties:**
 * - Any property defined in the node's `configSchema` (e.g., model, temperature, apiKey)
 *
 * **Special Properties (Dynamic Ports):**
 * - `dynamicInputs`: Array of DynamicPort for user-defined input handles
 * - `dynamicOutputs`: Array of DynamicPort for user-defined output handles
 * - `branches`: Array of Branch for gateway node conditional output paths
 *
 * The backend uses this object to:
 * - Store and retrieve node configuration
 * - Pass configuration values to node processors during execution
 * - Persist node state across sessions
 *
 * @example
 * ```typescript
 * const config: ConfigValues = {
 *   // Standard configuration from configSchema
 *   model: "gpt-4o-mini",
 *   temperature: 0.7,
 *   maxTokens: 1000,
 *
 *   // Dynamic input ports
 *   dynamicInputs: [
 *     { name: "extra_data", label: "Extra Data", dataType: "json" }
 *   ],
 *
 *   // Gateway branches
 *   branches: [
 *     { name: "success", label: "Success", condition: "status === 200" },
 *     { name: "error", label: "Error", isDefault: true }
 *   ]
 * };
 * ```
 */
export interface ConfigValues {
	/** Dynamic input ports for user-defined input handles */
	dynamicInputs?: DynamicPort[];
	/** Dynamic output ports for user-defined output handles */
	dynamicOutputs?: DynamicPort[];
	/** Branches for gateway node conditional output paths */
	branches?: Branch[];
	/** Any other configuration properties defined in configSchema */
	[key: string]: unknown;
}

/**
 * Extended node type for workflows
 *
 * Represents a node instance in a workflow, containing position, display data,
 * configuration values, and metadata from the node type definition.
 */
export interface WorkflowNode extends Node {
	id: string;
	type: string;
	position: XYPosition;
	deletable?: boolean;
	data: {
		/** Display label for the node instance */
		label: string;
		/**
		 * Node configuration values
		 *
		 * Contains all user-configured settings for this node instance based on the
		 * node type's configSchema. This includes standard properties defined in the
		 * schema as well as special dynamic port configurations.
		 *
		 * The backend uses this object to:
		 * - Store and retrieve node configuration
		 * - Pass configuration values to node processors during execution
		 * - Persist node state across sessions
		 *
		 * @see ConfigValues for detailed documentation of available properties
		 */
		config: ConfigValues;
		/** Node type metadata (inputs, outputs, configSchema, etc.) */
		metadata: NodeMetadata;
		/** Whether the node is currently processing/executing */
		isProcessing?: boolean;
		/** Error message if the node execution failed */
		error?: string;
		/** Alternative node identifier */
		nodeId?: string;
		/** Node execution tracking information */
		executionInfo?: NodeExecutionInfo;
		/**
		 * Per-instance extension properties for 3rd party integrations
		 * Overrides or extends the node type extensions defined in metadata.extensions
		 * Use for instance-specific UI states or custom data
		 */
		extensions?: NodeExtensions;
	};
}

/**
 * Edge category types based on source port data type or target handle
 * Used for visual styling of edges on the canvas
 * - trigger: For control flow connections (dataType: "trigger")
 * - tool: Dashed amber line for tool connections (dataType: "tool")
 * - loopback: Dashed gray line for loop iteration (targets loop_back port)
 * - data: Normal gray line for all other data connections
 */
export type EdgeCategory = 'trigger' | 'tool' | 'loopback' | 'data';

/**
 * Extended edge type for workflows
 */
export interface WorkflowEdge extends Edge {
	id: string;
	source: string;
	target: string;
	sourceHandle?: string;
	targetHandle?: string;
	type?: ConnectionLineType;
	selectable?: boolean;
	deletable?: boolean;
	data?: {
		label?: string;
		condition?: string;
		/** Edge metadata for API and persistence */
		metadata?: {
			/** Edge type for styling ("tool" or "data") */
			edgeType?: EdgeCategory;
			/** Data type of the source output port (e.g., "tool", "string", "number") */
			sourcePortDataType?: string;
		};
		targetNodeType?: string;
		targetCategory?: string;
	};
}

/**
 * Complete workflow definition
 */
export interface Workflow {
	id: string;
	name: string;
	description?: string;
	nodes: WorkflowNode[];
	edges: WorkflowEdge[];
	metadata?: {
		version: string;
		createdAt: string;
		updatedAt: string;
		author?: string;
		tags?: string[];
		versionId?: string;
		updateNumber?: number;
		/** Workflow format. Determines sidebar filtering and export behavior. */
		format?: WorkflowFormat;
	};
}

/**
 * API response types
 */
export interface ApiResponse<T> {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
}

export type NodesResponse = ApiResponse<NodeMetadata[]>;
export type WorkflowResponse = ApiResponse<Workflow>;
export type WorkflowsResponse = ApiResponse<Workflow[]>;

/**
 * Node execution status enum
 */
export type NodeExecutionStatus =
	| 'idle'
	| 'pending'
	| 'running'
	| 'completed'
	| 'failed'
	| 'cancelled'
	| 'skipped';

/**
 * Node execution tracking information
 */
export interface NodeExecutionInfo {
	/** Current execution status */
	status: NodeExecutionStatus;
	/** Total number of times this node has been executed */
	executionCount: number;
	/** Last execution timestamp */
	lastExecuted?: string;
	/** Last execution duration in milliseconds */
	lastExecutionDuration?: number;
	/** Last error message if execution failed */
	lastError?: string;
	/** Whether the node is currently being executed */
	isExecuting: boolean;
	/** Execution output data (e.g., active branches for gateway nodes) */
	output?: Record<string, unknown>;
}

/**
 * Workflow execution status
 */
export type ExecutionStatus = 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * Workflow execution result
 */
export interface ExecutionResult {
	id: string;
	workflowId: string;
	status: ExecutionStatus;
	startTime: string;
	endTime?: string;
	results?: Record<string, unknown>;
	error?: string;
	logs?: string[];
}

/**
 * Library configuration
 */
export interface FlowDropConfig {
	endpointConfig?: EndpointConfig;
	theme?: 'light' | 'dark' | 'auto';
	enableDebug?: boolean;
	autoSave?: boolean;
	autoSaveInterval?: number;
	maxUndoSteps?: number;
	nodeSpacing?: number;
	gridSize?: number;
}

/**
 * Event types for the workflow editor
 */
export interface WorkflowEvents {
	nodeAdded: { node: WorkflowNode };
	nodeRemoved: { nodeId: string };
	nodeUpdated: { node: WorkflowNode };
	edgeAdded: { edge: WorkflowEdge };
	edgeRemoved: { edgeId: string };
	workflowSaved: { workflow: Workflow };
	workflowLoaded: { workflow: Workflow };
	executionStarted: { workflowId: string };
	executionCompleted: { result: ExecutionResult };
	executionFailed: { error: string };
}

// Re-export auth types for convenience
export type { AuthProvider, StaticAuthConfig, CallbackAuthConfig } from './auth.js';
export { StaticAuthProvider, CallbackAuthProvider, NoAuthProvider } from './auth.js';

// Re-export settings types
export type {
	FlowDropSettings,
	ThemeSettings,
	EditorSettings,
	UISettings,
	BehaviorSettings,
	ApiSettings,
	ThemePreference,
	ResolvedTheme,
	SettingsCategory,
	PartialSettings,
	SyncStatus,
	SettingsStoreState,
	SettingsChangeEvent,
	SettingsChangeCallback
} from './settings.js';
export {
	DEFAULT_SETTINGS,
	DEFAULT_THEME_SETTINGS,
	DEFAULT_EDITOR_SETTINGS,
	DEFAULT_UI_SETTINGS,
	DEFAULT_BEHAVIOR_SETTINGS,
	DEFAULT_API_SETTINGS,
	SETTINGS_CATEGORIES,
	SETTINGS_CATEGORY_LABELS,
	SETTINGS_CATEGORY_ICONS,
	SETTINGS_STORAGE_KEY
} from './settings.js';

// UISchema types for form layout control
export type {
	UISchemaElementType,
	UISchemaElementBase,
	UISchemaControl,
	UISchemaVerticalLayout,
	UISchemaGroup,
	UISchemaElement
} from './uischema.js';

export { isUISchemaControl, isUISchemaVerticalLayout, isUISchemaGroup } from './uischema.js';
