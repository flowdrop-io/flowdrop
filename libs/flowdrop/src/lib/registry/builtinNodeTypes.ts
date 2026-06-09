/**
 * Built-in Node Type Metadata (pure — no component imports)
 *
 * The type identifiers, aliases, and resolution helpers for FlowDrop's built-in
 * node types, with ZERO dependency on the Svelte node components. Utilities that
 * only need to reason about type strings (e.g. `utils/nodeTypes.ts`, reachable
 * from `@flowdrop/flowdrop/core`) import from here, so the lightweight `core`
 * entry never statically pulls in node components, marked, or DOMPurify.
 *
 * The component registrations themselves live in `./builtinNodes.ts`, which
 * re-exports everything here for backward compatibility.
 *
 * @module registry/builtinNodeTypes
 */

/**
 * Source identifier for built-in FlowDrop components.
 */
export const FLOWDROP_SOURCE = 'flowdrop';

/**
 * Type for built-in node types.
 * Use this when you specifically need a built-in type.
 */
export type BuiltinNodeType =
  | 'workflowNode'
  | 'simple'
  | 'square'
  | 'atom'
  | 'tool'
  | 'gateway'
  | 'note'
  | 'terminal'
  | 'idea';

/**
 * Array of built-in type strings for runtime validation.
 */
export const BUILTIN_NODE_TYPES: BuiltinNodeType[] = [
  'workflowNode',
  'simple',
  'square',
  'atom',
  'tool',
  'gateway',
  'note',
  'terminal',
  'idea'
];

/**
 * Alias mapping for type resolution.
 * Maps alternative type names to their canonical registration.
 */
export const BUILTIN_TYPE_ALIASES: Record<string, string> = {
  default: 'workflowNode'
};

/**
 * Get the canonical type for a given type string.
 * Handles aliases like "default" -> "workflowNode".
 *
 * @param type - The type string to resolve
 * @returns The canonical type string
 */
export function resolveBuiltinAlias(type: string): string {
  return BUILTIN_TYPE_ALIASES[type] ?? type;
}

/**
 * Check if a type is a built-in FlowDrop type.
 *
 * @param type - The type to check
 * @returns true if this is a built-in type
 */
export function isBuiltinType(type: string): boolean {
  const canonicalType = resolveBuiltinAlias(type);
  return (BUILTIN_NODE_TYPES as string[]).includes(canonicalType);
}

/**
 * Get all built-in type identifiers.
 *
 * @returns Array of built-in type strings
 */
export function getBuiltinTypes(): string[] {
  return [...BUILTIN_NODE_TYPES];
}
