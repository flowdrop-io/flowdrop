/**
 * Schema-only types for JSON Schema generation
 * 
 * This file re-exports types that are safe for JSON Schema generation,
 * excluding types that depend on Svelte or other runtime dependencies.
 * 
 * Generated schemas are used by backend implementations to validate
 * the JSON they produce for the FlowDrop editor.
 */

// Re-export types that don't have Svelte dependencies
export type {
  NodeCategory,
  PortDataTypeConfig,
  PortCompatibilityRule,
  PortConfig,
  NodeDataType,
  NodePort,
  DynamicPort,
  Branch,
  BuiltinNodeType,
  NodeType,
  HttpMethod,
  DynamicSchemaEndpoint,
  ExternalEditLink,
  ConfigEditOptions,
  NodeUIExtensions,
  NodeExtensions,
  NodeMetadata,
  BaseProperty,
  BaseSchema,
  ConfigProperty,
  ConfigSchema,
  InputProperty,
  InputSchema,
  OutputProperty,
  OutputSchema,
  Schema,
  Property,
  SchemaType,
  ConfigValues,
} from './index.js';
