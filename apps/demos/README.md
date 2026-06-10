# @flowdrop/flowdrop-demos

A static, Netlify-hostable showcase of [FlowDrop](https://github.com/flowdrop-io/flowdrop) — a
drop-in visual workflow editor.

Every demo runs **fully in the browser**: the node registry, sample workflow, port config and
categories are bundled inline, so there are **zero network calls** to any FlowDrop backend. Drafts
persist to `localStorage`.

## Demos

| Route             | Shows                                                         |
| ----------------- | ------------------------------------------------------------- |
| `/`               | Landing / gallery (3-up card grid with per-theme screenshots) |
| `/themes/default` | The full editor with the **default** theme                    |
| `/themes/minimal` | The **minimal** theme                                         |
| `/themes/drafter` | The **drafter** theme                                         |
| `/storybook`      | The library's Storybook (built + served alongside on Netlify) |

Card screenshots live in `static/screenshots/<theme>.png` (`default`, `minimal`,
`drafter`). They're referenced as `/screenshots/<theme>.png`; a missing image
degrades to a neutral placeholder.

## Stability

Demos depend on the **published** `@flowdrop/flowdrop@2.0.0-beta.2` from npm — _not_ a workspace
link to `libs/flowdrop`. They only change behaviour when the dependency is deliberately bumped, so
they stay stable while the library evolves. (Storybook is the exception: it builds from local
source, which is the point — it documents the library as it currently is.)

## Develop

```sh
pnpm install   # resolves the published @flowdrop/flowdrop@2.0.0-beta.2
pnpm dev
```

### Develop against the current library source

The published beta ships only the `default` and `minimal` themes — `drafter`
exists in `libs/flowdrop` source but isn't released yet, so the `/themes/drafter`
demo falls back to `default` against the published package. To develop against
the **current** library (drafter and any other unreleased work):

```sh
# build the local library once (produces dist/), then link it
(cd ../../libs/flowdrop && pnpm install && pnpm build)
pnpm link ../../libs/flowdrop      # node_modules only — package.json is untouched

# restore the published package before committing / deploying
pnpm install                       # re-resolves the published version
```

`pnpm link` writes the link as an `overrides` entry in a generated
`pnpm-workspace.yaml` — that file is **gitignored** and acts as the local
dev-against-current toggle (present = local source, absent = published). To go
back to the published package, delete it (or run `pnpm unlink`) and `pnpm install`.

> ⚠️ Linking also rewrites `pnpm-lock.yaml` to point at the local path. **Do not
> commit a linked lockfile** — run `pnpm install` (or `git checkout pnpm-lock.yaml`)
> first, so the committed lockfile always resolves the published package. (The
> Netlify build uses `npm install`, which reads `package.json` and ignores the
> pnpm lockfile, so deploys stay stable regardless.) The `drafter` route is kept
> (with a `'default' | 'minimal'` cast) so it lights up automatically once a
> release including drafter is published and the dependency is bumped.

## Build (static)

```sh
pnpm build      # → ./build  (adapter-static)
pnpm preview
```

## Deploy (Netlify)

See [`netlify.toml`](./netlify.toml). Set the site **Base directory** to `apps/demos`. The build
produces the demos hub and copies the library's Storybook into `/storybook`, both served from one
domain.

## Adding a demo

1. Add a route under `src/routes/`.
2. Reuse `src/lib/sample-data` for the node registry / workflow.
3. For a themed full editor, reuse `src/lib/ThemeDemo.svelte`.
4. Add a card to the landing page (`src/routes/+page.svelte`) and a nav link
   (`src/routes/+layout.svelte`).
