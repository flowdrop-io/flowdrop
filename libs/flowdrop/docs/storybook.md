# Storybook

Storybook is the internal component and design-token library for FlowDrop.
Stories double as browser tests.

## Run it

```bash
pnpm run storybook          # dev server on http://localhost:6006
pnpm run storybook:build    # static build into storybook-static/ (gitignored)
pnpm run test:stories       # run every story as a test (headless chromium)
```

The first `test:stories` run needs a browser: `pnpm exec playwright install chromium`.

## The three roots

Every story title starts with one of three roots; `storySort` in `.storybook/preview.ts`
keeps them in this order.

| Root           | Holds                                                                                                                                                                                                                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Tokens/…`     | Pages rendered straight from `src/lib/styles/tokens.css` (`src/lib/stories/tokens/`). Nothing is copied: the file is imported `?raw`, parsed (`parseTokens.ts`) and shown with computed values, so the light/dark toolbar switch works. `@internal` tokens are hidden behind a toggle. |
| `Primitives/…` | The building blocks in `src/lib/components/primitives/` (`@internal`).                                                                                                                                                                                                                 |
| `Patterns/…`   | Everything else: `Patterns/Display/…`, `Patterns/Form/…`, `Patterns/Nodes/…`, `Patterns/Editor/…`, and so on.                                                                                                                                                                          |

New story? Pick the root, then keep the sub-group, e.g. `Patterns/Display/Button`.

## Stories as tests

`vite.config.ts` defines two vitest projects:

| Project     | What                                                                                                                                                      | Run                                                                                      |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `unit`      | happy-dom tests in `tests/**`                                                                                                                             | `pnpm run test:unit`, or scoped: `pnpm exec vitest run --project=unit tests/unit/styles` |
| `storybook` | every `*.stories.svelte` rendered in chromium via `@storybook/addon-vitest`; a story passes if it renders without throwing and its `play` function passes | `pnpm run test:stories`                                                                  |

`pnpm test` runs both. To exclude a story that cannot run as a test, add
`tags: ['!test']` to the story or meta and a one-line comment saying why.

## CI

`.github/workflows/flowdrop-storybook.yml` runs on pushes to `main` and on pull
requests that touch the library: `test:stories`, then `storybook:build`, then uploads
`storybook-static` as the `storybook-static` workflow artifact (kept 14 days).
Download it from the run page and open `index.html` through any static server.

## Hosting

Not decided yet. The build is only an artifact; nothing is deployed anywhere.
