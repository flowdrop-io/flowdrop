/**
 * Configuration utilities for FlowDrop Editor
 */

import type {
	WorkflowEditorConfig,
	EditorFeatures,
	UIConfig,
	APIConfig,
	ExecutionConfig,
	StorageConfig
} from '../types/config.js';
import { createEndpointConfig } from '../config/endpoints.js';
import type { EndpointConfig } from '../config/endpoints.js';

/**
 * Create default editor features configuration
 */
export function createDefaultFeatures(): EditorFeatures {
	return {
		dragAndDrop: true,
		nodeEditing: true,
		execution: true,
		saveWorkflow: true,
		loadWorkflow: true,
		undoRedo: true,
		nodeSearch: true,
		nodeCategories: true,
		nodeValidation: true,
		collaboration: false,
		templates: false,
		importExport: false
	};
}

/**
 * Create default UI configuration
 */
export function createDefaultUIConfig(): UIConfig {
	return {
		showSidebar: true,
		showToolbar: true,
		showMinimap: true,
		showGrid: true,
		gridSize: 20,
		nodeSpacing: 100,
		canvasPadding: 50,
		navbarHeight: 60, // Default navbar height in pixels (current demo height)
		zoom: {
			min: 0.1,
			max: 2,
			default: 1
		},
		colors: {
			primary: '#3b82f6',
			secondary: '#64748b',
			accent: '#f59e0b',
			background: '#ffffff',
			text: '#1f2937'
		},
		cssClasses: {}
	};
}

/**
 * Create default API configuration
 */
export function createDefaultAPIConfig(): APIConfig {
	return {
		endpoints: createEndpointConfig('/api/flowdrop'),
		timeout: 30000,
		retry: {
			enabled: true,
			maxAttempts: 3,
			delay: 1000
		},
		auth: {
			type: 'none'
		},
		headers: {
			'Content-Type': 'application/json'
		}
	};
}

/**
 * Create default execution configuration
 */
export function createDefaultExecutionConfig(): ExecutionConfig {
	return {
		realTimeUpdates: true,
		timeout: 300,
		maxConcurrent: 5,
		showProgress: true,
		autoSaveState: true,
		caching: {
			enabled: true,
			ttl: 3600
		}
	};
}

/**
 * Create default storage configuration
 */
export function createDefaultStorageConfig(): StorageConfig {
	return {
		type: 'api',
		autoSaveInterval: 5000,
		maxUndoSteps: 50,
		keyPrefix: 'flowdrop_'
	};
}

/**
 * Create default workflow editor configuration
 */
export function createDefaultConfig(endpointConfig?: EndpointConfig): WorkflowEditorConfig {
	return {
		theme: 'auto',
		features: createDefaultFeatures(),
		ui: createDefaultUIConfig(),
		api: {
			...createDefaultAPIConfig(),
			endpoints: endpointConfig || createEndpointConfig('/api/flowdrop')
		},
		ports: {
			dataTypes: [],
			compatibilityRules: [],
			defaultDataType: 'mixed'
		},
		execution: createDefaultExecutionConfig(),
		storage: createDefaultStorageConfig()
	};
}

/**
 * Merge configuration with defaults
 */
export function mergeConfig(
	userConfig: Partial<WorkflowEditorConfig>,
	defaultConfig: WorkflowEditorConfig
): WorkflowEditorConfig {
	return {
		...defaultConfig,
		...userConfig,
		features: {
			...defaultConfig.features,
			...userConfig.features
		},
		ui: {
			...defaultConfig.ui,
			...userConfig.ui,
			zoom: {
				...defaultConfig.ui.zoom,
				...userConfig.ui?.zoom
			},
			colors: {
				...defaultConfig.ui.colors,
				...userConfig.ui?.colors
			},
			cssClasses: {
				...defaultConfig.ui.cssClasses,
				...userConfig.ui?.cssClasses
			}
		},
		api: {
			...defaultConfig.api,
			...userConfig.api,
			retry: {
				...defaultConfig.api.retry,
				...userConfig.api?.retry
			},
			auth: {
				...defaultConfig.api.auth,
				...userConfig.api?.auth
			},
			headers: {
				...defaultConfig.api.headers,
				...userConfig.api?.headers
			},
			endpoints: {
				...defaultConfig.api.endpoints,
				...userConfig.api?.endpoints
			}
		},
		execution: {
			...defaultConfig.execution,
			...userConfig.execution,
			caching: {
				...defaultConfig.execution.caching,
				...userConfig.execution?.caching
			}
		},
		storage: {
			...defaultConfig.storage,
			...userConfig.storage
		}
	};
}

/**
 * Validate configuration
 */
export function validateConfig(config: WorkflowEditorConfig): string[] {
	const errors: string[] = [];

	if (!config.features) {
		errors.push('features configuration is required');
	}

	if (!config.ui) {
		errors.push('ui configuration is required');
	}

	if (!config.api) {
		errors.push('api configuration is required');
	}

	if (!config.execution) {
		errors.push('execution configuration is required');
	}

	if (!config.storage) {
		errors.push('storage configuration is required');
	}

	// Validate API configuration
	if (config.api.timeout <= 0) {
		errors.push('API timeout must be greater than 0');
	}

	if (config.api.retry.maxAttempts < 0) {
		errors.push('Retry max attempts must be non-negative');
	}

	// Validate execution configuration
	if (config.execution.timeout <= 0) {
		errors.push('Execution timeout must be greater than 0');
	}

	if (config.execution.maxConcurrent <= 0) {
		errors.push('Max concurrent executions must be greater than 0');
	}

	// Validate UI configuration
	if (config.ui.gridSize <= 0) {
		errors.push('Grid size must be greater than 0');
	}

	if (config.ui.nodeSpacing <= 0) {
		errors.push('Node spacing must be greater than 0');
	}

	if (config.ui.zoom.min >= config.ui.zoom.max) {
		errors.push('Zoom min must be less than zoom max');
	}

	return errors;
}

/**
 * Create configuration from environment variables
 */
export function createConfigFromEnv(): WorkflowEditorConfig {
	const apiBaseUrl = import.meta.env.VITE_FLOWDROP_API_URL || '/api/flowdrop';
	const endpointConfig = createEndpointConfig(apiBaseUrl);

	const config = createDefaultConfig(endpointConfig);

	// Override with environment variables
	if (import.meta.env.VITE_FLOWDROP_THEME) {
		config.theme = import.meta.env.VITE_FLOWDROP_THEME as 'light' | 'dark' | 'auto';
	}

	if (import.meta.env.VITE_FLOWDROP_TIMEOUT) {
		config.api.timeout = parseInt(import.meta.env.VITE_FLOWDROP_TIMEOUT);
	}

	if (import.meta.env.VITE_FLOWDROP_AUTH_TYPE) {
		config.api.auth.type = import.meta.env.VITE_FLOWDROP_AUTH_TYPE as
			| 'none'
			| 'bearer'
			| 'api_key'
			| 'custom';
	}

	if (import.meta.env.VITE_FLOWDROP_AUTH_TOKEN) {
		config.api.auth.token = import.meta.env.VITE_FLOWDROP_AUTH_TOKEN;
	}

	return config;
}
