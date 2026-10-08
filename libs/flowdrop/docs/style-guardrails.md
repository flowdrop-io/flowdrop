# Style guardrails (internal)

Components must take colours, type sizes, radii and shadows from design tokens (`--fd-*`), and
interactive controls from the primitives. Two checks enforce it and one baseline keeps the debt
visible. Both run as part of `pnpm run lint` and in the `FlowDrop Lint` GitHub workflow.

## Rules

Stylelint (`stylelint.config.js`, `postcss-html` for `.svelte`) over `src/lib/**/*.{css,svelte}`,
except `src/lib/styles/tokens.css` and `src/lib/skins/**` (where literals belong):

| Ratchet rule | Fails on                                                                                     |
| ------------ | -------------------------------------------------------------------------------------------- |
| `colour`     | hex, named colours, `rgb()/rgba()/hsl()/hsla()/hwb()/lab()/lch()/oklab()/oklch()/color()`    |
| `font-size`  | any `font-size` that is not built from `var(--fd-*)` (or `inherit`/`initial`/`unset`)        |
| `radius`     | same, for `border-radius` and the per-corner longhands                                       |
| `shadow`     | same, for `box-shadow` (`none` and `0` are fine)                                             |
| `button`     | a raw `<button` element in `src/lib/components/**/*.svelte` outside `components/primitives/` |

`var(--fd-x)`, `var(--fd-x, fallback)`, `currentColor`, `transparent`, `inherit` and
`color-mix()` over tokens pass. Not covered: `src/routes/**` (dev app), stories and tests, inline
`style=""` attributes, and the `font` shorthand.

## The ratchet

`scripts/style-ratchet.mjs` counts violations per file per rule and compares them with
`style-baseline.json` (sorted, committed).

- A count goes up, or a new file has any: the check fails and lists `file rule old -> new`.
- A count goes down: the check also fails, "baseline is stale". Run
  `pnpm run lint:styles:update` and commit the new baseline, so the debt cannot creep back.
- Totals per rule are printed on every run.

## Lowering the baseline

Replace the literal with a token, or the `<button>` with a primitive, then
`pnpm run lint:styles:update` and commit `style-baseline.json` with the change. A component that
moves to primitives should leave with zero entries. Never raise a number to get a build green.
