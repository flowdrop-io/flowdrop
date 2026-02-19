/**
 * FlowDrop Editor Configuration Types
 *
 * This module contains configuration-specific types for the workflow editor.
 * For core workflow types (WorkflowNode, WorkflowEdge, etc.), see ./index.ts
 */

import type { EndpointConfig } from '../config/endpoints.js';
import type { PortConfig, NodeMetadata } from './index.js';

/**
 * Re-export core types from index.ts for convenience
 * This allows consumers to import from either location
 */
export type {
	WorkflowNode,
	WorkflowEdge,
	NodePort,
	ExecutionResult,
	NodeMetadata
} from './index.js';

export interface WorkflowEditorConfig {
	/** API configuration with endpoints */
	api: APIConfig;

	/** Available node types loaded from API (uses NodeMetadata from index.ts) */
	nodeTypes?: NodeMetadata[];

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
