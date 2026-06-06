---
title: Auto-Save & Drafts
description: How FlowDrop auto-saves drafts to browser storage and how to manage them.
---

FlowDrop automatically saves drafts of the current workflow to browser storage (`localStorage` by default), preventing data loss when the browser closes unexpectedly.

## How It Works

1. When `autoSaveDraft` is enabled (default: `true`), FlowDrop saves the current workflow to draft storage periodically
2. The save interval defaults to **30 seconds** (`autoSaveDraftInterval: 30000`)
3. Drafts are keyed by workflow ID
4. When a workflow is loaded, FlowDrop checks for a matching draft and offers to restore it
5. After a successful save to the backend, the draft is cleared

## Configuration

```typescript
const app = await mountFlowDropApp(container, {
  features: {
    autoSaveDraft: true, // default: true
    autoSaveDraftInterval: 30000 // default: 30000ms (30 seconds)
  },
  // Optional: custom storage key prefix
  draftStorageKey: 'my-app-flowdrop-draft',
  // Optional: storage backend — 'local' (default), 'session', or a custom adapter
  draftStorage: 'local'
});
```

## Security Considerations

Drafts contain the **complete workflow JSON, including node configuration values**. If your users enter API keys, tokens, or other secrets into node configs, those values end up in browser storage in plain text. Keep in mind:

- On the default `'local'` backend, drafts remain stored on the device **even after the tab or browser is closed**, until they are saved or cleared
- Neither `localStorage` nor `sessionStorage` protects against same-origin script access (XSS) — both are readable by any script running on your page
- On shared browser profiles, leftover drafts are readable by the next user via DevTools

Mitigations, in increasing order of strictness:

1. Call [`clearAllDrafts()` on logout](#clearing-drafts-on-logout)
2. Use `draftStorage: 'session'` so drafts are removed when the tab closes
3. Supply a custom `DraftStorageAdapter` (e.g. an in-memory store)
4. Disable drafts entirely with `features: { autoSaveDraft: false }`

End users can also opt out themselves at any time via the **"Store Drafts in Browser"** toggle in the Behavior tab of the settings panel — turning it off stops draft writes and removes the current draft.

:::caution
The user toggle applies **per tab**: other tabs that are already open read settings at load time and keep writing drafts until they are reloaded. If you need a hard guarantee across tabs, disable drafts at mount time instead.
:::

## Choosing a Storage Backend

The `draftStorage` mount option controls where drafts live:

| Value               | Backend          | Survives reload | Survives tab close | Notes                                                   |
| ------------------- | ---------------- | --------------- | ------------------ | ------------------------------------------------------- |
| `'local'` (default) | `localStorage`   | ✅              | ✅                 | Best crash recovery; clear on logout for shared devices |
| `'session'`         | `sessionStorage` | ✅              | ❌                 | Per-tab; drafts do **not** survive crash-and-reopen     |
| custom adapter      | up to you        | —               | —                  | Implement `DraftStorageAdapter`                         |

The resolved backend is captured per mount, so multiple FlowDrop instances on one page can use different backends without interfering. (The standalone `clearAllDrafts()` helper uses the most recent mount's backend unless you pass it an adapter explicitly.)

A custom adapter implements four **synchronous** methods. Async backends — IndexedDB, network storage, WebCrypto encryption — cannot implement the interface directly; put a synchronous in-memory cache in front and flush to the async backend separately. Beware that an `async` method will type-check here (a Promise is assignable to `void`), but its errors are silently swallowed.

```typescript
import type { DraftStorageAdapter } from '@flowdrop/flowdrop/editor';

const memoryDrafts = new Map<string, string>();

const inMemoryAdapter: DraftStorageAdapter = {
  getItem: (key) => memoryDrafts.get(key) ?? null,
  setItem: (key, value) => void memoryDrafts.set(key, value),
  removeItem: (key) => void memoryDrafts.delete(key),
  keys: () => [...memoryDrafts.keys()]
};

const app = await mountFlowDropApp(container, {
  draftStorage: inMemoryAdapter
});
```

### Disabling Auto-Save

```typescript
features: {
  autoSaveDraft: false;
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
      localStorage.setItem(`flowdrop-draft-${workflow.id}`, JSON.stringify(workflow));
    }
  };
}
```

## Clearing Drafts on Logout

On the default `'local'` backend, drafts persist until they are explicitly cleared. **FlowDrop has no notion of authentication**, so it cannot clear drafts when the user signs out of your application — you must do this from the host application's logout handler. On a shared browser profile, leftover drafts could otherwise be readable by the next user via DevTools.

The mounted FlowDrop instance exposes `clearAllDrafts()` for this purpose. It removes every key beginning with `flowdrop:draft:` plus the custom `draftStorageKey` you configured at mount time (if any), and returns the number of entries removed.

```typescript
const app = await mountFlowDropApp(container, {
  /* ... */
});

async function logout() {
  app.clearAllDrafts();
  await authService.signOut();
}
```

If you need to clear drafts after the editor has already been unmounted, import the standalone helper:

```typescript
import { clearAllDrafts } from '@flowdrop/flowdrop/editor';

clearAllDrafts(); // clears flowdrop:draft:* keys
clearAllDrafts(['my-custom-draft-key']); // also clears explicit custom keys
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
