/**
 * Core types for the Workflow Library
 */

import type { Node, Edge, XYPosition } from '@xyflow/svelte';
import { ConnectionLineType } from '@xyflow/svelte';
import type { EndpointConfig } from '../config/endpoints.js';

/**
 * Node category types for organizing nodes in the sidebar
 * Based on actual API response categories
 */
export type NodeCategory =
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
	| 'bundles';

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
}

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
export type BuiltinNodeType = 'note' | 'simple' | 'square' | 'tool' | 'gateway' | 'terminal' | 'default';

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
	inputs: NodePort[];
	outputs: NodePort[];
	configSchema?: ConfigSchema;
	tags?: string[];
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
 * Key-value pairs of user-entered configuration values
 */
export interface ConfigValues {
	[key: string]: unknown;
}


/**
 * Extended node type for workflows
 */
export interface WorkflowNode extends Node {
	id: string;
	type: string;
	position: XYPosition;
	deletable?: boolean;
	data: {
		label: string;
		config: ConfigValues;
		metadata: NodeMetadata;
		isProcessing?: boolean;
		error?: string;
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
 * Edge category types based on source port data type
 * Used for visual styling of edges on the canvas
 * - trigger: For control flow connections (dataType: "trigger")
 * - tool: Dashed amber line for tool connections (dataType: "tool")
 * - data: Normal gray line for all other data connections
 */
export type EdgeCategory = 'trigger' | 'tool' | 'data';

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
