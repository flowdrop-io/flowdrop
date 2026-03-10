---
title: Store System
description: Understand FlowDrop's reactive state management for programmatic access.
sidebar:
  badge:
    text: 'Advanced'
    variant: caution
---

FlowDrop uses **Svelte 5 runes** for reactive state management. Stores are module-level singletons that hold the editor's state. While most developers won't need to interact with stores directly, they're essential for advanced integrations.

:::caution[Single Instance]
Stores are module-level singletons. Only **one FlowDrop editor** can exist per page. Mounting a second instance shares state with the first.
:::

## Workflow Store

The central store holding the current workflow state.

### Reading State

```typescript
import {
  getWorkflowStore,
  getIsDirty,
  getWorkflowNodes,
  getWorkflowEdges,
  getWorkflowName,
  getWorkflowValidation
} from '@flowdrop/flowdrop/editor';

// Reactive getters (re-evaluate when state changes)
const workflow = getWorkflowStore();    // Workflow | null
const isDirty = getIsDirty();           // boolean
const nodes = getWorkflowNodes();       // WorkflowNode[]
const edges = getWorkflowEdges();       // WorkflowEdge[]
const name = getWorkflowName();         // string
const validation = getWorkflowValidation();
// { hasNodes, hasEdges, nodeCount, edgeCount, isValid }
```

### Modifying State

```typescript
import { workflowActions } from '@flowdrop/flowdrop/editor';

// Initialize with a loaded workflow
workflowActions.initialize(workflow);

// Node operations
workflowActions.addNode(newNode);
workflowActions.removeNode('node-id');
workflowActions.updateNode('node-id', { data: { ...updates } });

// Edge operations
workflowActions.addEdge(newEdge);
workflowActions.removeEdge('edge-id');

// Metadata
workflowActions.updateName('New Workflow Name');
workflowActions.updateMetadata({ tags: ['production'] });

// Batch update (single history entry)
workflowActions.batchUpdate({
  nodes: updatedNodes,
  edges: updatedEdges,
  name: 'Updated Name'
});

// Clear everything
workflowActions.clear();
```

### Dirty State

```typescript
import { markAsSaved, isDirty } from '@flowdrop/flowdrop/editor';

// Check dirty state (non-reactive)
if (isDirty()) {
  console.log('There are unsaved changes');
}

// Clear dirty flag after saving
markAsSaved();
```

## History Store

Manages undo/redo with snapshot-based history.

```typescript
import {
  getCanUndo,
  getCanRedo,
  historyActions
} from '@flowdrop/flowdrop/editor';

// Check availability (reactive)
const canUndo = getCanUndo(); // boolean
const canRedo = getCanRedo(); // boolean

// Perform undo/redo
historyActions.undo();  // returns boolean (success)
historyActions.redo();  // returns boolean (success)

// Manual history management
historyActions.pushState(workflow, { description: 'Bulk import' });
historyActions.clear(currentWorkflow);

// Transactions (group multiple changes into one undo step)
historyActions.startTransaction(workflow, 'Rearrange nodes');
// ... make multiple changes ...
historyActions.commitTransaction();
// or: historyActions.cancelTransaction();
```

## Settings Store

User preferences for theme, editor behavior, and UI.

```typescript
import {
  getSettings,
  getThemeSettings,
  getEditorSettings,
  getUiSettings,
  updateSettings,
  resetSettings
} from '@flowdrop/flowdrop/settings';

// Read settings (reactive)
const settings = getSettings();           // FlowDropSettings
const theme = getThemeSettings();         // ThemeSettings
const editor = getEditorSettings();       // EditorSettings
const ui = getUiSettings();               // UISettings

// Update settings
updateSettings({
  theme: { preference: 'dark' },
  editor: { snapToGrid: true, gridSize: 20 }
});

// Reset to defaults
resetSettings(); // reset all
resetSettings(['theme']); // reset only theme

// Subscribe to changes
const unsubscribe = onSettingsChange((newSettings, oldSettings) => {
  console.log('Settings changed:', newSettings);
});
// Later: unsubscribe();
```

### Theme Control

```typescript
import {
  getTheme,
  getResolvedTheme,
  setTheme,
  toggleTheme,
  cycleTheme
} from '@flowdrop/flowdrop/core';

getTheme();         // 'light' | 'dark' | 'auto'
getResolvedTheme(); // 'light' | 'dark' (actual applied theme)
setTheme('dark');
toggleTheme();      // light ↔ dark
cycleTheme();       // light → dark → auto → light
```

## Playground Store

Manages interactive testing sessions and messages.

```typescript
import {
  getCurrentSession,
  getSessions,
  getMessages,
  getChatMessages,
  getLogMessages,
  getIsExecuting,
  playgroundActions
} from '@flowdrop/flowdrop/playground';

// Read state (reactive)
const session = getCurrentSession();   // PlaygroundSession | null
const sessions = getSessions();        // PlaygroundSession[]
const messages = getMessages();        // PlaygroundMessage[]
const chatMsgs = getChatMessages();    // PlaygroundMessage[] (user/assistant only)
const logMsgs = getLogMessages();      // PlaygroundMessage[] (system only)
const isRunning = getIsExecuting();    // boolean
```

## Interrupt Store

Manages human-in-the-loop interrupt state.

```typescript
import {
  getPendingInterrupts,
  getResolvedInterrupts,
  interruptActions
} from '@flowdrop/flowdrop/playground';

// Read state (reactive)
const pending = getPendingInterrupts();    // Interrupt[]
const resolved = getResolvedInterrupts();  // Interrupt[]
```

## Using Stores in Svelte Components

Since stores use Svelte 5 runes, you can use them directly in `.svelte` files with `$derived`:

```svelte
<script>
  import { getWorkflowNodes, getIsDirty } from '@flowdrop/flowdrop/editor';

  const nodes = $derived(getWorkflowNodes());
  const isDirty = $derived(getIsDirty());
</script>

<p>Nodes: {nodes.length}</p>
<p>Unsaved: {isDirty ? 'Yes' : 'No'}</p>
```

## Using Stores Outside Svelte

For vanilla JS or other frameworks, call the getter functions directly. They return the current value at call time:

```typescript
// Polling pattern
setInterval(() => {
  const workflow = getWorkflowStore();
  const dirty = getIsDirty();
  externalUI.update({ workflow, dirty });
}, 1000);
```

For event-driven updates, use the [event system](/guides/advanced/event-system/) instead of polling:

```typescript
eventHandlers: {
  onWorkflowChange: (workflow) => externalUI.update(workflow),
  onDirtyStateChange: (isDirty) => externalUI.setDirty(isDirty)
}
```
