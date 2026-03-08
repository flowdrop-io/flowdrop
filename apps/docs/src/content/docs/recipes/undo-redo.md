---
title: Undo & Redo
description: How FlowDrop's undo/redo system works and how to use it programmatically.
---

FlowDrop provides built-in undo/redo that tracks every workflow change.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |

These work automatically — no configuration needed.

## How It Works

FlowDrop's history store takes **snapshots** of the entire workflow state. Each change (node add/remove/move, edge add/remove, config change) pushes a new snapshot onto the undo stack.

- **Undo** restores the previous snapshot and pushes the current state onto the redo stack
- **Redo** restores the next snapshot from the redo stack
- Making a new change after undoing clears the redo stack

## Programmatic Access

```typescript
import {
  getCanUndo,
  getCanRedo,
  historyActions
} from '@d34dman/flowdrop/editor';

// Check availability
const canUndo = getCanUndo(); // boolean (reactive in Svelte)
const canRedo = getCanRedo(); // boolean

// Perform undo/redo
const undoSuccess = historyActions.undo();  // returns boolean
const redoSuccess = historyActions.redo();  // returns boolean

// Clear history
historyActions.clear(currentWorkflow);
```

## Transactions

Group multiple changes into a single undo step:

```typescript
import { historyActions, workflowActions } from '@d34dman/flowdrop/editor';

// Start a transaction
historyActions.startTransaction(currentWorkflow, 'Rearrange layout');

// Make multiple changes — none are recorded individually
workflowActions.updateNode('node-1', { position: { x: 100, y: 200 } });
workflowActions.updateNode('node-2', { position: { x: 300, y: 200 } });
workflowActions.updateNode('node-3', { position: { x: 500, y: 200 } });

// Commit — all changes become one undo step
historyActions.commitTransaction();

// Or cancel — all changes revert
// historyActions.cancelTransaction();
```

## Building Custom Undo/Redo Buttons

```typescript
import { getCanUndo, getCanRedo, historyActions } from '@d34dman/flowdrop/editor';

// Create buttons
const undoBtn = document.getElementById('undo');
const redoBtn = document.getElementById('redo');

undoBtn.addEventListener('click', () => historyActions.undo());
redoBtn.addEventListener('click', () => historyActions.redo());

// Update button state (polling — for non-Svelte frameworks)
setInterval(() => {
  undoBtn.disabled = !getCanUndo();
  redoBtn.disabled = !getCanRedo();
}, 500);
```

In Svelte, use reactivity instead of polling:

```svelte
<script>
  import { getCanUndo, getCanRedo, historyActions } from '@d34dman/flowdrop/editor';
  const canUndo = $derived(getCanUndo());
  const canRedo = $derived(getCanRedo());
</script>

<button disabled={!canUndo} onclick={() => historyActions.undo()}>Undo</button>
<button disabled={!canRedo} onclick={() => historyActions.redo()}>Redo</button>
```

## Next Steps

- [Store System](/guides/advanced/store-system/) — all stores including history
- [Event System](/guides/advanced/event-system/) — `onWorkflowChange` fires after undo/redo
