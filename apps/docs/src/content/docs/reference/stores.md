---
title: Store API Reference
description: Complete API reference for all FlowDrop reactive stores.
---

FlowDrop uses Svelte 5 rune-based stores for state management. In 2.0 there are **no module-level store functions** — every store lives on the per-mount `FlowDropInstance`.

:::note[Reaching a store]
Resolve the owning instance with `getInstance()` inside a FlowDrop component (it resolves the page-default instance for single-editor embeds), or hold the mount handle's `.instance` outside the component tree. New exports from `@flowdrop/flowdrop/editor`: `createFlowDropInstance`, `getInstance`, `provideInstance`, the `FlowDropInstance` type, and the store classes `WorkflowStore`, `HistoryStore`, `HistoryService`, `PortCoordinateStore` (`PlaygroundStore` and `InterruptStore` export from `@flowdrop/flowdrop/playground`). See the [multiple instances guide](/guides/multiple-instances/).

```typescript
import { getInstance } from '@flowdrop/flowdrop/editor';
const fd = getInstance();
```

:::

## `fd.workflow` (WorkflowStore)

The primary store for workflow state, dirty tracking, and node/edge mutations.

### Reactive Getters

| Getter                         | Returns                                               | Description                                |
| ------------------------------ | ----------------------------------------------------- | ------------------------------------------ |
| `fd.workflow.current`          | `Workflow \| null`                                    | Current workflow object                    |
| `fd.workflow.isDirty`          | `boolean`                                             | Whether workflow has unsaved changes       |
| `fd.workflow.id`               | `string \| null`                                      | Current workflow ID                        |
| `fd.workflow.name`             | `string`                                              | Workflow display name                      |
| `fd.workflow.nodes`            | `WorkflowNode[]`                                      | All nodes                                  |
| `fd.workflow.edges`            | `WorkflowEdge[]`                                      | All edges                                  |
| `fd.workflow.metadata`         | `WorkflowMetadata`                                    | Metadata (created, updated, schemaVersion) |
| `fd.workflow.format`           | `string`                                              | Workflow format identifier                 |
| `fd.workflow.validation`       | `{hasNodes, hasEdges, nodeCount, edgeCount, isValid}` | Validation summary                         |
| `fd.workflow.connectedHandles` | `Set<string>`                                         | Set of connected port handle IDs           |

### Non-Reactive Utilities

```typescript
const dirty = fd.workflow.isDirty; // current value
fd.workflow.markAsSaved(); // Clears dirty flag
```

### Workflow Actions

```typescript
const { actions } = fd.workflow;
```

| Method                        | Parameters                                         | Description                       |
| ----------------------------- | -------------------------------------------------- | --------------------------------- |
| `initialize(workflow)`        | `Workflow`                                         | Load a workflow into the store    |
| `updateWorkflow(workflow)`    | `Workflow`                                         | Replace the entire workflow       |
| `addNode(node)`               | `WorkflowNode`                                     | Add a node                        |
| `removeNode(nodeId)`          | `string`                                           | Remove a node by ID               |
| `updateNode(nodeId, updates)` | `string, Partial<WorkflowNode>`                    | Update node properties            |
| `addEdge(edge)`               | `WorkflowEdge`                                     | Add an edge                       |
| `removeEdge(edgeId)`          | `string`                                           | Remove an edge by ID              |
| `updateNodes(nodes)`          | `WorkflowNode[]`                                   | Replace all nodes                 |
| `updateEdges(edges)`          | `WorkflowEdge[]`                                   | Replace all edges                 |
| `updateName(name)`            | `string`                                           | Change workflow name              |
| `updateMetadata(metadata)`    | `Partial<Workflow['metadata']>`                    | Update metadata fields            |
| `batchUpdate(updates)`        | `{nodes?, edges?, name?, description?, metadata?}` | Apply multiple changes atomically |
| `clear()`                     | —                                                  | Reset the store                   |
| `pushHistory(description?)`   | `string?`                                          | Manually push a history snapshot  |

### Change Callbacks

```typescript
fd.workflow.setOnDirtyStateChange((isDirty) => {
  console.log('Dirty state:', isDirty);
});

fd.workflow.setOnWorkflowChange((workflow, changeType) => {
  console.log('Changed:', changeType);
});
```

---

## `fd.historyBindings` (HistoryStore)

Manages undo/redo with snapshot-based history — the reactive rune wrapper around `fd.history` (the underlying `HistoryService`).

### Reactive Getters

| Getter                       | Returns   | Description               |
| ---------------------------- | --------- | ------------------------- |
| `fd.historyBindings.canUndo` | `boolean` | Whether undo is available |
| `fd.historyBindings.canRedo` | `boolean` | Whether redo is available |

### History Actions

| Method                                     | Returns   | Description                        |
| ------------------------------------------ | --------- | ---------------------------------- |
| `undo()`                                   | `boolean` | Undo last change                   |
| `redo()`                                   | `boolean` | Redo last undone change            |
| `clear(currentWorkflow?)`                  | `void`    | Clear all history                  |
| `startTransaction(workflow, description?)` | `void`    | Begin grouping changes             |
| `commitTransaction()`                      | `void`    | Commit grouped changes as one step |
| `cancelTransaction()`                      | `void`    | Revert grouped changes             |
| `pushState(workflow, options?)`            | `void`    | Manually push a snapshot           |
| `initialize(workflow)`                     | `void`    | Initialize with a starting state   |

```typescript
fd.historyBindings.undo();
fd.historyBindings.startTransaction(fd.workflow.current, 'Rearrange');
```

---

## settingsStore

Manages editor settings with localStorage persistence and optional API sync. Settings are **page-global by design** — not instance-scoped, so they remain module-level functions.

### Reactive Getters

```typescript
import {
  getSettings,
  themeSettings,
  editorSettings,
  uiSettings,
  behaviorSettings,
  apiSettings,
  theme,
  resolvedTheme,
  syncStatusStore
} from '@flowdrop/flowdrop/settings'; // theme/resolvedTheme also on /core
```

| Function             | Returns                         | Description                                |
| -------------------- | ------------------------------- | ------------------------------------------ |
| `getSettings()`      | `FlowDropSettings`              | All settings                               |
| `themeSettings()`    | `ThemeSettings`                 | Theme preferences                          |
| `editorSettings()`   | `EditorSettings`                | Editor behavior settings                   |
| `uiSettings()`       | `UISettings`                    | UI preferences                             |
| `behaviorSettings()` | `BehaviorSettings`              | Behavior flags                             |
| `apiSettings()`      | `ApiSettings`                   | API configuration                          |
| `theme()`            | `ThemePreference`               | `'light' \| 'dark' \| 'auto'`              |
| `resolvedTheme()`    | `ResolvedTheme`                 | `'light' \| 'dark'` (after resolving auto) |
| `syncStatusStore()`  | `{status, lastSyncedAt, error}` | API sync state                             |

### Settings Updates

```typescript
import { updateSettings, resetSettings } from '@flowdrop/flowdrop/settings';

updateSettings({ theme: { preference: 'dark' } });
resetSettings(['theme', 'editor']); // Reset specific categories
```

### Theme Functions

```typescript
import { setTheme, toggleTheme, cycleTheme } from '@flowdrop/flowdrop/core';

setTheme('dark'); // Set explicit theme
toggleTheme(); // Toggle light/dark
cycleTheme(); // Cycle light → dark → auto
```

### Change Listener

```typescript
import { onSettingsChange } from '@flowdrop/flowdrop/settings';

const unsubscribe = onSettingsChange((newSettings, oldSettings) => {
  console.log('Settings changed');
});

// Later: unsubscribe();
```

---

## `fd.playground` (PlaygroundStore)

Manages playground sessions, messages, and execution state.

### Reactive Getters

| Getter                         | Returns                     | Description                     |
| ------------------------------ | --------------------------- | ------------------------------- |
| `fd.playground.currentSession` | `PlaygroundSession \| null` | Active session                  |
| `fd.playground.sessions`       | `PlaygroundSession[]`       | All sessions                    |
| `fd.playground.messages`       | `PlaygroundMessage[]`       | All messages in current session |
| `fd.playground.isExecuting`    | `boolean`                   | Whether a workflow is running   |
| `fd.playground.isLoading`      | `boolean`                   | Whether data is loading         |
| `fd.playground.error`          | `string \| null`            | Current error message           |
| `fd.playground.messageCount`   | `number`                    | Total message count             |
| `fd.playground.chatMessages`   | `PlaygroundMessage[]`       | Chat-type messages only         |
| `fd.playground.logMessages`    | `PlaygroundMessage[]`       | Log-type messages only          |
| `fd.playground.inputFields`    | `PlaygroundInputField[]`    | Available input fields          |
| `fd.playground.sessionCount`   | `number`                    | Total session count             |

### Playground Actions

```typescript
const { actions } = fd.playground;
```

| Method                                   | Description                                      |
| ---------------------------------------- | ------------------------------------------------ |
| `setCurrentSession(session)`             | Set the active session                           |
| `addSession(session)`                    | Add a new session                                |
| `removeSession(sessionId)`               | Remove a session                                 |
| `switchSession(sessionId)`               | Switch to a different session                    |
| `addMessage(message)`                    | Add a message                                    |
| `addMessages(messages)`                  | Add multiple messages                            |
| `clearMessages()`                        | Clear all messages                               |
| `updateSessionStatus(sessionId, status)` | Update a session's status (drives `isExecuting`) |
| `setLoading(loading)`                    | Set loading state                                |
| `setError(error)`                        | Set error message                                |
| `reset()`                                | Reset all playground state                       |

---

## `fd.interrupts` (InterruptStore)

Manages human-in-the-loop interrupts with a state machine for each interrupt's lifecycle.

### Query Methods

| Method                               | Returns                           | Description                               |
| ------------------------------------ | --------------------------------- | ----------------------------------------- |
| `fd.interrupts.getPending()`         | `InterruptWithState[]`            | Interrupts awaiting action                |
| `fd.interrupts.getPendingCount()`    | `number`                          | Count of pending interrupts               |
| `fd.interrupts.getResolved()`        | `InterruptWithState[]`            | Completed interrupts                      |
| `fd.interrupts.getIsAnySubmitting()` | `boolean`                         | Whether any interrupt is being submitted  |
| `fd.interrupts.getInterrupt(id)`     | `InterruptWithState \| undefined` | Get interrupt by ID                       |
| `fd.interrupts.isPending(id)`        | `boolean`                         | Check if specific interrupt is pending    |
| `fd.interrupts.isSubmitting(id)`     | `boolean`                         | Check if specific interrupt is submitting |

### Interrupt Actions

```typescript
const { actions } = fd.interrupts;
```

| Method                        | Description                   |
| ----------------------------- | ----------------------------- |
| `addInterrupt(interrupt)`     | Add an interrupt              |
| `addInterrupts(interrupts)`   | Add multiple interrupts       |
| `startSubmit(id, value)`      | Begin submitting a response   |
| `submitSuccess(id)`           | Mark submission as successful |
| `submitFailure(id, error)`    | Mark submission as failed     |
| `startCancel(id)`             | Begin cancelling an interrupt |
| `retry(id)`                   | Retry a failed submission     |
| `resolveInterrupt(id, value)` | Resolve an interrupt          |
| `cancelInterrupt(id)`         | Cancel an interrupt           |
| `clearInterrupts()`           | Clear all interrupts          |
| `reset()`                     | Reset the store               |

### State Machine

Each interrupt transitions through these states:

```
pending → submitting → resolved
                    → error → submitting (retry)
pending → cancelling → cancelled
```

---

## `fd.categories` (CategoriesStore)

Manages node category definitions.

| Member                                  | Returns                           | Description                     |
| --------------------------------------- | --------------------------------- | ------------------------------- |
| `fd.categories.categories`              | `CategoryDefinition[]`            | All categories sorted by weight |
| `fd.categories.getLabel(category)`      | `string`                          | Display label for a category    |
| `fd.categories.getIcon(category)`       | `string`                          | Iconify icon ID for a category  |
| `fd.categories.getColor(category)`      | `string`                          | CSS color for a category        |
| `fd.categories.getDefinition(category)` | `CategoryDefinition \| undefined` | Full definition                 |
| `fd.categories.initialize(categories)`  | `void`                            | Load categories from API        |

---

## Next Steps

- [Store System Guide](/guides/advanced/store-system/) — patterns and best practices
- [Event System](/guides/advanced/event-system/) — events that complement store reads
- [Undo & Redo](/recipes/undo-redo/) — using history in practice
