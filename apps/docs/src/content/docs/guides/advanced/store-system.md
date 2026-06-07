---
title: Store System
description: Understand FlowDrop's reactive state management for programmatic access.
---

FlowDrop uses **Svelte 5 runes** for reactive state management. Each mounted editor owns an isolated `FlowDropInstance` container holding its stores. While most developers won't need to interact with stores directly, they're essential for advanced integrations.

## Reaching a store

In 2.0 there are **no module-level store functions** — instances are the API. Reach a store one of two ways:

- **`getInstance()` inside a FlowDrop component** returns the owning `FlowDropInstance`. For single-editor embeds it resolves the page-default instance automatically.
- **The mount handle's `.instance`** (`const fd = (await mountFlowDropApp(...)).instance`) lets you reach a specific editor's stores from vanilla JS or another framework. You can also construct one with `createFlowDropInstance({ id })` from `@flowdrop/flowdrop/editor` and pass it as the `instance` prop.

The instance members are `fd.workflow`, `fd.history` / `fd.historyBindings`, `fd.playground`, `fd.interrupts`, `fd.categories`, `fd.portCoordinates`, `fd.pipelinePanel`, `fd.api`, `fd.nodes`, `fd.fields`, `fd.formats`, and `fd.portCompatibility`. See the [multiple instances guide](/guides/multiple-instances/) for scoping multiple editors.

```typescript
import { getInstance } from '@flowdrop/flowdrop/editor';
const fd = getInstance();
```

## Workflow Store (`fd.workflow`)

The central store holding the current workflow state.

### Reading State

```typescript
// Reactive getters (re-evaluate when state changes)
const workflow = fd.workflow.current; // Workflow | null
const isDirty = fd.workflow.isDirty; // boolean
const nodes = fd.workflow.nodes; // WorkflowNode[]
const edges = fd.workflow.edges; // WorkflowEdge[]
const name = fd.workflow.name; // string
const validation = fd.workflow.validation;
// { hasNodes, hasEdges, nodeCount, edgeCount, isValid }
```

### Modifying State

```typescript
const { actions } = fd.workflow;

// Initialize with a loaded workflow
actions.initialize(workflow);

// Node operations
actions.addNode(newNode);
actions.removeNode('node-id');
actions.updateNode('node-id', { data: { ...updates } });

// Edge operations
actions.addEdge(newEdge);
actions.removeEdge('edge-id');

// Metadata
actions.updateName('New Workflow Name');
actions.updateMetadata({ tags: ['production'] });

// Batch update (single history entry)
actions.batchUpdate({
  nodes: updatedNodes,
  edges: updatedEdges,
  name: 'Updated Name'
});

// Clear everything
actions.clear();
```

### Dirty State

```typescript
// Check dirty state
if (fd.workflow.isDirty) {
  console.log('There are unsaved changes');
}

// Clear dirty flag after saving
fd.workflow.markAsSaved();
```

## History Store (`fd.historyBindings`)

Manages undo/redo with snapshot-based history. `fd.historyBindings` is the reactive rune wrapper around `fd.history` (the underlying `HistoryService`).

```typescript
// Check availability (reactive getters)
const canUndo = fd.historyBindings.canUndo; // boolean
const canRedo = fd.historyBindings.canRedo; // boolean

// Perform undo/redo (bound actions — safe to detach)
fd.historyBindings.undo(); // returns boolean (success)
fd.historyBindings.redo(); // returns boolean (success)

// Manual history management
fd.historyBindings.pushState(workflow, { description: 'Bulk import' });
fd.historyBindings.clear(fd.workflow.current);

// Transactions (group multiple changes into one undo step)
fd.historyBindings.startTransaction(fd.workflow.current, 'Rearrange nodes');
// ... make multiple changes ...
fd.historyBindings.commitTransaction();
// or: fd.historyBindings.cancelTransaction();
```

## Settings Store

User preferences for theme, editor behavior, and UI. Settings are **page-global by design** — they are not instance-scoped, so these remain module-level functions.

```typescript
import {
  getSettings,
  themeSettings,
  editorSettings,
  uiSettings,
  updateSettings,
  resetSettings,
  onSettingsChange
} from '@flowdrop/flowdrop/settings';

// Read settings (reactive)
const settings = getSettings(); // FlowDropSettings
const theme = themeSettings(); // ThemeSettings
const editor = editorSettings(); // EditorSettings
const ui = uiSettings(); // UISettings

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

Theme is also page-global:

```typescript
import { theme, resolvedTheme, setTheme, toggleTheme, cycleTheme } from '@flowdrop/flowdrop/core';

theme(); // 'light' | 'dark' | 'auto'
resolvedTheme(); // 'light' | 'dark' (actual applied theme)
setTheme('dark');
toggleTheme(); // light ↔ dark
cycleTheme(); // light → dark → auto → light
```

## Playground Store (`fd.playground`)

Manages interactive testing sessions and messages.

```typescript
// Read state (reactive getters)
const session = fd.playground.currentSession; // PlaygroundSession | null
const sessions = fd.playground.sessions; // PlaygroundSession[]
const messages = fd.playground.messages; // PlaygroundMessage[]
const chatMsgs = fd.playground.chatMessages; // PlaygroundMessage[] (user/assistant only)
const logMsgs = fd.playground.logMessages; // PlaygroundMessage[] (system only)
const isRunning = fd.playground.isExecuting; // boolean
```

## Interrupt Store (`fd.interrupts`)

Manages human-in-the-loop interrupt state.

```typescript
// Read state
const pending = fd.interrupts.getPending(); // InterruptWithState[]
const resolved = fd.interrupts.getResolved(); // InterruptWithState[]
const pendingCount = fd.interrupts.getPendingCount(); // number
```

## Using Stores in Svelte Components

Since stores use Svelte 5 runes, read their getters inside `$derived`:

```svelte
<script>
  import { getInstance } from '@flowdrop/flowdrop/editor';

  const fd = getInstance();
  const nodes = $derived(fd.workflow.nodes);
  const isDirty = $derived(fd.workflow.isDirty);
</script>

<p>Nodes: {nodes.length}</p><p>Unsaved: {isDirty ? 'Yes' : 'No'}</p>
```

## Using Stores Outside Svelte

For vanilla JS or other frameworks, hold the mount handle's `.instance` and read its getters at call time:

```typescript
const fd = (await mountFlowDropApp(container, options)).instance;

// Polling pattern
setInterval(() => {
  const workflow = fd.workflow.current;
  const dirty = fd.workflow.isDirty;
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
