---
title: Pipeline Views
description: Monitor workflow execution with graph, kanban, and table views — and customize the kanban layout from your backend.
---

The pipeline viewer displays real-time execution state for a running workflow. It sits inside the playground and offers three view modes: **Graph**, **Kanban**, and **Table**.

## Node Execution Statuses

Every node in a running pipeline is assigned one of these statuses by the backend:

| Status | Meaning |
|---|---|
| `idle` | Job created; dependencies not yet met |
| `pending` | Ready to run; waiting in queue |
| `running` | Currently executing |
| `paused` | Execution paused (e.g. rate limit, wait step) |
| `interrupted` | Waiting for human input (human-in-the-loop) |
| `completed` | Finished successfully |
| `skipped` | Not executed — workflow completed/branched before this node ran |
| `failed` | Execution failed |
| `cancelled` | Explicitly cancelled |

## Kanban View

The kanban board groups nodes into columns by status. By default it uses a 4-column layout:

| Column | Statuses | Logic |
|---|---|---|
| **Pending** | `idle`, `pending` | Not yet started |
| **In Progress** | `running`, `paused`, `interrupted` | Actively in flight |
| **Done** | `completed`, `skipped` | Terminal success |
| **Failed** | `failed`, `cancelled` | Terminal failure |

When a column maps multiple statuses, each card displays a **status pill** showing the node's exact status. This makes it easy to distinguish, for example, a `paused` node from a `running` one inside the same "In Progress" column.

## Customising the Kanban Layout

Your backend can override the column layout per pipeline by returning a `kanban_config` object in the `GET /pipelines/:id` response. If this field is absent the frontend falls back to the 4-column default above.

### Response shape

```json
{
  "status": "running",
  "node_statuses": { ... },
  "job_status_summary": { ... },
  "kanban_config": {
    "columns": [
      {
        "key": "pending",
        "label": "Pending",
        "statuses": ["idle", "pending"],
        "icon": "mdi:clock-outline",
        "color": "var(--fd-muted-foreground)"
      },
      {
        "key": "in_progress",
        "label": "In Progress",
        "statuses": ["running", "paused", "interrupted"],
        "icon": "mdi:play-circle-outline",
        "color": "var(--fd-warning)"
      },
      {
        "key": "done",
        "label": "Done",
        "statuses": ["completed", "skipped"],
        "icon": "mdi:check-circle",
        "color": "var(--fd-success)"
      },
      {
        "key": "failed",
        "label": "Failed",
        "statuses": ["failed", "cancelled"],
        "icon": "mdi:alert-circle",
        "color": "var(--fd-error)"
      }
    ]
  }
}
```

### Column fields

| Field | Type | Required | Description |
|---|---|---|---|
| `key` | `string` | ✓ | Unique column identifier |
| `label` | `string` | ✓ | Column heading shown in the UI |
| `statuses` | `string[]` | ✓ | One or more node statuses that belong to this column |
| `icon` | `string` | | [Iconify](https://icon-sets.iconify.design/) icon name, e.g. `mdi:check-circle` |
| `color` | `string` | | CSS color for the column accent — any valid CSS value, including `var(--fd-success)` |

### Status pill behaviour

The status pill on a card is shown automatically when a column's `statuses` array has more than one entry. Single-status columns are assumed to be self-explanatory and show no pill.

### Example: 3-column layout for a simple approval workflow

```json
"kanban_config": {
  "columns": [
    {
      "key": "waiting",
      "label": "Waiting",
      "statuses": ["idle", "pending", "interrupted"],
      "icon": "mdi:clock-outline",
      "color": "var(--fd-muted-foreground)"
    },
    {
      "key": "active",
      "label": "Active",
      "statuses": ["running", "paused"],
      "icon": "mdi:play-circle-outline",
      "color": "var(--fd-warning)"
    },
    {
      "key": "terminal",
      "label": "Terminal",
      "statuses": ["completed", "skipped", "failed", "cancelled"],
      "icon": "mdi:flag-checkered",
      "color": "var(--fd-foreground)"
    }
  ]
}
```

## Table View

The table view lists all nodes sorted by activity (running nodes first), with expandable rows showing execution details — last executed time, duration, and error message.

## Custom Views

Register additional views alongside the built-in three by passing a `pipelineViews` array. Each entry needs a unique `key`, a toggle button `icon` and `label`, and a Svelte component that receives `PipelineViewProps`.

### Svelte component

```svelte
<!-- MyTimelineView.svelte -->
<script lang="ts">
  import type { PipelineViewProps } from '@flowdrop/flowdrop/playground';

  let { pipelineId, workflow, endpointConfig, refreshTrigger }: PipelineViewProps = $props();
</script>

<div>Timeline for pipeline {pipelineId}</div>
```

### Registering via mountPlaygroundStudio

```typescript
import { mountPlaygroundStudio, createEndpointConfig } from '@flowdrop/flowdrop/playground';
import MyTimelineView from './MyTimelineView.svelte';

await mountPlaygroundStudio(container, {
  workflowId: 'wf-123',
  endpointConfig: createEndpointConfig('/api/flowdrop'),
  pipelineViews: [
    {
      key: 'timeline',
      label: 'Timeline',
      icon: 'mdi:chart-timeline-variant',
      component: MyTimelineView
    }
  ]
});
```

### Registering via Svelte component

```svelte
<script lang="ts">
  import { PlaygroundStudio } from '@flowdrop/flowdrop/playground';
  import MyTimelineView from './MyTimelineView.svelte';

  const extraViews = [
    { key: 'timeline', label: 'Timeline', icon: 'mdi:chart-timeline-variant', component: MyTimelineView }
  ];
</script>

<PlaygroundStudio workflowId="wf-123" extraPipelineViews={extraViews} />
```

### PipelineViewDef fields

| Field | Type | Description |
|---|---|---|
| `key` | `string` | Unique identifier — must not clash with `graph`, `kanban`, or `table` |
| `label` | `string` | Tooltip text on the toggle button |
| `icon` | `string` | Iconify icon name |
| `component` | `Component<PipelineViewProps>` | Svelte component that receives the view props |

The selected view key persists in `localStorage` under `fd-pipeline-view-mode`, so switching to a custom view and reloading restores it automatically.

## Graph View

The graph view renders the workflow canvas in read-only mode with colour-coded node overlays:

| Overlay colour | Statuses |
|---|---|
| Blue (running) | `running`, `paused`, `interrupted` |
| Green (completed) | `completed`, `skipped` |
| Red (error) | `failed`, `cancelled` |
| Amber (pending) | `pending`, `idle` |
