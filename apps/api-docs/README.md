# FlowDrop API Docs

Static API documentation site for FlowDrop, built with [Redocly](https://redocly.com/) from the OpenAPI specification. Supports multiple API versions.

**Live docs:** [flowdrop-io.github.io/flowdrop](https://flowdrop-io.github.io/flowdrop/)

## API Versions

Versions are defined in [`libs/flowdrop/api/versions.json`](../../libs/flowdrop/api/versions.json).

| Version | Spec Path | Status |
|---------|-----------|--------|
| v1 | `libs/flowdrop/api/v1/` | Current |

### Adding a New Version

1. Copy an existing version directory (e.g. `libs/flowdrop/api/v1/`) to a new one (e.g. `v2/`)
2. Update the spec in the new directory
3. Add the version to `libs/flowdrop/api/versions.json`:
   ```json
   {
     "id": "v2",
     "label": "v2 (2.0.0)",
     "path": "v2",
     "default": true
   }
   ```
4. Set `"default": false` on the previous version if the new one should be the default

## Prerequisites

- Node.js 18+
- pnpm

## Scripts

```bash
# Lint all API versions (or a specific one)
pnpm lint
pnpm lint v1

# Bundle all versions into single files
pnpm bundle
pnpm bundle v1

# Preview a version locally (live reload, auto-finds available port)
pnpm preview
pnpm preview v1

# Build all versions into static HTML
pnpm build
```

## How It Works

```
libs/flowdrop/api/
├── versions.json                <- Version registry
├── v1/
│   ├── openapi.yaml             <- Source OpenAPI spec (multi-file)
│   ├── components/              <- Shared schema definitions
│   ├── paths/                   <- Path definitions
│   ├── redocly.yaml             <- Redocly config and lint rules
│   └── bundled.yaml             <- Bundled spec (generated)
├── v2/                          <- Future versions follow same structure
│   └── ...
                |
                v
        build.mjs                <- Builds each version
                |
                v
        dist/
        ├── index.html           <- Version picker landing page
        ├── v1/index.html        <- v1 documentation
        └── v2/index.html        <- v2 documentation (when added)
```

### Workflow

1. **Edit** the OpenAPI spec in the version directory (e.g. `libs/flowdrop/api/v1/`)
2. **Lint** with `pnpm lint` to catch issues early
3. **Preview** with `pnpm preview v1` for live-reload development
4. **Bundle** with `pnpm bundle` to produce the merged spec
5. **Build** with `pnpm build` to generate static HTML for all versions

## Deployment

Documentation is automatically deployed to GitHub Pages on every push to the `1.x` branch (or via manual workflow dispatch). See [`.github/workflows/api-docs.yml`](../../.github/workflows/api-docs.yml) for the full pipeline.

## Key Files

| File | Description |
|---|---|
| [`libs/flowdrop/api/versions.json`](../../libs/flowdrop/api/versions.json) | Version registry |
| [`libs/flowdrop/api/v1/openapi.yaml`](../../libs/flowdrop/api/v1/openapi.yaml) | v1 OpenAPI 3.0.3 specification |
| [`libs/flowdrop/api/v1/redocly.yaml`](../../libs/flowdrop/api/v1/redocly.yaml) | v1 Redocly config and linting rules |
| `dist/index.html` | Version picker landing page (generated) |
| `dist/v1/index.html` | v1 documentation page (generated) |

## Lint Rules

The Redocly config enforces strict linting rules for production quality:

- **Errors** (must fix): unique operation IDs, summaries, defined tags, path parameters, security schemes, valid content types
- **Warnings** (should fix): tag descriptions, unused components, operation descriptions, 4xx responses, example validation
- **Disabled**: parameter descriptions, localhost server warnings

See [`redocly.yaml`](../../libs/flowdrop/api/v1/redocly.yaml) for the full ruleset.
