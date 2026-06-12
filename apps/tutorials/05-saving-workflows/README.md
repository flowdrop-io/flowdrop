# Tutorial 5 — Saving workflows

Companion app for [`/tutorial/05-saving-workflows`](https://flowdrop.io/tutorial/05-saving-workflows).

Loads a pre-built workflow (Text Input → AI Content Analyzer → Text Output) and
wires up the full set of lifecycle `eventHandlers`. Clicking **Save** runs the
save flow; with no backend running, `onSaveError` fires — open the devtools
console to watch the handlers log.

## Run

Saving is the whole point of this step, so the backend matters here. Start the
reference server in a second terminal:

```bash
cd ../../example-server-express && pnpm install && pnpm dev   # http://localhost:7104
```

Then run this app (`vite.config.js` proxies `/api` → `:7104`):

```bash
pnpm install
pnpm dev
```

With the server running, **Save** persists to `PUT /api/flowdrop/workflows/{id}`
and `onAfterSave` fires. Without it, `onSaveError` fires instead — both are
logged to the console.

## What's here

- [`src/workflow.js`](./src/workflow.js) — the pre-built workflow, annotated with
  the node/edge data model from the docs (`position`, `data.config`,
  `data.metadata`, port-handle format).
- [`src/nodes.js`](./src/nodes.js) — the node + category palette.
- [`src/main.js`](./src/main.js) — mounts with `workflow`, `endpointConfig`, and
  all five `eventHandlers` (`onBeforeSave`, `onAfterSave`, `onSaveError`,
  `onWorkflowChange`, `onDirtyStateChange`).
