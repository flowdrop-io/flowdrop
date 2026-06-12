# Tutorial 3 — Your first node

Companion app for [`/tutorial/03-your-first-node`](https://flowdrop.io/tutorial/03-your-first-node).

Defines one node (`Text Input`) and one category (`Inputs`) and passes them to
the editor. The node appears in the sidebar; its `configSchema` auto-generates
the config form.

## Run

The node here is defined client-side, so the sidebar works without a backend —
but saving still needs one. Start the reference server in a second terminal:

```bash
cd ../../example-server-express && pnpm install && pnpm dev   # http://localhost:7104
```

Then run this app (`vite.config.js` proxies `/api` → `:7104`):

```bash
pnpm install
pnpm dev
```

Then: open the sidebar, drag **Text Input** onto the canvas, click it, and edit
the **Placeholder** field.

## What's here

- [`src/main.js`](./src/main.js) — the full `textInput` node definition (ports +
  `configSchema`), the `inputsCategory`, and the `mountFlowDropApp` call.
