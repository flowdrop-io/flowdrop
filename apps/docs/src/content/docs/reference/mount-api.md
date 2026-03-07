---
title: Mount API
description: Mount FlowDrop into any container element.
---

The mount API lets you embed FlowDrop into any HTML container, regardless of framework.

## `mountFlowDropApp()`

Mounts the full FlowDrop application (sidebar, editor, config panel) into a container.

```typescript
import { mountFlowDropApp } from '@d34dman/flowdrop/editor';

const app = await mountFlowDropApp(container: HTMLElement, options: FlowDropMountOptions);
```

### Options

```typescript
interface FlowDropMountOptions {
  // Data
  workflow?: Workflow;
  nodes?: NodeMetadata[];

  // API
  endpointConfig?: EndpointConfig;
  authProvider?: AuthProvider;

  // Event handlers
  eventHandlers?: {
    onBeforeSave?: (workflow: Workflow) => Workflow | void;
    onAfterSave?: (workflow: Workflow) => void;
    onDirtyStateChange?: (isDirty: boolean) => void;
    onBeforeUnmount?: (workflow: Workflow, isDirty: boolean) => void;
  };

  // Features
  features?: {
    autoSaveDraft?: boolean;
    autoSaveDraftInterval?: number;
    proximityConnect?: boolean;
    proximityConnectDistance?: number;
  };

  // UI
  showNavbar?: boolean;
  playgroundSidebarWidth?: number;
}
```

### Return Value

```typescript
interface MountedFlowDropApp {
  /** Save the current workflow to the backend */
  save(): Promise<Workflow>;

  /** Get the current workflow state */
  getWorkflow(): Workflow;

  /** Import a workflow */
  importWorkflow(workflow: Workflow): void;

  /** Export as Agent Spec format */
  exportAsAgentSpec(): AgentSpecDocument;

  /** Import from Agent Spec format */
  importFromAgentSpec(doc: AgentSpecDocument): void;

  /** Destroy the editor and clean up */
  destroy(): void;
}
```

## `mountWorkflowEditor()`

Mounts just the editor canvas without sidebar or navbar.

```typescript
import { mountWorkflowEditor } from '@d34dman/flowdrop/editor';

const editor = await mountWorkflowEditor(container, options);
```

## `mountPlayground()`

Mounts the interactive playground for workflow testing.

```typescript
import { mountPlayground } from '@d34dman/flowdrop/playground';

const playground = await mountPlayground(container, {
  workflowId: 'my-workflow-id',
  endpointConfig: createEndpointConfig('/api/flowdrop'),
  playgroundConfig: {
    pollingInterval: 1500,
    shouldStopPolling: (status) => ['completed', 'failed'].includes(status),
    isTerminalStatus: (status) => ['completed', 'failed'].includes(status)
  },
  onSessionStatusChange: (newStatus, previousStatus) => {
    console.log(`${previousStatus} -> ${newStatus}`);
  }
});

// Control
playground.startPolling();
playground.pushMessages(data);
playground.destroy();
```

## `unmountFlowDropApp()` / `unmountPlayground()`

Clean up a mounted instance. Equivalent to calling `.destroy()` on the returned object.

```typescript
import { unmountFlowDropApp } from '@d34dman/flowdrop/editor';

unmountFlowDropApp(container);
```

## Lifecycle

1. **Mount** — Call `mountFlowDropApp()` with a container element
2. **Interact** — Use the returned API to control the editor programmatically
3. **Destroy** — Call `.destroy()` or the unmount function to clean up

Registration of custom nodes and fields can happen **before or after** mounting — the registries are singletons that persist for the page lifetime.
