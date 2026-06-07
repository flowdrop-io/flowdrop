---
title: Undo & Redo
description: How FlowDrop's undo/redo system works and how to use it programmatically.
---

FlowDrop provides built-in undo/redo that tracks every workflow change.

## Keyboard Shortcuts

| Shortcut               | Action |
| ---------------------- | ------ |
| `Ctrl/Cmd + Z`         | Undo   |
| `Ctrl/Cmd + Shift + Z` | Redo   |

These work automatically — no configuration needed.

## How It Works

FlowDrop's history store takes **snapshots** of the entire workflow state. Each change (node add/remove/move, edge add/remove, config change) pushes a new snapshot onto the undo stack.

- **Undo** restores the previous snapshot and pushes the current state onto the redo stack
- **Redo** restores the next snapshot from the redo stack
- Making a new change after undoing clears the redo stack

## Programmatic Access

History lives on the instance — resolve it with `getInstance()` inside the component tree (or use the mount handle's `.instance`):

```typescript
import { getInstance } from '@flowdrop/flowdrop/editor';
const fd = getInstance();

// Check availability — reactive getters on historyBindings
const canUndo = fd.historyBindings.canUndo; // boolean
const canRedo = fd.historyBindings.canRedo; // boolean

// Perform undo/redo (HistoryStore actions are bound — safe to detach)
fd.historyBindings.undo();
fd.historyBindings.redo();

// Clear history
fd.historyBindings.clear(fd.workflow.current);
```

## Transactions

Group multiple changes into a single undo step:

```typescript
import { getInstance } from '@flowdrop/flowdrop/editor';
const fd = getInstance();

// Start a transaction
fd.historyBindings.startTransaction(fd.workflow.current, 'Rearrange layout');

// Make multiple changes — none are recorded individually
fd.workflow.actions.updateNode('node-1', { position: { x: 100, y: 200 } });
fd.workflow.actions.updateNode('node-2', { position: { x: 300, y: 200 } });
fd.workflow.actions.updateNode('node-3', { position: { x: 500, y: 200 } });

// Commit — all changes become one undo step
fd.historyBindings.commitTransaction();

// Or cancel — all changes revert
// fd.historyBindings.cancelTransaction();
```

## Building Custom Undo/Redo Buttons

Outside the component tree, hold the mount handle and read `.instance`:

```typescript
const app = await mountFlowDropApp(container, options);
const fd = app.instance;

const undoBtn = document.getElementById('undo');
const redoBtn = document.getElementById('redo');

undoBtn.addEventListener('click', () => fd.historyBindings.undo());
redoBtn.addEventListener('click', () => fd.historyBindings.redo());

// Update button state (polling — for non-Svelte frameworks)
setInterval(() => {
  undoBtn.disabled = !fd.historyBindings.canUndo;
  redoBtn.disabled = !fd.historyBindings.canRedo;
}, 500);
```

In Svelte, resolve the instance and use reactivity instead of polling:

```svelte
<script>
  import { getInstance } from '@flowdrop/flowdrop/editor';
  const fd = getInstance();
  const canUndo = $derived(fd.historyBindings.canUndo);
  const canRedo = $derived(fd.historyBindings.canRedo);
</script>

<button disabled={!canUndo} onclick={() => fd.historyBindings.undo()}>Undo</button>
<button disabled={!canRedo} onclick={() => fd.historyBindings.redo()}>Redo</button>
```

## Next Steps

- [Store System](/guides/advanced/store-system/) — all stores including history
- [Event System](/guides/advanced/event-system/) — `onWorkflowChange` fires after undo/redo
