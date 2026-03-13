---
title: OpenAPI Specification
description: The complete REST API contract for FlowDrop backends.
---

FlowDrop publishes an OpenAPI 3.0 specification that documents every REST endpoint the editor can call. This is the authoritative API contract for building a compatible backend.

## View the Specification

The interactive API documentation is available at:

**[api.flowdrop.io](https://api.flowdrop.io/)**

This Redocly-powered site lets you browse all endpoints, see request/response schemas, and try example payloads.

## Using the Spec

### For Backend Development

Use the OpenAPI spec to:
- **Generate server stubs** with tools like [openapi-generator](https://openapi-generator.tech/) or [swagger-codegen](https://swagger.io/tools/swagger-codegen/)
- **Validate your API** against the spec using tools like [Prism](https://stoplight.io/open-source/prism)
- **Auto-generate documentation** for your specific backend implementation

### For Client Development

The spec can also generate typed API clients:

```bash
# Generate TypeScript client
npx openapi-generator-cli generate -i openapi.yaml -g typescript-fetch -o ./generated
```

## Endpoint Groups

The spec covers all endpoint groups documented in the [API Overview](/reference/api-overview/):

- **Health & System** — Health check, runtime config
- **Nodes** — Node type discovery and metadata
- **Categories** — Node category definitions
- **Port Config** — Data types and compatibility rules
- **Workflows** — CRUD operations, validation, import/export
- **Execution** — Workflow execution and status
- **Pipelines** — Pipeline management
- **Playground** — Interactive testing sessions and messages
- **Interrupts** — Human-in-the-loop management
- **Settings** — User preferences
- **Agent Spec** — Agent Spec format operations

## Next Steps

- [Backend Implementation](/guides/integration/backend-implementation/) — build your backend using this spec
- [Backend: Express.js](/recipes/backend-express/) — working reference implementation
- [API Overview](/reference/api-overview/) — module structure and endpoint summary
