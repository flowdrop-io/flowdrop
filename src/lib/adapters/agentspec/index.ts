/**
 * Agent Spec Adapter — Barrel Exports
 *
 * Provides bidirectional conversion between FlowDrop and Oracle's Open Agent Spec.
 *
 * @example
 * ```typescript
 * import {
 *   AgentSpecAdapter,
 *   AgentSpecAgentAdapter,
 *   getAgentSpecNodeMetadata,
 *   validateForAgentSpecExport,
 *   validateAgentSpecFlow
 * } from '@d34dman/flowdrop/core';
 *
 * // Export a FlowDrop workflow as Agent Spec JSON
 * const adapter = new AgentSpecAdapter();
 * const agentSpecJson = adapter.exportJSON(workflow);
 *
 * // Import an Agent Spec flow into FlowDrop
 * const flowDropWorkflow = adapter.importJSON(agentSpecJson);
 *
 * // Validate before export
 * const result = validateForAgentSpecExport(workflow);
 * if (!result.valid) console.error(result.errors);
 * ```
 */

// Core adapter
export { AgentSpecAdapter } from './AgentSpecAdapter.js';

// Agent-level adapter (wraps flow with agent/tools/LLM config)
export { AgentSpecAgentAdapter } from './agentAdapter.js';
export type { AgentConfig, AgentSpecImportResult } from './agentAdapter.js';

// Node type registry
export {
	getAgentSpecNodeMetadata,
	getAllAgentSpecNodeTypes,
	createAgentSpecNodeMetadata,
	isAgentSpecNodeId,
	extractComponentType,
	AGENTSPEC_NAMESPACE
} from './nodeTypeRegistry.js';

// Validation
export {
	validateForAgentSpecExport,
	validateAgentSpecFlow
} from './validator.js';
export type { AgentSpecValidationResult } from './validator.js';

// Auto-layout
export { computeAutoLayout } from './autoLayout.js';
export type { AutoLayoutConfig } from './autoLayout.js';
