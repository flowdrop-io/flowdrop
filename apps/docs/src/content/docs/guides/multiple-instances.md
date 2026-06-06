---
title: Multiple Instances
description: Run several isolated FlowDrop editors or playgrounds on a single page.
---

FlowDrop supports multiple editor instances on one page. Each mount gets its own
**state container** — workflow data, undo/redo history, playground sessions,
interrupts, and panel state are fully isolated between instances. Editing,
deleting, or undoing in one editor never affects another, and destroying one
leaves its siblings working.

If you previously isolated editors in iframes to work around the old
single-instance limitation, you can remove that workaround.

## Quick start: two editors via the mount API

```typescript
import { mountFlowDropApp } from '@flowdrop/flowdrop/editor';

const left = await mountFlowDropApp(document.getElementById('editor-left'), {
  workflow: workflowA,
  nodes: nodeTypes,
  instanceId: 'left' // scopes draft/panel storage keys
});

const right = await mountFlowDropApp(document.getElementById('editor-right'), {
  workflow: workflowB,
  nodes: nodeTypes,
  instanceId: 'right'
});

// Each handle controls only its own editor:
left.isDirty(); // false
right.getWorkflow(); // workflowB
left.destroy(); // `right` keeps working
```

## Quick start: two editors in Svelte

Create an instance per editor with `createFlowDropInstance()` and pass it via
the `instance` prop:

```svelte
<script lang="ts">
  import { App, createFlowDropInstance } from '@flowdrop/flowdrop/editor';

  const left = createFlowDropInstance({ id: 'left' });
  const right = createFlowDropInstance({ id: 'right' });
</script>

<App instance={left} workflow={workflowA} nodes={nodeTypes} />
<App instance={right} workflow={workflowB} nodes={nodeTypes} />
```

`WorkflowEditor`, `Playground`, `PlaygroundStudio`, `PlaygroundModal`, and
`PlaygroundApp` accept the same `instance` prop.

## The default instance (backward compatibility)

You only need `instanceId` when mounting **more than one** editor. The first
mount without an `instanceId` becomes the **page-default instance**:

- It keeps the legacy localStorage keys (`flowdrop:draft:<workflowId>`,
  `fd-pipeline-panel-open`, …), so existing users keep their drafts.
- All module-level store APIs — `getWorkflowStore()`, `workflowActions`,
  `historyService`, and friends — operate on it, so existing integration code
  keeps working unchanged.

Additional mounts without an explicit id get auto-generated ones (`fd-1`,
`fd-2`, …). Prefer explicit ids whenever drafts are enabled, so each editor's
drafts land under a stable, predictable key.

## Instance-scoped storage keys

| State               | Default instance              | Instance with `instanceId: 'left'` |
| ------------------- | ----------------------------- | ---------------------------------- |
| Workflow drafts     | `flowdrop:draft:<workflowId>` | `flowdrop:draft:left:<workflowId>` |
| Pipeline panel open | `fd-pipeline-panel-open`      | `fd-pipeline-panel-open:left`      |
| Pipeline view mode  | `fd-pipeline-view-mode`       | `fd-pipeline-view-mode:left`       |

`clearAllDrafts()` sweeps everything under `flowdrop:draft:` — instance
sub-namespaces included — so a logout handler still clears all editors at once.

## Accessing instance state programmatically

Inside FlowDrop's component tree, resolve the current instance with
`getInstance()` (during component init):

```svelte
<script lang="ts">
  import { getInstance } from '@flowdrop/flowdrop/editor';

  const fd = getInstance();
  // Reactive getters — read them inside $derived or templates:
  const name = $derived(fd.workflow.name);
  const canUndo = $derived(fd.historyBindings.canUndo);
</script>
```

Outside the tree, hold on to the container you created (or the mount handle).
The `FlowDropInstance` exposes `workflow`, `history`, `historyBindings`,
`playground`, `interrupts`, `categories`, `portCoordinates`, `pipelinePanel`,
and `destroy()`.

## What stays page-global (by design)

Some state is deliberately shared across all instances on a page:

- **Theme and settings** — one `data-theme` and one settings store per page.
  This includes UI toggles like console-open, sidebar-collapsed, and the
  bottom-panel tab: toggling them in one editor affects all editors.
- **Port-compatibility config** — `initializePortCompatibility` is page-global;
  the last mount's port config wins.
- **API endpoint config** — `setEndpointConfig` is page-global.
- **Playground live polling** — playground session/message _state_ is isolated
  per instance, but the polling timer is page-global: only one playground
  actively polls at a time. If two playgrounds need concurrent live updates,
  push responses yourself via the mount handle's `pushMessages()` with your own
  transport (WebSocket/SSE).

## SSR (SvelteKit)

The page-default instance is **browser-only** — module-level mutable state on
the server would leak between requests. During SSR, the provider components
(`App`, `WorkflowEditor`, …) create a fresh per-render instance automatically,
so server rendering works without any extra setup. Calling a module-level store
function (e.g. `getWorkflowStore()`) during SSR outside a FlowDrop component
tree throws with an explanatory error instead of leaking state.

## Troubleshooting

**Two editors share state** — you're on a FlowDrop version before
multi-instance support, or a legacy module-level API consumer (e.g. custom code
calling `workflowActions` directly) is writing to the default instance while a
second un-keyed mount also claimed it. Pass explicit `instanceId`s and use
`getInstance()` / the mount handle instead of module-level functions.

**Drafts collide between editors** — both mounts omitted `instanceId`, so the
second got an auto-generated id that changes across reloads. Pass stable
explicit ids.
