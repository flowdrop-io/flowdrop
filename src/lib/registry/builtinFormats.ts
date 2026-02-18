/**
 * Built-in Workflow Format Registration
 *
 * Registers the default FlowDrop and Agent Spec format adapters
 * with the workflow format registry.
 *
 * This module is automatically loaded when imported,
 * ensuring built-in formats are available without user action.
 */

import { workflowFormatRegistry } from './workflowFormatRegistry.js';
import type { WorkflowFormatAdapter } from './workflowFormatRegistry.js';
import { AgentSpecAdapter } from '../adapters/agentspec/AgentSpecAdapter.js';
import { validateForAgentSpecExport } from '../adapters/agentspec/validator.js';

/**
 * Track whether built-in formats have been registered.
 * Prevents duplicate registration on hot reload.
 */
let registered = false;

/**
 * Register all built-in workflow format adapters.
 * Safe to call multiple times — will only register once.
 */
export function registerBuiltinFormats(): void {
	if (registered) return;

	// FlowDrop native — passthrough (StandardWorkflow ↔ JSON)
	const flowdropAdapter: WorkflowFormatAdapter = {
		id: 'flowdrop',
		name: 'FlowDrop',
		description: 'FlowDrop native workflow format',
		version: '1.0.0',
		// No nodes — FlowDrop nodes are universal (no formats restriction)
		export: (workflow) => JSON.stringify(workflow, null, 2),
		import: (data) => JSON.parse(data)
	};

	workflowFormatRegistry.register(flowdropAdapter);

	// Agent Spec — wraps existing AgentSpecAdapter
	// No bundled nodes — Agent Spec node types are user-provided via
	// getDefaultAgentSpecNodeTypes() or custom definitions passed to mountFlowDropApp()
	const agentSpecAdapter = new AgentSpecAdapter();
	const agentSpecFormatAdapter: WorkflowFormatAdapter = {
		id: 'agentspec',
		name: 'Agent Spec (Oracle)',
		description: 'Oracle Open Agent Spec format',
		version: '1.0.0',
		export: (workflow) => agentSpecAdapter.exportJSON(workflow),
		import: (data) => agentSpecAdapter.importJSON(data),
		validate: (workflow) => validateForAgentSpecExport(workflow)
	};

	workflowFormatRegistry.register(agentSpecFormatAdapter);

	registered = true;
}

/**
 * Check if built-in formats have been registered.
 */
export function areBuiltinFormatsRegistered(): boolean {
	return registered;
}

/**
 * Reset the registration state.
 * Primarily useful for testing.
 */
export function resetBuiltinFormatRegistration(): void {
	registered = false;
}

// Sync registration flag with registry.clear() for test isolation
workflowFormatRegistry.onClear(() => {
	registered = false;
});

// Auto-register built-in formats when this module is imported
registerBuiltinFormats();
