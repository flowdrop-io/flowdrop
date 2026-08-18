# FlowDrop OpenAPI Specification

[![API Spec Validation](https://github.com/flowdrop-io/flowdrop/actions/workflows/api-lint.yml/badge.svg)](https://github.com/flowdrop-io/flowdrop/actions/workflows/api-lint.yml)

This directory contains the OpenAPI 3.0 specification for the FlowDrop API.

## Directory Structure

```
api/
├── openapi.yaml              # Main entry point (references other files)
├── bundled.yaml              # Auto-generated bundled spec (for tools/docs)
├── redocly.yaml              # Linting and bundling configuration
├── README.md                 # This file
├── paths/                    # Endpoint definitions by domain
│   ├── health.yaml           # /health, /system/* endpoints
│   ├── nodes.yaml            # /nodes endpoints
│   ├── workflows.yaml        # /workflows endpoints
│   ├── pipelines.yaml        # /pipeline endpoints
│   ├── executions.yaml       # /executions endpoints
│   ├── playground.yaml       # /playground endpoints
│   ├── interrupts.yaml       # /interrupts endpoints (HITL)
│   ├── categories.yaml       # /categories endpoints
│   ├── port-config.yaml      # /port-config endpoints
│   └── agentspec.yaml        # /agentspec endpoints (Oracle Agent Spec)
└── components/               # Reusable components
    ├── schemas/              # Data type definitions
    │   ├── common.yaml       # Shared types (enums, Position, ApiResponse)
    │   ├── config.yaml       # Configuration schemas
    │   ├── node.yaml         # Node-related schemas
    │   ├── workflow.yaml     # Workflow schemas
    │   ├── pipeline.yaml     # Pipeline/execution schemas
    │   ├── playground.yaml   # Playground session schemas
    │   ├── interrupt.yaml    # HITL interrupt schemas
    │   ├── agentspec.yaml    # Agent Spec type definitions
    │   └── response.yaml     # API response wrappers
    ├── responses.yaml        # Common error responses (400, 401, 404, etc.)
    └── securitySchemes.yaml  # Authentication schemes
```

## Commands

Run from the library root (`libs/flowdrop/`):

```bash
# Lint the spec (validates structure and best practices)
pnpm api:lint

# Bundle into single file (regenerates bundled.yaml)
pnpm api:bundle
```

Or run directly from `apps/api-docs/`:

```bash
# Lint the OpenAPI spec
pnpm lint

# Bundle the spec into a single file
pnpm bundle

# Preview documentation locally (live reload, auto-finds available port)
pnpm preview

# Build the static HTML docs
pnpm build
```

## Development Workflow

1. **Edit** source files in `paths/` or `components/`
2. **Lint** with `pnpm api:lint` to catch issues
3. **Preview** with `pnpm preview` (from `apps/api-docs/`) to see rendered docs
4. **Bundle** with `pnpm api:bundle` before committing
5. **Commit** — the pre-commit hook automatically bundles if API files changed and stages the updated `bundled.yaml`
6. **CI validates** — GitHub Actions ensures `bundled.yaml` is in sync and checks for breaking changes

## Best Practices

### YAML Hygiene

- Quote strings that could be misinterpreted:
  - Version strings: `"1.0.0"`, `"2026.01.26"`
  - Values like `Y`, `N`, `yes`, `no`, `on`, `off`
- Use consistent indentation (2 spaces)
- Add descriptions to all schemas and operations

### Naming Conventions

- **Paths**: kebab-case (`/port-config`, not `/portConfig`)
- **Operations**: camelCase (`listWorkflows`, `getNodeType`)
- **Schemas**: PascalCase (`WorkflowNode`, `NodeMetadata`)
- **Properties**: camelCase (`createdAt`, `sourceHandle`)

### Adding New Endpoints

1. Create or update the appropriate file in `paths/`
2. Reference it in `openapi.yaml` under `paths:`
3. Add any new schemas to `components/schemas/`
4. Run `pnpm api:lint` to validate
5. Run `pnpm api:bundle` to update bundled.yaml

### Adding New Schemas

1. Add to the appropriate file in `components/schemas/`
2. Reference in `openapi.yaml` under `components.schemas:`
3. Use `$ref` in paths to reference the schema

## Playground Message Hierarchy, Tags, and Display Contract

A playground message can carry three optional fields that let the server fully control
how the message is presented in the UI, without the client having to invent or
derive anything.

**`hierarchy`** — ordered list of `MessageHierarchyItem` (`{ id, label, icon? }`).
Displayed as a chevron-separated trail. Use it to express position in a tree
(e.g. workflow > sub-workflow > iteration). Display-only — this is not a navigation
breadcrumb and no `href` is wired up.

**`tags`** — unordered list of `MessageTag` (`{ id, label, icon?, color?, variant?, type? }`).
Rendered as chips alongside the message. `color` is a closed enum (`muted | primary |
success | warning | error | info`); `variant` is `subtle | solid | outline`. When
the server emits `tags`, the client renders exactly those — there is no client-side
synthesis.

**`display`** — closed enum hint that selects the layout:

- `bubble` — chat bubble with avatar, header, body, optional footer
- `log` — dense one-liner: icon · hierarchy · body · tags · timestamp
- `notice` — compact centered notice
- `card` — vertical: hierarchy (top), body (middle), tags (bottom)

When `display` is omitted, the client picks a default from the role: `log` → `log`,
`system` → `notice` (when compactSystemMessages is enabled), everything else → `bubble`.

**Server expectations:**

- All three fields are optional. Omitting `hierarchy` and `tags` produces a clean,
  unannotated message in the role's default layout.
- A message's `display` overrides the role-based default. This lets a `log` message
  be rendered as a `card` when it carries enough context to deserve verbose
  presentation.
- `tags` is authoritative — there is no merge with client-derived chips. To suppress
  any chip rendering, send `tags: []` (or omit the field entirely).

## Workflow Interface Contract

A `Workflow` may carry an optional `interface` (`WorkflowInterface`): named `inputs`
and `outputs` that make up its public contract for external callers, independent of
its internal node graph.

Each entry (`WorkflowInterfaceEntry`) owns a stable `id`, unique within its
direction (inputs and outputs are scoped separately). On export toward a server
manifest, the `id` becomes the manifest's `name` — its wire identity — so renaming
an `id` is a breaking change for callers, not a cosmetic one.

An entry points at exactly one inner node port via `bindings` (`PortBinding[]`,
`{nodeId, portId}`). An empty `bindings` list is a valid _draft_ state; more than
one binding is invalid. The bound port must also be canvas-exposed — a bound but
hidden port does not satisfy the contract.

`meta` is opaque, free-form consumer metadata (`additionalProperties: true`). The
library never reads or interprets it — it round-trips verbatim. Servers use it to
declare what "external" means for them (e.g. `{"http": {"in": "query"}}`). Keys
under the `fd.` prefix are reserved for future library use.

## CI/CD

The API spec is validated in CI:

- **Linting**: Validates spec structure and rules
- **Bundled check**: Ensures `bundled.yaml` is up to date
- **Breaking changes**: PRs are checked for breaking API changes

## Tools

- **[Redocly CLI](https://redocly.com/docs/cli/)**: Linting, bundling, preview
- **[oasdiff](https://github.com/Tufin/oasdiff)**: Breaking change detection

## Hosted Documentation

The API reference is rendered natively from this OpenAPI spec by the unified
Mintlify docs site:

**https://flowdrop.mintlify.app/api-reference/introduction**

The hosted reference includes:

- Interactive endpoint explorer
- Schema documentation
- Try-it-out functionality (when configured with a server)

## References

- [OpenAPI 3.0 Specification](https://spec.openapis.org/oas/v3.0.3)
- [Redocly Configuration](https://redocly.com/docs/cli/configuration/)
- [FlowDrop API Documentation](https://flowdrop.mintlify.app/api-reference/introduction)
