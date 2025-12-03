/**
 * Node Component Registry Module
 * Exports all registry-related functionality.
 */

// Core registry
export {
	nodeComponentRegistry,
	createNamespacedType,
	parseNamespacedType,
	type NodeComponentProps,
	type NodeComponentRegistration,
	type NodeComponentCategory,
	type StatusPosition,
	type StatusSize,
	type NodeRegistrationFilter
} from './nodeComponentRegistry.js';

// Built-in nodes
export {
	BUILTIN_NODE_COMPONENTS,
	BUILTIN_NODE_TYPES,
	FLOWDROP_SOURCE,
	registerBuiltinNodes,
	areBuiltinsRegistered,
	resetBuiltinRegistration,
	resolveBuiltinAlias,
	isBuiltinType,
	getBuiltinTypes,
	type BuiltinNodeType
} from './builtinNodes.js';

// Plugin system
export {
	registerFlowDropPlugin,
	unregisterFlowDropPlugin,
	registerCustomNode,
	createPlugin,
	isValidNamespace,
	getRegisteredPlugins,
	getPluginNodeCount,
	type FlowDropPluginConfig,
	type PluginNodeDefinition,
	type PluginRegistrationResult
} from './plugin.js';
