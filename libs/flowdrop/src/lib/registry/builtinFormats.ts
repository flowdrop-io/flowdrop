/**
 * Built-in Workflow Format Adapters
 *
 * Provides the default FlowDrop and Agent Spec format adapters. These are used
 * to seed each instance's `WorkflowFormatRegistry` (see `instanceContainer`).
 */

import type { WorkflowFormatAdapter } from './workflowFormatRegistry.js';
import { AgentSpecAdapter } from '../adapters/agentspec/AgentSpecAdapter.js';
import { validateForAgentSpecExport } from '../adapters/agentspec/validator.js';

/**
 * Build the built-in workflow format adapters (FlowDrop native + Agent Spec).
 *
 * Returns a fresh array on each call so every instance owns independent
 * adapter objects (the Agent Spec adapter holds per-conversion state).
 */
export function getBuiltinFormatAdapters(): WorkflowFormatAdapter[] {
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

  return [flowdropAdapter, agentSpecFormatAdapter];
}
