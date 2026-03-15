---
title: Event System
description: Hook into FlowDrop's lifecycle with all 11 event handlers.
---

FlowDrop provides event handlers that let your parent application react to workflow lifecycle events — changes, saves, errors, and execution.

All events are passed via the `eventHandlers` option when mounting:

```typescript
const app = await mountFlowDropApp(container, {
  eventHandlers: {
    onWorkflowChange: (workflow, changeType) => {
      console.log(`Changed: ${changeType}`);
    },
    onDirtyStateChange: (isDirty) => {
      saveButton.disabled = !isDirty;
    }
  }
});
```

## Workflow Change Events

### `onWorkflowChange`

Called on **every modification** to the workflow — nodes added/removed/moved, edges changed, config updated.

```typescript
onWorkflowChange?: (workflow: Workflow, changeType: WorkflowChangeType) => void;
```

The `changeType` parameter tells you exactly what changed:

| Change Type   | Triggered when                       |
| ------------- | ------------------------------------ |
| `node_add`    | A node is added to the canvas        |
| `node_remove` | A node is deleted                    |
| `node_move`   | A node is dragged to a new position  |
| `node_config` | A node's configuration values change |
| `edge_add`    | A connection is drawn between nodes  |
| `edge_remove` | A connection is deleted              |
| `metadata`    | Workflow metadata changes            |
| `name`        | The workflow name is edited          |
| `description` | The workflow description is edited   |

**Example: Track changes for analytics**

```typescript
onWorkflowChange: (workflow, changeType) => {
  analytics.track('workflow_modified', {
    workflowId: workflow.id,
    changeType,
    nodeCount: workflow.nodes.length,
    edgeCount: workflow.edges.length
  });
};
```

### `onWorkflowLoad`

Called after a workflow is loaded and initialized. Fires on both initial load and subsequent loads.

```typescript
onWorkflowLoad?: (workflow: Workflow) => void;
```

**Example: Set up external state**

```typescript
onWorkflowLoad: (workflow) => {
  document.title = `${workflow.name} - Editor`;
  breadcrumb.update(workflow.name);
};
```

### `onDirtyStateChange`

Called when the workflow transitions between saved and unsaved states.

```typescript
onDirtyStateChange?: (isDirty: boolean) => void;
```

**Example: Unsaved changes indicator**

```typescript
onDirtyStateChange: (isDirty) => {
  saveButton.disabled = !isDirty;
  document.title = isDirty ? '● Unsaved - Editor' : 'Editor';
};
```

## Save Lifecycle Events

These three events form the save lifecycle: before → after (success) or error (failure).

### `onBeforeSave`

Called before a save operation. **Return `false` to cancel the save.**

```typescript
onBeforeSave?: (workflow: Workflow) => Promise<boolean | void>;
```

**Example: Confirm before saving**

```typescript
onBeforeSave: async (workflow) => {
  if (workflow.nodes.length === 0) {
    alert('Cannot save an empty workflow');
    return false; // cancels save
  }
};
```

### `onAfterSave`

Called after a successful save. The workflow may include server-assigned IDs or updated timestamps.

```typescript
onAfterSave?: (workflow: Workflow) => Promise<void>;
```

**Example: Show success notification**

```typescript
onAfterSave: async (workflow) => {
  showNotification(`Saved "${workflow.name}" successfully`);
};
```

### `onSaveError`

Called when a save operation fails.

```typescript
onSaveError?: (error: Error, workflow: Workflow) => Promise<void>;
```

**Example: Report errors**

```typescript
onSaveError: async (error, workflow) => {
  errorReporter.capture(error, { workflowId: workflow.id });
};
```

## Error & Cleanup Events

### `onApiError`

Called on **any** API request failure (save, load, fetch nodes, etc.). Return `true` to suppress FlowDrop's default error toast.

```typescript
onApiError?: (error: Error, operation: string) => boolean | void;
```

The `operation` parameter describes what failed: `"save"`, `"load"`, `"fetchNodes"`, `"fetchCategories"`, etc.

**Example: Custom error handling**

```typescript
onApiError: (error, operation) => {
  if (error.message.includes('401')) {
    redirectToLogin();
    return true; // suppress default toast
  }
  // return void to show default toast
};
```

### `onBeforeUnmount`

Called before FlowDrop is destroyed/unmounted. Use this for cleanup or prompting to save.

```typescript
onBeforeUnmount?: (workflow: Workflow, isDirty: boolean) => void;
```

**Example: Warn about unsaved changes**

```typescript
onBeforeUnmount: (workflow, isDirty) => {
  if (isDirty) {
    console.warn('Unmounting with unsaved changes');
  }
};
```

## Agent Spec Execution Events

These events fire during [Agent Spec](/guides/advanced/agent-spec/) workflow execution.

### `onAgentSpecExecutionStarted`

Called when an Agent Spec execution begins.

```typescript
onAgentSpecExecutionStarted?: (executionId: string) => void;
```

### `onAgentSpecExecutionCompleted`

Called when execution completes successfully.

```typescript
onAgentSpecExecutionCompleted?: (
  executionId: string,
  results: Record<string, unknown>
) => void;
```

### `onAgentSpecExecutionFailed`

Called when execution fails.

```typescript
onAgentSpecExecutionFailed?: (executionId: string, error: Error) => void;
```

### `onAgentSpecNodeStatusUpdate`

Called when a node's execution status changes during a run.

```typescript
onAgentSpecNodeStatusUpdate?: (nodeId: string, status: NodeExecutionInfo) => void;
```

**Example: Track execution progress**

```typescript
onAgentSpecExecutionStarted: (executionId) => {
  progressBar.show();
},
onAgentSpecNodeStatusUpdate: (nodeId, status) => {
  progressBar.update(nodeId, status.status);
},
onAgentSpecExecutionCompleted: (executionId, results) => {
  progressBar.hide();
  showResults(results);
},
onAgentSpecExecutionFailed: (executionId, error) => {
  progressBar.hide();
  showError(error.message);
}
```

## Complete Example

Here's a full integration using all lifecycle events:

```typescript
import { mountFlowDropApp } from '@flowdrop/flowdrop/editor';
import { createEndpointConfig } from '@flowdrop/flowdrop/core';

const app = await mountFlowDropApp(document.getElementById('editor'), {
  endpointConfig: createEndpointConfig('/api/flowdrop'),
  eventHandlers: {
    // Track all changes
    onWorkflowChange: (workflow, changeType) => {
      console.log(`[${changeType}] ${workflow.nodes.length} nodes`);
    },

    // Update UI for dirty state
    onDirtyStateChange: (isDirty) => {
      document.getElementById('save-btn').disabled = !isDirty;
    },

    // Initialize on load
    onWorkflowLoad: (workflow) => {
      document.title = workflow.name;
    },

    // Validate before saving
    onBeforeSave: async (workflow) => {
      if (workflow.nodes.length === 0) {
        return false; // cancel save
      }
    },

    // Notify on success
    onAfterSave: async (workflow) => {
      showToast('Saved!');
    },

    // Handle save failures
    onSaveError: async (error, workflow) => {
      showToast(`Save failed: ${error.message}`, 'error');
    },

    // Centralized error handling
    onApiError: (error, operation) => {
      if (error.message.includes('401')) {
        window.location.href = '/login';
        return true; // suppress toast
      }
    },

    // Cleanup on unmount
    onBeforeUnmount: (workflow, isDirty) => {
      if (isDirty) {
        localStorage.setItem('unsaved-workflow', JSON.stringify(workflow));
      }
    }
  }
});
```

## Reference

For the complete TypeScript interface, see [Core Types — Event Handlers](/reference/types/#event-handlers).
