/**
 * FlowDrop Editor Configuration Types
 */

import type { EndpointConfig } from '../config/endpoints.js';
import type { PortConfig } from './index.js';

export interface WorkflowEditorConfig {
	/** API configuration with endpoints */
	api: APIConfig;

	/** Available node types loaded from API */
	nodeTypes?: NodeType[];

	/** Port configuration system */
	ports: PortConfig;

	/** Theme configuration */
	theme: 'light' | 'dark' | 'auto';

	/** Editor features configuration */
	features: EditorFeatures;

	/** UI customization options */
	ui: UIConfig;

	/** Execution configuration */
	execution: ExecutionConfig;

	/** Storage configuration */
	storage: StorageConfig;
}

export interface EditorFeatures {
	/** Enable drag and drop functionality */
	dragAndDrop: boolean;

	/** Enable node editing */
	nodeEditing: boolean;

	/** Enable workflow execution */
	execution: boolean;

	/** Enable workflow saving */
	saveWorkflow: boolean;

	/** Enable workflow loading */
	loadWorkflow: boolean;

	/** Enable undo/redo */
	undoRedo: boolean;

	/** Enable node search */
	nodeSearch: boolean;

	/** Enable node categories */
	nodeCategories: boolean;

	/** Enable node validation */
	nodeValidation: boolean;

	/** Enable real-time collaboration */
	collaboration: boolean;

	/** Enable workflow templates */
	templates: boolean;

	/** Enable workflow import/export */
	importExport: boolean;
}

export interface UIConfig {
	/** Show node sidebar */
	showSidebar: boolean;

	/** Show toolbar */
	showToolbar: boolean;

	/** Show minimap */
	showMinimap: boolean;

	/** Show grid */
	showGrid: boolean;

	/** Grid size */
	gridSize: number;

	/** Node spacing */
	nodeSpacing: number;

	/** Canvas padding */
	canvasPadding: number;

	/** Navbar height in pixels (configurable at runtime) */
	navbarHeight: number;

	/** Zoom limits */
	zoom: {
		min: number;
		max: number;
		default: number;
	};

	/** Node colors */
	colors: {
		primary: string;
		secondary: string;
		accent: string;
		background: string;
		text: string;
	};

	/** Custom CSS classes */
	cssClasses: {
		container?: string;
		sidebar?: string;
		toolbar?: string;
		canvas?: string;
		node?: string;
	};
}

export interface APIConfig {
	/** Endpoint configuration */
	endpoints: EndpointConfig;

	/** API timeout in milliseconds */
	timeout: number;

	/** Retry configuration */
	retry: {
		enabled: boolean;
		maxAttempts: number;
		delay: number;
	};

	/** Authentication configuration */
	auth: {
		type: 'none' | 'bearer' | 'api_key' | 'custom';
		token?: string;
		apiKey?: string;
		headers?: Record<string, string>;
	};

	/** Custom headers */
	headers: Record<string, string>;
}

export interface ExecutionConfig {
	/** Enable real-time execution updates */
	realTimeUpdates: boolean;

	/** Execution timeout in seconds */
	timeout: number;

	/** Maximum concurrent executions */
	maxConcurrent: number;

	/** Show execution progress */
	showProgress: boolean;

	/** Auto-save execution state */
	autoSaveState: boolean;

	/** Execution result caching */
	caching: {
		enabled: boolean;
		ttl: number;
	};
}

export interface StorageConfig {
	/** Storage type */
	type: 'api' | 'local' | 'session' | 'custom';

	/** Auto-save interval in milliseconds */
	autoSaveInterval: number;

	/** Maximum undo steps */
	maxUndoSteps: number;

	/** Storage key prefix */
	keyPrefix: string;

	/** Custom storage implementation */
	customStorage?: {
		save: (key: string, data: unknown) => Promise<void>;
		load: (key: string) => Promise<unknown>;
		delete: (key: string) => Promise<void>;
	};
}

export interface NodeType {
	/** Unique node type identifier */
	id: string;

	/** Display name */
	name: string;

	/** Description */
	description: string;

	/** Category */
	category: string;

	/** Icon (can be icon name or URL) */
	icon?: string;

	/** Node color */
	color?: string;

	/** Input ports */
	inputs: NodePort[];

	/** Output ports */
	outputs: NodePort[];

	/** Configuration schema */
	configSchema?: Record<string, unknown>;

	/** Tags for search and filtering */
	tags?: string[];

	/** Whether node is enabled */
	enabled?: boolean;

	/** Custom component to render */
	component?: string;
}

export interface NodePort {
	/** Port identifier */
	id: string;

	/** Display name */
	name: string;

	/** Port type */
	type: 'input' | 'output';

	/** Data type */
	dataType: string;

	/** Whether port is required */
	required: boolean;

	/** Description */
	description?: string;

	/** Default value */
	defaultValue?: unknown;

	/** Validation rules */
	validation?: unknown;
}

export interface WorkflowData {
	/** Workflow ID */
	id: string;

	/** Workflow name */
	name: string;

	/** Workflow description */
	description?: string;

	/** Workflow nodes */
	nodes: WorkflowNode[];

	/** Workflow edges */
	edges: WorkflowEdge[];

	/** Workflow metadata */
	metadata?: Record<string, unknown>;

	/** Creation timestamp */
	createdAt?: number;

	/** Last modified timestamp */
	updatedAt?: number;
}

export interface WorkflowNode {
	/** Node ID */
	id: string;

	/** Node type */
	type: string;

	/** Node position */
	position: { x: number; y: number };

	/** Node data */
	data: {
		/** Node label */
		label: string;

		/** Node configuration */
		config: Record<string, unknown>;

		/** Node metadata */
		metadata?: Record<string, unknown>;
	};
}

export interface WorkflowEdge {
	/** Edge ID */
	id: string;

	/** Source node ID */
	source: string;

	/** Target node ID */
	target: string;

	/** Source port */
	sourceHandle?: string;

	/** Target port */
	targetHandle?: string;

	/** Edge type */
	type?: string;

	/** Edge data */
	data?: Record<string, unknown>;
}

export interface ExecutionResult {
	/** Execution ID */
	executionId: string;

	/** Workflow ID */
	workflowId: string;

	/** Execution status */
	status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

	/** Execution results by node */
	nodeResults: Record<string, unknown>;

	/** Execution metadata */
	metadata: {
		startTime: number;
		endTime?: number;
		duration?: number;
		error?: string;
	};

	/** Execution progress */
	progress?: {
		current: number;
		total: number;
		percentage: number;
	};
}

export interface EditorState {
	/** Current workflow data */
	workflow: WorkflowData | null;

	/** Selected nodes */
	selectedNodes: string[];

	/** Selected edges */
	selectedEdges: string[];

	/** Viewport state */
	viewport: {
		x: number;
		y: number;
		zoom: number;
	};

	/** Execution state */
	execution: {
		isExecuting: boolean;
		currentExecution?: ExecutionResult;
		executionHistory: ExecutionResult[];
	};

	/** UI state */
	ui: {
		sidebarOpen: boolean;
		toolbarVisible: boolean;
		minimapVisible: boolean;
		gridVisible: boolean;
	};
}
