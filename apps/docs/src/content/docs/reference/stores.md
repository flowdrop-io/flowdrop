---
title: Store API Reference
description: Complete API reference for all FlowDrop reactive stores.
---

FlowDrop uses Svelte 5 rune-based stores for state management. All stores are module-level singletons — import and call getter functions directly.

:::caution[Single Instance]
FlowDrop stores are global singletons. Only one FlowDrop editor instance can exist per page. Mounting a second instance will overwrite the first instance's state.
:::

## workflowStore

The primary store for workflow state, dirty tracking, and node/edge mutations.

### Reactive Getters

```typescript
import {
  getWorkflowStore,
  getIsDirty,
  getWorkflowId,
  getWorkflowName,
  getWorkflowNodes,
  getWorkflowEdges,
  getWorkflowMetadata,
  getWorkflowFormat,
  getWorkflowChanged,
  getWorkflowValidation,
  getConnectedHandles
} from '@d34dman/flowdrop/editor';
```

| Function | Returns | Description |
|----------|---------|-------------|
| `getWorkflowStore()` | `Workflow \| null` | Current workflow object |
| `getIsDirty()` | `boolean` | Whether workflow has unsaved changes |
| `getWorkflowId()` | `string \| null` | Current workflow ID |
| `getWorkflowName()` | `string` | Workflow display name |
| `getWorkflowNodes()` | `WorkflowNode[]` | All nodes |
| `getWorkflowEdges()` | `WorkflowEdge[]` | All edges |
| `getWorkflowMetadata()` | `WorkflowMetadata` | Metadata (created, updated, version) |
| `getWorkflowFormat()` | `string` | Workflow format identifier |
| `getWorkflowChanged()` | `{nodes, edges, name}` | Reactive change tracker |
| `getWorkflowValidation()` | `{hasNodes, hasEdges, nodeCount, edgeCount, isValid}` | Validation summary |
| `getConnectedHandles()` | `Set<string>` | Set of connected port handle IDs |

### Non-Reactive Utilities

```typescript
import { getWorkflow, isDirty, markAsSaved } from '@d34dman/flowdrop/editor';

const workflow = getWorkflow();  // Snapshot, not reactive
const dirty = isDirty();         // Snapshot
markAsSaved();                   // Clears dirty flag
```

### Workflow Actions

```typescript
import { workflowActions } from '@d34dman/flowdrop/editor';
```

| Method | Parameters | Description |
|--------|-----------|-------------|
| `initialize(workflow)` | `Workflow` | Load a workflow into the store |
| `updateWorkflow(workflow)` | `Workflow` | Replace the entire workflow |
| `addNode(node)` | `WorkflowNode` | Add a node |
| `removeNode(nodeId)` | `string` | Remove a node by ID |
| `updateNode(nodeId, updates)` | `string, Partial<WorkflowNode>` | Update node properties |
| `addEdge(edge)` | `WorkflowEdge` | Add an edge |
| `removeEdge(edgeId)` | `string` | Remove an edge by ID |
| `updateNodes(nodes)` | `WorkflowNode[]` | Replace all nodes |
| `updateEdges(edges)` | `WorkflowEdge[]` | Replace all edges |
| `updateName(name)` | `string` | Change workflow name |
| `updateMetadata(metadata)` | `Partial<Workflow['metadata']>` | Update metadata fields |
| `batchUpdate(updates)` | `{nodes?, edges?, name?, description?, metadata?}` | Apply multiple changes atomically |
| `clear()` | — | Reset the store |
| `pushHistory(description?)` | `string?` | Manually push a history snapshot |

### Change Callbacks

```typescript
import { setOnDirtyStateChange, setOnWorkflowChange } from '@d34dman/flowdrop/editor';

setOnDirtyStateChange((isDirty) => {
  console.log('Dirty state:', isDirty);
});

setOnWorkflowChange((workflow, changeType) => {
  console.log('Changed:', changeType);
});
```

---

## historyStore

Manages undo/redo with snapshot-based history.

### Reactive Getters

```typescript
import { getCanUndo, getCanRedo, getHistoryState } from '@d34dman/flowdrop/editor';
```

| Function | Returns | Description |
|----------|---------|-------------|
| `getCanUndo()` | `boolean` | Whether undo is available |
| `getCanRedo()` | `boolean` | Whether redo is available |
| `getHistoryState()` | `HistoryState` | Full history state (entries, current index) |

### History Actions

```typescript
import { historyActions } from '@d34dman/flowdrop/editor';
```

| Method | Returns | Description |
|--------|---------|-------------|
| `undo()` | `boolean` | Undo last change |
| `redo()` | `boolean` | Redo last undone change |
| `clear(currentWorkflow?)` | `void` | Clear all history |
| `startTransaction(workflow, description?)` | `void` | Begin grouping changes |
| `commitTransaction()` | `void` | Commit grouped changes as one step |
| `cancelTransaction()` | `void` | Revert grouped changes |
| `pushState(workflow, options?)` | `void` | Manually push a snapshot |
| `initialize(workflow)` | `void` | Initialize with a starting state |

### Types

```typescript
interface HistoryState {
  entries: HistoryEntry[];
  currentIndex: number;
  maxEntries: number;
}

interface HistoryEntry {
  workflow: Workflow;
  timestamp: number;
  description?: string;
}

interface PushOptions {
  description?: string;
  force?: boolean;
}
```

---

## settingsStore

Manages editor settings with localStorage persistence and optional API sync.

### Reactive Getters

```typescript
import {
  getSettings,
  getThemeSettings,
  getEditorSettings,
  getUiSettings,
  getBehaviorSettings,
  getApiSettings,
  getTheme,
  getResolvedTheme,
  getSyncStatus
} from '@d34dman/flowdrop/settings';
```

| Function | Returns | Description |
|----------|---------|-------------|
| `getSettings()` | `FlowDropSettings` | All settings |
| `getThemeSettings()` | `ThemeSettings` | Theme preferences |
| `getEditorSettings()` | `EditorSettings` | Editor behavior settings |
| `getUiSettings()` | `UISettings` | UI preferences |
| `getBehaviorSettings()` | `BehaviorSettings` | Behavior flags |
| `getApiSettings()` | `ApiSettings` | API configuration |
| `getTheme()` | `ThemePreference` | `'light' \| 'dark' \| 'auto'` |
| `getResolvedTheme()` | `ResolvedTheme` | `'light' \| 'dark'` (after resolving auto) |
| `getSyncStatus()` | `{status, lastSyncedAt, error}` | API sync state |

### Settings Updates

```typescript
import { updateSettings, resetSettings } from '@d34dman/flowdrop/settings';

updateSettings({ theme: { preference: 'dark' } });
resetSettings(['theme', 'editor']);  // Reset specific categories
```

### Theme Functions

```typescript
import { setTheme, toggleTheme, cycleTheme } from '@d34dman/flowdrop/settings';

setTheme('dark');    // Set explicit theme
toggleTheme();       // Toggle light/dark
cycleTheme();        // Cycle light → dark → auto
```

### Change Listener

```typescript
import { onSettingsChange } from '@d34dman/flowdrop/settings';

const unsubscribe = onSettingsChange((newSettings, changedKeys) => {
  console.log('Settings changed:', changedKeys);
});

// Later: unsubscribe();
```

---

## playgroundStore

Manages playground sessions, messages, and execution state.

### Reactive Getters

```typescript
import {
  getCurrentSession,
  getSessions,
  getMessages,
  getIsExecuting,
  getIsLoading,
  getError,
  getMessageCount,
  getChatMessages,
  getLogMessages,
  getInputFields,
  getSessionCount,
  getCurrentSessionId
} from '@d34dman/flowdrop/playground';
```

| Function | Returns | Description |
|----------|---------|-------------|
| `getCurrentSession()` | `PlaygroundSession \| null` | Active session |
| `getSessions()` | `PlaygroundSession[]` | All sessions |
| `getMessages()` | `PlaygroundMessage[]` | All messages in current session |
| `getIsExecuting()` | `boolean` | Whether a workflow is running |
| `getIsLoading()` | `boolean` | Whether data is loading |
| `getError()` | `string \| null` | Current error message |
| `getMessageCount()` | `number` | Total message count |
| `getChatMessages()` | `PlaygroundMessage[]` | Chat-type messages only |
| `getLogMessages()` | `PlaygroundMessage[]` | Log-type messages only |
| `getInputFields()` | `PlaygroundInputField[]` | Available input fields |
| `getSessionCount()` | `number` | Total session count |
| `getCurrentSessionId()` | `string \| null` | Active session ID |

### Playground Actions

```typescript
import { playgroundActions } from '@d34dman/flowdrop/playground';
```

| Method | Description |
|--------|-------------|
| `setCurrentSession(session)` | Set the active session |
| `addSession(session)` | Add a new session |
| `removeSession(sessionId)` | Remove a session |
| `switchSession(sessionId)` | Switch to a different session |
| `addMessage(message)` | Add a message |
| `addMessages(messages)` | Add multiple messages |
| `clearMessages()` | Clear all messages |
| `setExecuting(executing)` | Set execution state |
| `setLoading(loading)` | Set loading state |
| `setError(error)` | Set error message |
| `reset()` | Reset all playground state |

---

## interruptStore

Manages human-in-the-loop interrupts with a state machine for each interrupt's lifecycle.

### Reactive Getters

```typescript
import {
  getPendingInterrupts,
  getPendingInterruptCount,
  getResolvedInterrupts,
  getIsAnySubmitting,
  getInterrupt,
  isInterruptPending,
  isInterruptSubmitting
} from '@d34dman/flowdrop/playground';
```

| Function | Returns | Description |
|----------|---------|-------------|
| `getPendingInterrupts()` | `InterruptWithState[]` | Interrupts awaiting action |
| `getPendingInterruptCount()` | `number` | Count of pending interrupts |
| `getResolvedInterrupts()` | `InterruptWithState[]` | Completed interrupts |
| `getIsAnySubmitting()` | `boolean` | Whether any interrupt is being submitted |
| `getInterrupt(id)` | `InterruptWithState \| undefined` | Get interrupt by ID |
| `isInterruptPending(id)` | `boolean` | Check if specific interrupt is pending |
| `isInterruptSubmitting(id)` | `boolean` | Check if specific interrupt is submitting |

### Interrupt Actions

```typescript
import { interruptActions } from '@d34dman/flowdrop/playground';
```

| Method | Description |
|--------|-------------|
| `addInterrupt(interrupt)` | Add an interrupt |
| `addInterrupts(interrupts)` | Add multiple interrupts |
| `startSubmit(id, value)` | Begin submitting a response |
| `submitSuccess(id)` | Mark submission as successful |
| `submitFailure(id, error)` | Mark submission as failed |
| `startCancel(id)` | Begin cancelling an interrupt |
| `retry(id)` | Retry a failed submission |
| `resolveInterrupt(id, value)` | Resolve an interrupt |
| `cancelInterrupt(id)` | Cancel an interrupt |
| `clearInterrupts()` | Clear all interrupts |
| `reset()` | Reset the store |

### State Machine

Each interrupt transitions through these states:

```
pending → submitting → resolved
                    → error → submitting (retry)
pending → cancelling → cancelled
```

---

## categoriesStore

Manages node category definitions.

```typescript
import {
  getCategories,
  getCategoryLabel,
  getCategoryIcon,
  getCategoryColor,
  getCategoryDefinition,
  initializeCategories
} from '@d34dman/flowdrop/editor';
```

| Function | Returns | Description |
|----------|---------|-------------|
| `getCategories()` | `CategoryDefinition[]` | All categories sorted by weight |
| `getCategoryLabel(category)` | `string` | Display label for a category |
| `getCategoryIcon(category)` | `string` | Iconify icon ID for a category |
| `getCategoryColor(category)` | `string` | CSS color for a category |
| `getCategoryDefinition(category)` | `CategoryDefinition \| undefined` | Full definition |
| `initializeCategories(categories)` | `void` | Load categories from API |

---

## Next Steps

- [Store System Guide](/guides/advanced/store-system/) — patterns and best practices
- [Event System](/guides/advanced/event-system/) — events that complement store reads
- [Undo & Redo](/recipes/undo-redo/) — using historyStore in practice
