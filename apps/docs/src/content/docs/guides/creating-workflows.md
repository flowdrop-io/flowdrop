---
title: Creating Workflows
description: How to create and manage workflows with FlowDrop.
---

Workflows in FlowDrop are composed of **nodes** connected by **edges**. Each node represents a step in your workflow, and edges define the flow between steps.

For details on the JSON format, see [Workflow Structure](/guides/workflow-json/), [Node Structure](/guides/node-json/), and [Edge Structure](/guides/edge-json/).

## Building a Workflow

1. **Drag nodes** from the sidebar onto the canvas
2. **Connect ports** by dragging from an output handle to an input handle
3. **Configure nodes** by clicking on a node to open the configuration panel
4. **Save** using the navbar save button or programmatically via `app.save()`

## Import and Export

FlowDrop supports multiple workflow formats:

### FlowDrop Native JSON

The default format. Export and import workflows as JSON:

```typescript
// Export
const workflow = app.getWorkflow();
const json = JSON.stringify(workflow, null, 2);

// Import
app.importWorkflow(JSON.parse(jsonString));
```

### Oracle Agent Spec

FlowDrop supports full bidirectional conversion with the [Oracle Open Agent Spec](https://github.com/oracle/agent-spec) format for AI agent workflows:

```typescript
import { WorkflowOperationsHelper } from '@d34dman/flowdrop';

// Export as Agent Spec
const agentSpec = helper.exportAsAgentSpec();

// Import from Agent Spec
helper.importFromAgentSpec(agentSpecDocument);
```

Agent Spec imports automatically apply layout since the format does not include position data.

## Saving Workflows

### Programmatic Save

```typescript
const app = await mountFlowDropApp(container, {
  endpointConfig: createEndpointConfig('/api/flowdrop'),
  eventHandlers: {
    onBeforeSave: (workflow) => {
      // Validate or transform before saving
      return workflow;
    },
    onAfterSave: (workflow) => {
      console.log('Saved workflow:', workflow.id);
    }
  }
});

// Save programmatically
await app.save();
```

### Auto-Save Drafts

Enable automatic draft saving:

```typescript
const app = await mountFlowDropApp(container, {
  features: {
    autoSaveDraft: true,
    autoSaveDraftInterval: 30000 // 30 seconds
  }
});
```
