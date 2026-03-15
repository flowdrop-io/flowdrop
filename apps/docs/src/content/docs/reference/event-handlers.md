---
title: Event Handlers Reference
description: Complete reference for all FlowDrop event handlers.
---

All event handlers are passed via `eventHandlers` when mounting. Every handler is optional.

```typescript
const app = await mountFlowDropApp(container, {
  eventHandlers: {
    /* handlers below */
  }
});
```

## Workflow Lifecycle

| Handler              | Signature                                                      | When it fires                                                  |
| -------------------- | -------------------------------------------------------------- | -------------------------------------------------------------- |
| `onWorkflowChange`   | `(workflow: Workflow, changeType: WorkflowChangeType) => void` | Any modification to nodes, edges, config, or metadata          |
| `onWorkflowLoad`     | `(workflow: Workflow) => void`                                 | After a workflow is loaded and initialized                     |
| `onDirtyStateChange` | `(isDirty: boolean) => void`                                   | When the workflow transitions between saved and unsaved states |

### `WorkflowChangeType` Values

| Value         | Trigger                           |
| ------------- | --------------------------------- |
| `node_add`    | Node added to canvas              |
| `node_remove` | Node deleted                      |
| `node_move`   | Node dragged to new position      |
| `node_config` | Node configuration values changed |
| `edge_add`    | Connection drawn between nodes    |
| `edge_remove` | Connection deleted                |
| `metadata`    | Workflow metadata changed         |
| `name`        | Workflow name edited              |
| `description` | Workflow description edited       |

## Save Lifecycle

| Handler        | Signature                                             | When it fires                          |
| -------------- | ----------------------------------------------------- | -------------------------------------- |
| `onBeforeSave` | `(workflow: Workflow) => Promise<boolean \| void>`    | Before save. Return `false` to cancel. |
| `onAfterSave`  | `(workflow: Workflow) => Promise<void>`               | After successful save                  |
| `onSaveError`  | `(error: Error, workflow: Workflow) => Promise<void>` | When save fails                        |

## Error & Cleanup

| Handler           | Signature                                              | When it fires                                                                                                                                       |
| ----------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onApiError`      | `(error: Error, operation: string) => boolean \| void` | Any API request failure. Return `true` to suppress default toast. `operation` values: `"save"`, `"load"`, `"fetchNodes"`, `"fetchCategories"`, etc. |
| `onBeforeUnmount` | `(workflow: Workflow, isDirty: boolean) => void`       | Before FlowDrop is destroyed/unmounted                                                                                                              |

## Agent Spec Execution

| Handler                         | Signature                                                         | When it fires                        |
| ------------------------------- | ----------------------------------------------------------------- | ------------------------------------ |
| `onAgentSpecExecutionStarted`   | `(executionId: string) => void`                                   | Execution begins                     |
| `onAgentSpecExecutionCompleted` | `(executionId: string, results: Record<string, unknown>) => void` | Execution succeeds                   |
| `onAgentSpecExecutionFailed`    | `(executionId: string, error: Error) => void`                     | Execution fails                      |
| `onAgentSpecNodeStatusUpdate`   | `(nodeId: string, status: NodeExecutionInfo) => void`             | Node status changes during execution |

## Complete Interface

```typescript
interface FlowDropEventHandlers {
  onWorkflowChange?: (workflow: Workflow, changeType: WorkflowChangeType) => void;
  onDirtyStateChange?: (isDirty: boolean) => void;
  onBeforeSave?: (workflow: Workflow) => Promise<boolean | void>;
  onAfterSave?: (workflow: Workflow) => Promise<void>;
  onSaveError?: (error: Error, workflow: Workflow) => Promise<void>;
  onWorkflowLoad?: (workflow: Workflow) => void;
  onBeforeUnmount?: (workflow: Workflow, isDirty: boolean) => void;
  onApiError?: (error: Error, operation: string) => boolean | void;
  onAgentSpecExecutionStarted?: (executionId: string) => void;
  onAgentSpecExecutionCompleted?: (executionId: string, results: Record<string, unknown>) => void;
  onAgentSpecExecutionFailed?: (executionId: string, error: Error) => void;
  onAgentSpecNodeStatusUpdate?: (nodeId: string, status: NodeExecutionInfo) => void;
}
```

For usage examples and patterns, see the [Event System guide](/guides/advanced/event-system/).
