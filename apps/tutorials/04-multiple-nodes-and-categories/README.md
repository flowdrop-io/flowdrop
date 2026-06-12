# Tutorial 4 — Multiple nodes & categories

Companion app for [`/tutorial/04-multiple-nodes-and-categories`](https://flowdrop.io/tutorial/04-multiple-nodes-and-categories).

Six nodes across six categories, covering the different visual node `type`s
(simple, tool, gateway, idea, …) and the port `dataType` system used to validate
connections.

## Run

Nodes are defined client-side, but saving needs a backend. Start the reference
server in a second terminal:

```bash
cd ../../example-server-express && pnpm install && pnpm dev   # http://localhost:7104
```

Then run this app (`vite.config.js` proxies `/api` → `:7104`):

```bash
pnpm install
pnpm dev
```

Then build the workflow from the docs' "Try it" section:

1. Drag **Text Input**, **AI Content Analyzer**, and **Text Output** onto the canvas.
2. Connect Text Input's `text` output → AI Content Analyzer's `Content to Analyze` input.
3. Connect AI Content Analyzer's `analyzed_content` output → Text Output's `Text Input` port.

## What's here

- [`src/nodes.js`](./src/nodes.js) — the full `nodes` and `categories` arrays
  (ports and config filled in so the connections above actually validate).
- [`src/main.js`](./src/main.js) — imports them and mounts the editor.
