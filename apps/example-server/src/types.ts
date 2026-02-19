/** Standard API response envelope */
export interface ApiResponse<T> {
	success: boolean;
	data?: T;
	message?: string;
	error?: string;
	code?: string;
}

/** Node port definition */
export interface NodePort {
	id: string;
	name: string;
	type: 'input' | 'output';
	dataType: string;
	required?: boolean;
	description?: string;
	schema?: Record<string, unknown>;
}

/** Config schema property (simplified JSON Schema) */
export interface ConfigProperty {
	type: string;
	title?: string;
	description?: string;
	default?: unknown;
	enum?: unknown[];
	minimum?: number;
	maximum?: number;
	format?: string;
	[key: string]: unknown;
}

/** Config schema */
export interface ConfigSchema {
	type: 'object';
	properties: Record<string, ConfigProperty>;
	required?: string[];
}

/** Node type metadata */
export interface NodeMetadata {
	id: string;
	name: string;
	type?: string;
	supportedTypes?: string[];
	description: string;
	category: string;
	version: string;
	icon?: string;
	color?: string;
	badge?: string;
	inputs: NodePort[];
	outputs: NodePort[];
	configSchema?: ConfigSchema;
	config?: Record<string, unknown>;
	tags?: string[];
}

/** Workflow node instance */
export interface WorkflowNode {
	id: string;
	type: string;
	position: { x: number; y: number };
	deletable?: boolean;
	data: {
		label: string;
		config: Record<string, unknown>;
		metadata: NodeMetadata;
	};
}

/** Workflow edge */
export interface WorkflowEdge {
	id: string;
	source: string;
	target: string;
	sourceHandle?: string;
	targetHandle?: string;
	data?: Record<string, unknown>;
}

/** Workflow metadata */
export interface WorkflowMetadata {
	version: string;
	createdAt: string;
	updatedAt: string;
	author?: string;
	tags?: string[];
}

/** Complete workflow */
export interface Workflow {
	id: string;
	name: string;
	description?: string;
	nodes: WorkflowNode[];
	edges: WorkflowEdge[];
	metadata: WorkflowMetadata;
}

/** Category definition */
export interface CategoryDefinition {
	name: string;
	label: string;
	icon?: string;
	color?: string;
	description?: string;
	weight?: number;
}

/** Port data type config */
export interface PortDataTypeConfig {
	id: string;
	name: string;
	description?: string;
	color: string;
	category?: string;
	enabled?: boolean;
}

/** Port configuration */
export interface PortConfig {
	version: string;
	defaultDataType: string;
	dataTypes: PortDataTypeConfig[];
	compatibilityRules: Array<{
		from: string;
		to: string;
		description?: string;
	}>;
}
