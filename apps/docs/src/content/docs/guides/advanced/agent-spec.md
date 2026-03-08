---
title: Agent Spec Integration
description: Import and export workflows using the Oracle Agent Spec format.
---

FlowDrop supports [Oracle Agent Spec](https://github.com/oracle/agent-spec) — an open standard for defining AI agent workflows. You can import Agent Spec documents into FlowDrop for visual editing and export FlowDrop workflows back to Agent Spec format.

## What is Agent Spec?

Agent Spec is a JSON format for describing agent workflows with:
- **Nodes** (called "steps") with component types
- **Control-flow edges** for execution order
- **Data-flow edges** for data passing
- **Agent-level metadata** (name, description, version)

## Import / Export via UI

FlowDrop's toolbar includes import/export options:

- **Import**: Click the import button and select an Agent Spec JSON file. FlowDrop converts it to a visual workflow with auto-layout.
- **Export**: Click the export button and choose "Agent Spec" format. FlowDrop converts the visual workflow to Agent Spec JSON and downloads it.

## Programmatic Usage

### Using the Adapter Directly

```typescript
import { AgentSpecAdapter, WorkflowAdapter } from '@d34dman/flowdrop/core';

const workflowAdapter = new WorkflowAdapter(nodeTypes);
const agentSpecAdapter = new AgentSpecAdapter();

// Import: Agent Spec JSON → FlowDrop Workflow
const standardWorkflow = agentSpecAdapter.importJSON(agentSpecJsonString);
const editorWorkflow = workflowAdapter.toSvelteFlow(standardWorkflow);

// Export: FlowDrop Workflow → Agent Spec JSON
const standardWorkflow = workflowAdapter.fromSvelteFlow(editorWorkflow);
const agentSpecJson = agentSpecAdapter.exportJSON(standardWorkflow);
```

### Using the WorkflowOperationsHelper

```typescript
import { WorkflowOperationsHelper } from '@d34dman/flowdrop/editor';

// Export current workflow as Agent Spec
const result = WorkflowOperationsHelper.exportAsAgentSpec(workflow);
if (result.valid) {
  // Downloads .json file automatically
} else {
  console.error('Export errors:', result.errors);
  console.warn('Warnings:', result.warnings);
}

// Import from a File object
const imported = await WorkflowOperationsHelper.importFromAgentSpec(file);
```

### Using the Mount API

The mounted app exposes Agent Spec operations:

```typescript
const app = await mountFlowDropApp(container, options);

// Export
const agentSpecDoc = app.export(); // downloads JSON

// Get workflow and convert manually
const workflow = app.getWorkflow();
```

## Validation

Validate a workflow before exporting to Agent Spec:

```typescript
import { validateForAgentSpecExport } from '@d34dman/flowdrop/core';

const result = validateForAgentSpecExport(workflow);
// { valid: boolean, errors: string[], warnings: string[] }
```

Common validation issues:
- Disconnected nodes (no edges)
- Missing required port connections
- Unsupported node types

## Conversion Details

### What Maps Cleanly

| FlowDrop | Agent Spec |
|----------|-----------|
| Node ID | Auto-generated stable name |
| Node type | Component type |
| Config values | Node attributes |
| Trigger edges | Control-flow edges |
| Data edges | Data-flow edges |
| Gateway branches | `from_branch` mappings |
| Node position | Preserved in metadata |

### Known Limitations

- **Loopback edges** don't have a direct Agent Spec equivalent and may be dropped
- **Custom node types** (namespaced) may lose type-specific behavior
- **UISchema** layout information is not preserved
- **Dynamic ports** may not convert cleanly
- **Node visual types** (simple, square, etc.) are stored in metadata but not in the Agent Spec standard

## Execution Events

When running Agent Spec workflows, FlowDrop fires execution events:

```typescript
eventHandlers: {
  onAgentSpecExecutionStarted: (executionId) => {
    console.log('Execution started:', executionId);
  },
  onAgentSpecNodeStatusUpdate: (nodeId, status) => {
    console.log(`Node ${nodeId}: ${status.status}`);
  },
  onAgentSpecExecutionCompleted: (executionId, results) => {
    console.log('Completed:', results);
  },
  onAgentSpecExecutionFailed: (executionId, error) => {
    console.error('Failed:', error.message);
  }
}
```

See [Event System](/guides/advanced/event-system/) for the full event reference.

## Next Steps

- [Programmatic API](/guides/advanced/programmatic-api/) — create workflows in code
- [Event System](/guides/advanced/event-system/) — all execution events
- [Workflow Structure](/guides/workflow-json/) — FlowDrop's native JSON format
