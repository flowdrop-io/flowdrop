# FlowDrop OpenAPI Specification

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
│   └── interrupts.yaml       # /interrupts endpoints (HITL)
└── components/               # Reusable components
    ├── schemas/              # Data type definitions
    │   ├── common.yaml       # Shared types (enums, Position, ApiResponse)
    │   ├── config.yaml       # Configuration schemas
    │   ├── node.yaml         # Node-related schemas
    │   ├── workflow.yaml     # Workflow schemas
    │   ├── pipeline.yaml     # Pipeline/execution schemas
    │   ├── playground.yaml   # Playground session schemas
    │   ├── interrupt.yaml    # HITL interrupt schemas
    │   └── response.yaml     # API response wrappers
    ├── responses.yaml        # Common error responses (400, 401, 404, etc.)
    └── securitySchemes.yaml  # Authentication schemes
```

## Commands

```bash
# Lint the spec (validates structure and best practices)
npm run api:lint

# Bundle into single file (regenerates bundled.yaml)
npm run api:bundle

# Preview documentation locally (opens Redoc)
npm run api:preview
```

## Development Workflow

1. **Edit source files** in `paths/` or `components/`
2. **Lint** with `npm run api:lint` to catch issues
3. **Bundle** with `npm run api:bundle` before committing
4. **Preview** with `npm run api:preview` to see rendered docs

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
4. Run `npm run api:lint` to validate
5. Run `npm run api:bundle` to update bundled.yaml

### Adding New Schemas

1. Add to the appropriate file in `components/schemas/`
2. Reference in `openapi.yaml` under `components.schemas:`
3. Use `$ref` in paths to reference the schema

## CI/CD

The API spec is validated in CI:

- **Linting**: Validates spec structure and rules
- **Bundled check**: Ensures `bundled.yaml` is up to date
- **Breaking changes**: PRs are checked for breaking API changes

## Tools

- **[Redocly CLI](https://redocly.com/docs/cli/)**: Linting, bundling, preview
- **[oasdiff](https://github.com/Tufin/oasdiff)**: Breaking change detection

## Hosted Documentation

API documentation is automatically deployed to GitHub Pages on every push to `main`:

**https://d34dman.github.io/fdnpm/**

The docs are built using [Redoc](https://redocly.com/redoc/) and include:
- Interactive endpoint explorer
- Schema documentation
- Try-it-out functionality (when configured with a server)

## References

- [OpenAPI 3.0 Specification](https://spec.openapis.org/oas/v3.0.3)
- [Redocly Configuration](https://redocly.com/docs/cli/configuration/)
- [FlowDrop API Documentation](../API.md)
