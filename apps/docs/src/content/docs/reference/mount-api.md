---
title: Mount API
description: 'Complete reference for mountFlowDropApp(), mountWorkflowEditor(), and mountPlayground() — all options, return values, and lifecycle.'
---

The mount API lets you embed FlowDrop into any HTML container, regardless of framework.

## `mountFlowDropApp()`

Mounts the full FlowDrop application (sidebar, editor, config panel) into a container.

```typescript
import { mountFlowDropApp } from '@flowdrop/flowdrop/editor';

const app = await mountFlowDropApp(container: HTMLElement, options: FlowDropMountOptions);
```

### Options

```typescript
interface FlowDropMountOptions {
  // Data
  /** Initial workflow to load */
  workflow?: Workflow;
  /** Available node types (overrides API fetch) */
  nodes?: NodeMetadata[];

  // API
  /** REST API endpoint configuration */
  endpointConfig?: EndpointConfig;
  /** Port data type configuration (overrides API fetch) */
  portConfig?: PortConfig;
  /** Category definitions (overrides API fetch) */
  categories?: CategoryDefinition[];
  /** Authentication provider for API requests */
  authProvider?: AuthProvider;

  // Event handlers — all 11 lifecycle events
  eventHandlers?: FlowDropEventHandlers;

  // Features
  features?: FlowDropFeatures;

  // UI options
  /** Show the top navbar @default true */
  showNavbar?: boolean;
  /** Disable the node sidebar */
  disableSidebar?: boolean;
  /** Read-only mode (no editing) */
  readOnly?: boolean;
  /** Lock the workflow (prevent structural changes) */
  lockWorkflow?: boolean;
  /** Editor height (CSS value or number) */
  height?: string | number;
  /** Editor width (CSS value or number) */
  width?: string | number;

  // Navbar customization
  /** Custom navbar title */
  navbarTitle?: string;
  /** Custom navbar action buttons */
  navbarActions?: NavbarAction[];
  /** Show settings gear icon in navbar */
  showSettings?: boolean;

  // Pipeline mode
  /** Pipeline ID for execution status display */
  pipelineId?: string;
  /** Node execution statuses for visual overlay */
  nodeStatuses?: Record<string, 'pending' | 'running' | 'completed' | 'error'>;

  // Settings
  /** Initial settings overrides (theme, behavior, editor, ui) */
  settings?: PartialSettings;
  /** Custom localStorage key for draft auto-save */
  draftStorageKey?: string;

  // Format adapters
  /** Custom workflow format adapters */
  formatAdapters?: WorkflowFormatAdapter[];
}
```

### Feature Flags (`FlowDropFeatures`)

```typescript
interface FlowDropFeatures {
  /** Auto-save the current workflow to localStorage as a draft. @default true */
  autoSaveDraft?: boolean;

  /** How often to auto-save the draft, in milliseconds. @default 30000 */
  autoSaveDraftInterval?: number;

  /** Show toast notifications for save success, failure, and API errors.
   * Disable if you want to handle notifications yourself via event handlers. @default true */
  showToasts?: boolean;
}
```

See [Auto-Save & Drafts](/recipes/auto-save-and-drafts/) for practical examples.

See [Core Types](/reference/types/) for `FlowDropEventHandlers` and `FlowDropFeatures`.

### Return Value

```typescript
interface MountedFlowDropApp {
  /** Destroy the editor and clean up resources */
  destroy(): void;

  /** Check if there are unsaved changes */
  isDirty(): boolean;

  /** Mark the workflow as saved (clears dirty state) */
  markAsSaved(): void;

  /** Get the current workflow data */
  getWorkflow(): Workflow | null;

  /** Trigger save operation */
  save(): Promise<void>;

  /** Trigger export (downloads JSON file) */
  export(): void;
}
```

## `mountWorkflowEditor()`

Mounts just the editor canvas — no navbar, no sidebar. Useful for embedding a minimal editor.

```typescript
import { mountWorkflowEditor } from '@flowdrop/flowdrop/editor';

const editor = await mountWorkflowEditor(container, {
  workflow: myWorkflow,
  nodes: myNodes,
  endpointConfig: createEndpointConfig('/api/flowdrop'),
  portConfig: myPortConfig, // optional, overrides API
  categories: myCategories // optional, overrides API
});
```

Returns the same `MountedFlowDropApp` interface as `mountFlowDropApp()`.

## `mountPlayground()`

Mounts the interactive playground for workflow testing.

```typescript
import { mountPlayground } from '@flowdrop/flowdrop/playground';

const playground = await mountPlayground(container, {
  workflowId: 'my-workflow-id',
  endpointConfig: createEndpointConfig('/api/flowdrop'),
  mode: 'standalone', // 'standalone' | 'embedded' | 'modal'
  config: {
    pollingInterval: 1500,
    shouldStopPolling: (status) => ['completed', 'failed'].includes(status),
    isTerminalStatus: (status) => ['completed', 'failed'].includes(status)
  },
  onSessionStatusChange: (newStatus, previousStatus) => {
    console.log(`${previousStatus} -> ${newStatus}`);
  },
  onClose: () => console.log('Playground closed'), // required for embedded/modal
  height: '600px',
  width: '100%',
  initialSessionId: 'resume-session-id' // optional
});
```

### Playground Return Value

```typescript
interface MountedPlayground {
  /** Destroy and clean up */
  destroy(): void;
  /** Get the current session */
  getCurrentSession(): PlaygroundSession | null;
  /** Get all sessions */
  getSessions(): PlaygroundSession[];
  /** Get message count in current session */
  getMessageCount(): number;
  /** Check if currently executing */
  isExecuting(): boolean;
  /** Stop polling for messages */
  stopPolling(): void;
  /** Restart polling */
  startPolling(): void;
  /** Push poll response data */
  pushMessages(response: PlaygroundMessagesApiResponse): void;
  /** Reset playground state */
  reset(): void;
}
```

## `unmountFlowDropApp()` / `unmountPlayground()`

Clean up a mounted instance. Equivalent to calling `.destroy()` on the returned object.

```typescript
import { unmountFlowDropApp } from '@flowdrop/flowdrop/editor';

unmountFlowDropApp(container);
```

## Lifecycle

1. **Mount** — Call `mountFlowDropApp()` with a container element
2. **Interact** — Use the returned API to control the editor programmatically
3. **Destroy** — Call `.destroy()` or the unmount function to clean up

Registration of custom nodes and fields can happen **before or after** mounting — the registries are singletons that persist for the page lifetime.
