# FlowDrop tutorials — runnable companion apps

Each folder here is a **standalone, self-contained** app that mirrors one step
of the tutorial on the docs site. They exist so the docs can link straight to
working source for every step instead of code fragments.

| #   | Folder                                                                   | Docs page                                    | Stack             |
| --- | ------------------------------------------------------------------------ | -------------------------------------------- | ----------------- |
| 1   | [`01-embedding-the-editor`](./01-embedding-the-editor)                   | `/tutorial/01-embedding-the-editor`          | Vanilla JS + Vite |
| 2   | [`02-configuring-endpoints`](./02-configuring-endpoints)                 | `/tutorial/02-configuring-endpoints`         | Vanilla JS + Vite |
| 3   | [`03-your-first-node`](./03-your-first-node)                             | `/tutorial/03-your-first-node`               | Vanilla JS + Vite |
| 4   | [`04-multiple-nodes-and-categories`](./04-multiple-nodes-and-categories) | `/tutorial/04-multiple-nodes-and-categories` | Vanilla JS + Vite |
| 5   | [`05-saving-workflows`](./05-saving-workflows)                           | `/tutorial/05-saving-workflows`              | Vanilla JS + Vite |

Each tutorial uses whatever stack the docs page leads with — all five lead with
the vanilla-JS `mountFlowDropApp` API, so they're vanilla + Vite. (Step 1's docs
also show a Svelte `WorkflowEditor` variant; see that folder's README.)

## Conventions

- **Standalone.** Each folder has its own `package.json` and lockfile. Run
  `pnpm install` (or `npm install`) inside the folder you want — this is **not**
  a pnpm workspace, matching the rest of `apps/`.
- **Pinned to a published version.** Every app depends on the published
  `@flowdrop/flowdrop` (currently `2.0.0-beta.3`), so the examples stay stable
  until deliberately bumped — they do not link the local `libs/flowdrop`.
- **Progressive.** Each step builds on the previous one. Step 1 is a blank
  canvas; step 5 is a full editor with nodes, categories, endpoints, a
  pre-loaded workflow, and save callbacks.

## The backend

FlowDrop is a **frontend editor** — it loads nodes and saves workflows over a
REST API, so steps 2–5 need a backend to be useful. Use the reference server in
this repo, which implements the full API with in-memory demo data:

```bash
cd ../example-server-express
pnpm install
pnpm dev          # serves http://localhost:7104/api/flowdrop
```

Leave it running in its own terminal. Steps 2–5 proxy `/api` →
`http://localhost:7104` in their `vite.config.js`, so the editor's relative
`/api/flowdrop` base URL reaches the server (in production the two are usually
same-origin and no proxy is needed). Step 1 has no backend on purpose — it's the
bare editor.

## Run one

```bash
# terminal 1 — the backend (for steps 2–5)
cd ../example-server-express && pnpm install && pnpm dev

# terminal 2 — the tutorial step
cd 01-embedding-the-editor
pnpm install
pnpm dev
```

## Room to grow

This folder is the home for runnable doc companions in general, not just the
5-step tutorial. Other guides (e.g. **Getting Started**, framework-integration
recipes) can drop their own self-contained folders here following the same
conventions.
