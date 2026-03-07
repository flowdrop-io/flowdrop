# FlowDrop API Docs

Static API documentation site for FlowDrop, built with [Redocly](https://redocly.com/) from the OpenAPI specification.

**Live docs:** [flowdrop-io.github.io/flowdrop](https://flowdrop-io.github.io/flowdrop/)

**API version:** 1.0.0

## Overview

This app lints, bundles, and builds the FlowDrop OpenAPI spec into a standalone HTML documentation page. The source spec lives in [`libs/flowdrop/api/openapi.yaml`](../../libs/flowdrop/api/openapi.yaml) and is processed using the Redocly CLI.

### API Coverage

The OpenAPI spec documents the following endpoint groups:

| Tag | Description |
|---|---|
| System | Health and status endpoints |
| Node Types | Node type discovery and metadata |
| Configuration | System configuration including port config |
| Workflows | Workflow CRUD operations |
| Pipeline | Pipeline execution and monitoring |
| Playground | Interactive workflow testing and chat |
| Interrupts | Human-in-the-Loop (HITL) interrupt endpoints |
| Validation | Workflow validation |
| Import/Export | Workflow import and export operations |
| Agent Spec | Oracle Open Agent Spec integration |

## Prerequisites

- Node.js 18+
- pnpm

## Scripts

```bash
# Lint the OpenAPI spec
pnpm lint

# Bundle the spec into a single file
pnpm bundle

# Preview the docs locally (live reload, auto-finds available port)
pnpm preview

# Build the static HTML docs
pnpm build
```

## How It Works

```
libs/flowdrop/api/openapi.yaml    <- Source OpenAPI spec (multi-file)
libs/flowdrop/api/redocly.yaml    <- Redocly config and lint rules
                |
                v
        redocly bundle             <- Merges into a single file
                |
                v
libs/flowdrop/api/bundled.yaml    <- Bundled spec
                |
                v
        redocly build-docs         <- Generates static HTML
                |
                v
        dist/index.html            <- Deployable documentation page
```

### Workflow

1. **Edit** the OpenAPI spec in `libs/flowdrop/api/`
2. **Lint** with `pnpm lint` to catch issues early
3. **Preview** with `pnpm preview` for live-reload development
4. **Bundle** with `pnpm bundle` to produce the merged spec
5. **Build** with `pnpm build` to generate the static HTML

## Deployment

Documentation is automatically deployed to GitHub Pages on every push to the `1.x` branch (or via manual workflow dispatch). See [`.github/workflows/api-docs.yml`](../../.github/workflows/api-docs.yml) for the full pipeline.

## Key Files

| File | Description |
|---|---|
| [`libs/flowdrop/api/openapi.yaml`](../../libs/flowdrop/api/openapi.yaml) | Source OpenAPI 3.0.3 specification |
| [`libs/flowdrop/api/redocly.yaml`](../../libs/flowdrop/api/redocly.yaml) | Redocly configuration and linting rules |
| [`libs/flowdrop/api/bundled.yaml`](../../libs/flowdrop/api/bundled.yaml) | Bundled single-file spec (generated) |
| `dist/index.html` | Built documentation page (generated) |

## Lint Rules

The Redocly config enforces strict linting rules for production quality:

- **Errors** (must fix): unique operation IDs, summaries, defined tags, path parameters, security schemes, valid content types
- **Warnings** (should fix): tag descriptions, unused components, operation descriptions, 4xx responses, example validation
- **Disabled**: parameter descriptions, localhost server warnings

See [`redocly.yaml`](../../libs/flowdrop/api/redocly.yaml) for the full ruleset.
