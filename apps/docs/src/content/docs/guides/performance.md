---
title: Performance
description: Bundle size, lazy loading, SSR guard patterns, and tips for large workflows in FlowDrop.
---

FlowDrop's editor is a rich component with many dependencies. This guide covers strategies to minimize bundle impact and ensure smooth performance at scale.

## Bundle Sizes

Approximate gzip sizes by entry point:

| Entry Point | Approx. gzip size | Notes |
|-------------|-------------------|-------|
| `@flowdrop/flowdrop/core` | ~10 KB | Types and utilities only — no heavy deps |
| `@flowdrop/flowdrop/editor` | ~180 KB | Includes `@xyflow/svelte`, Svelte runtime |
| `@flowdrop/flowdrop/form` | ~25 KB | Form fields without CodeMirror |
| `@flowdrop/flowdrop/form/code` | ~350 KB | Includes CodeMirror and language packs |
| `@flowdrop/flowdrop/form/markdown` | ~300 KB | Includes CodeMirror markdown mode |
| `@flowdrop/flowdrop/playground` | ~200 KB | Editor + session management |
| `@flowdrop/flowdrop` | ~400 KB | Full bundle (avoid in production) |

**Tip:** Use specific entry points rather than `@flowdrop/flowdrop` to tree-shake unused modules.

## Lazy Loading the Editor

The editor bundle is large. Load it only when the user navigates to the editor page:

```javascript
// Vanilla JS — dynamic import
async function mountEditor(container) {
  const [{ mountFlowDropApp }, { createEndpointConfig }] = await Promise.all([
    import('@flowdrop/flowdrop/editor'),
    import('@flowdrop/flowdrop/core'),
  ]);
  await import('@flowdrop/flowdrop/styles');

  return mountFlowDropApp({
    container,
    endpoints: createEndpointConfig('/api/flowdrop'),
  });
}
```

### React

```jsx
import React, { Suspense, lazy } from 'react';

const FlowDropEditor = lazy(() => import('./FlowDropEditor'));

export function EditorPage() {
  return (
    <Suspense fallback={<div>Loading editor...</div>}>
      <FlowDropEditor />
    </Suspense>
  );
}
```

Where `FlowDropEditor` is a wrapper component that calls `mountFlowDropApp` in a `useEffect`.

## Deferring CodeMirror

If you use code or markdown fields but not on every page, load them on demand:

```javascript
async function mountEditorWithCodeFields(container, endpoints) {
  // Load form fields that require CodeMirror only when needed
  const [{ mountFlowDropApp }, { createEndpointConfig }] = await Promise.all([
    import('@flowdrop/flowdrop/editor'),
    import('@flowdrop/flowdrop/core'),
  ]);

  // This registers code/markdown fields into the global registry
  await import('@flowdrop/flowdrop/form/code');
  await import('@flowdrop/flowdrop/form/markdown');

  return mountFlowDropApp({ container, endpoints });
}
```

## SSR Guard Patterns

FlowDrop accesses `window`, `document`, and browser APIs — it cannot run on the server. Always guard your mount calls.

### SvelteKit

```javascript
import { browser } from '$app/environment';
import { onMount } from 'svelte';

let app;
onMount(async () => {
  if (!browser) return;
  const { mountFlowDropApp } = await import('@flowdrop/flowdrop/editor');
  app = mountFlowDropApp({ container: document.getElementById('editor'), ... });
  return () => app?.destroy();
});
```

### Next.js (App Router)

```javascript
'use client';
import dynamic from 'next/dynamic';

const FlowDropEditor = dynamic(
  () => import('../components/FlowDropEditor'),
  { ssr: false }
);
```

### Nuxt

```html
<template>
  <ClientOnly>
    <FlowDropEditor />
  </ClientOnly>
</template>
```

### Vite `optimizeDeps`

If you see `Failed to resolve import` errors during development, exclude FlowDrop from Vite's pre-bundling:

```javascript
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    exclude: ['@flowdrop/flowdrop', '@xyflow/svelte']
  }
});
```

See the [Installation guide](/getting-started/installation/) for more setup tips.

## Large Workflow Performance

For workflows with many nodes (50+):

### Use batch updates

```javascript
const { workflowActions } = app;

workflowActions.batchUpdate(() => {
  // All changes inside are applied as a single reactive update
  workflowActions.addNode(nodeA);
  workflowActions.addNode(nodeB);
  workflowActions.addEdge(edge);
});
```

### Use history transactions

Group related changes into a single undo step:

```javascript
import { historyActions } from '@flowdrop/flowdrop/editor';

historyActions.startTransaction();
// ... multiple changes
historyActions.endTransaction();
```

### Disable auto-save for programmatic updates

When making many changes programmatically, temporarily disable auto-save:

```javascript
mountFlowDropApp({
  container,
  endpoints,
  features: {
    autoSaveDraft: false, // disable localStorage auto-save
    showToasts: false,    // disable toast notifications
  }
});
```

See [Mount API](/reference/mount-api/) for the full `features` options.
