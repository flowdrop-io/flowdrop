# Tutorial 2 — Configuring endpoints

Companion app for [`/tutorial/02-configuring-endpoints`](https://flowdrop.io/tutorial/02-configuring-endpoints).

Same canvas as step 1, but wired to an API base URL via `createEndpointConfig`.
No running backend is required — the editor only calls the API when a save/load/
execute action fires.

## Run

This step needs a backend to load nodes from. Start the reference server first
(in a second terminal):

```bash
cd ../../example-server-express
pnpm install
pnpm dev          # serves http://localhost:7104/api/flowdrop
```

Then run this app:

```bash
pnpm install
pnpm dev
```

`vite.config.js` proxies `/api` → `http://localhost:7104`, so the relative
`/api/flowdrop` base URL resolves to the server. With both running, the sidebar
fills with the node types the server provides.

## What's here

- [`src/main.js`](./src/main.js) — `createEndpointConfig('/api/flowdrop')` passed
  to `mountFlowDropApp`, plus a commented example of overriding timeout/retry.
