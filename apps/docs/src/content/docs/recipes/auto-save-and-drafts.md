---
title: Auto-Save & Drafts
description: How FlowDrop auto-saves drafts to localStorage and how to manage them.
---

FlowDrop automatically saves drafts of the current workflow to `localStorage`, preventing data loss when the browser closes unexpectedly.

## How It Works

1. When `autoSaveDraft` is enabled (default: `true`), FlowDrop saves the current workflow to `localStorage` periodically
2. The save interval defaults to **30 seconds** (`autoSaveDraftInterval: 30000`)
3. Drafts are keyed by workflow ID
4. When a workflow is loaded, FlowDrop checks for a matching draft and offers to restore it
5. After a successful save to the backend, the draft is cleared

## Configuration

```typescript
const app = await mountFlowDropApp(container, {
  features: {
    autoSaveDraft: true,           // default: true
    autoSaveDraftInterval: 30000   // default: 30000ms (30 seconds)
  },
  // Optional: custom storage key prefix
  draftStorageKey: 'my-app-flowdrop-draft'
});
```

### Disabling Auto-Save

```typescript
features: {
  autoSaveDraft: false
}
```

### Faster Auto-Save

For critical workflows, save more frequently:

```typescript
features: {
  autoSaveDraft: true,
  autoSaveDraftInterval: 10000  // every 10 seconds
}
```

## Manual Draft Management with Events

Use the `onBeforeUnmount` event to save a final draft when the editor is destroyed:

```typescript
eventHandlers: {
  onBeforeUnmount: (workflow, isDirty) => {
    if (isDirty) {
      localStorage.setItem(
        `flowdrop-draft-${workflow.id}`,
        JSON.stringify(workflow)
      );
    }
  }
}
```

## Storage Limits

Browsers typically limit `localStorage` to **5-10MB**. Large workflows with many nodes and complex configurations could approach this limit.

If storage is full:
- The draft save fails silently
- The editor continues working normally
- No data is lost from the active session

## Combining with Backend Save

A typical save flow:

```typescript
eventHandlers: {
  onDirtyStateChange: (isDirty) => {
    // Show/hide "unsaved changes" indicator
    indicator.style.display = isDirty ? 'block' : 'none';
  },
  onAfterSave: async (workflow) => {
    // Draft is automatically cleared after successful save
    showToast('Saved!');
  },
  onSaveError: async (error, workflow) => {
    // Draft is preserved — user can retry
    showToast('Save failed. Your changes are still saved locally.');
  }
}
```

## Next Steps

- [Event System](/guides/advanced/event-system/) — all lifecycle events including save
- [Framework Integration](/guides/integration/) — mount options including features
- [Troubleshooting](/troubleshooting/common-issues/#draft-recovery-not-working) — draft recovery issues
