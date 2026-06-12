# Tutorial 1 — Embedding the editor

Companion app for [`/tutorial/01-embedding-the-editor`](https://flowdrop.io/tutorial/01-embedding-the-editor).

Mounts the most minimal FlowDrop setup: a blank, pannable, zoomable canvas with
no nodes and no workflow loaded.

## Run

```bash
pnpm install
pnpm dev
```

Open the printed URL. Scroll to zoom, drag the background to pan.

## What's here

- [`src/main.js`](./src/main.js) — the two imports + `mountFlowDropApp` call from the docs.
- [`index.html`](./index.html) — a page with a single `<div id="editor">` to mount into.

## Svelte variant

The docs page also shows a Svelte option. In a SvelteKit/Svelte app you'd skip
`mountFlowDropApp` and use the component directly:

```svelte
<script>
  import { WorkflowEditor } from '@flowdrop/flowdrop/editor';
  import '@flowdrop/flowdrop/styles';
</script>

<div style="height: 600px;">
  <WorkflowEditor />
</div>
```

The remaining tutorial steps lead with the vanilla `mountFlowDropApp` API, so
this folder and the next four use vanilla JS + Vite.
