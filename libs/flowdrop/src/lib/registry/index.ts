/**
 * Node Component Registry Module
 * Exports all registry-related functionality.
 */

// Base registry
export { BaseRegistry } from './BaseRegistry.svelte.js';

// Core registry (the class — instances live on `fd.nodes`)
export {
  NodeComponentRegistry,
  createNamespacedType,
  parseNamespacedType,
  createPlugin,
  isValidNamespace,
  type NodeComponentProps,
  type NodeTypeInfo,
  type NodeComponentRegistration,
  type NodeComponentCategory,
  type StatusPosition,
  type StatusSize,
  type NodeRegistrationFilter,
  type FlowDropPluginConfig,
  type PluginNodeDefinition,
  type PluginRegistrationResult
} from './nodeComponentRegistry.js';

// Built-in nodes
export {
  BUILTIN_NODE_COMPONENTS,
  BUILTIN_NODE_TYPES,
  FLOWDROP_SOURCE,
  resolveBuiltinAlias,
  isBuiltinType,
  getBuiltinTypes,
  type BuiltinNodeType
} from './builtinNodes.js';
