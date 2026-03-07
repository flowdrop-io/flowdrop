# FlowDrop Documentation Site

The official documentation site for [FlowDrop](../../libs/flowdrop/README.md), built with [Astro](https://astro.build) and [Starlight](https://starlight.astro.build/).

## Project Structure

```
apps/docs/
├── public/                    # Static assets (favicons, etc.)
├── src/
│   ├── assets/                # Images and media
│   ├── components/            # Custom Astro components
│   ├── content/
│   │   └── docs/
│   │       ├── getting-started/   # Installation & quick start guides
│   │       ├── guides/            # Usage guides
│   │       └── reference/         # API reference
│   ├── styles/                # Custom theme and design tokens
│   └── content.config.ts
├── astro.config.mjs
├── svelte.config.js
└── package.json
```

Documentation pages live in `src/content/docs/` as `.md` or `.mdx` files. Each file becomes a route based on its file name.

## Commands

All commands are run from `apps/docs/`:

| Command        | Action                                       |
| :------------- | :------------------------------------------- |
| `pnpm install` | Install dependencies                         |
| `pnpm dev`     | Start local dev server at `localhost:4321`    |
| `pnpm build`   | Build production site to `./dist/`            |
| `pnpm preview` | Preview the production build locally          |

## Tech Stack

- [Astro](https://astro.build) — Static site framework
- [Starlight](https://starlight.astro.build/) — Documentation theme
- [Svelte](https://svelte.dev) — For interactive components and FlowDrop embeds
- [@d34dman/flowdrop](https://www.npmjs.com/package/@d34dman/flowdrop) — FlowDrop library (for live demos)
