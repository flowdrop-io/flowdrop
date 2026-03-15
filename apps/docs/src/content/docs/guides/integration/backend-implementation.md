---
title: Backend Implementation
description: Build the REST API that FlowDrop expects to communicate with.
---

FlowDrop is a frontend editor that calls **your** backend REST API. This guide explains what endpoints to implement, what request/response formats FlowDrop expects, and how to get a working backend running.

## Endpoint Tiers

Not all endpoints are required. Here they are organized by priority:

### Tier 1: Minimum Viable Backend

These 5 endpoints are the **bare minimum** to get FlowDrop working:

| Method | Path             | Purpose                                      |
| ------ | ---------------- | -------------------------------------------- |
| `GET`  | `/health`        | Health check (FlowDrop checks this on mount) |
| `GET`  | `/nodes`         | List available node types                    |
| `GET`  | `/workflows/:id` | Load a workflow                              |
| `POST` | `/workflows`     | Create a new workflow                        |
| `PUT`  | `/workflows/:id` | Update an existing workflow                  |

### Tier 2: Full Editor Experience

These endpoints enable the complete sidebar, categories, and port validation:

| Method   | Path             | Purpose                                    |
| -------- | ---------------- | ------------------------------------------ |
| `GET`    | `/categories`    | Node category definitions (sidebar groups) |
| `GET`    | `/port-config`   | Port data types and compatibility rules    |
| `GET`    | `/nodes/:id`     | Get a single node's metadata               |
| `GET`    | `/workflows`     | List all workflows                         |
| `DELETE` | `/workflows/:id` | Delete a workflow                          |

### Tier 3: Advanced Features

These enable playground, execution, interrupts, and settings:

| Method | Path                                    | Purpose                   |
| ------ | --------------------------------------- | ------------------------- |
| `POST` | `/workflows/:id/execute`                | Execute a workflow        |
| `GET`  | `/workflows/:id/executions/:eid/status` | Execution status          |
| `POST` | `/playground/sessions`                  | Create playground session |
| `GET`  | `/playground/sessions/:sid/messages`    | Poll for messages         |
| `POST` | `/playground/sessions/:sid/messages`    | Send user message         |
| `GET`  | `/interrupts/:id`                       | Get pending interrupt     |
| `POST` | `/interrupts/:id/resolve`               | Resolve an interrupt      |
| `GET`  | `/system/config`                        | Runtime configuration     |
| `GET`  | `/settings`                             | User settings             |
| `PUT`  | `/settings`                             | Update user settings      |

## Base URL Configuration

All paths above are relative to a base URL you configure:

```typescript
import { createEndpointConfig } from '@flowdrop/flowdrop/core';

const endpointConfig = createEndpointConfig('/api/flowdrop');
// Nodes endpoint becomes: GET /api/flowdrop/nodes
```

## Request & Response Formats

### `GET /health`

FlowDrop calls this to verify the backend is reachable.

**Response:**

```json
{
  "status": "ok",
  "version": "1.0.0"
}
```

### `GET /nodes`

Returns all available node types. FlowDrop uses this to populate the sidebar.

**Query parameters:**

- `category` (optional) — filter by category
- `search` (optional) — search name/description
- `limit` (optional, default: 100)
- `offset` (optional, default: 0)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "text_input",
      "name": "Text Input",
      "description": "Accepts text from the user",
      "type": "simple",
      "category": "inputs",
      "icon": "mdi:text-box-outline",
      "inputs": [],
      "outputs": [
        {
          "id": "output",
          "name": "Text",
          "type": "output",
          "dataType": "string"
        }
      ],
      "configSchema": {
        "type": "object",
        "properties": {
          "placeholder": {
            "type": "string",
            "title": "Placeholder",
            "default": "Enter text..."
          }
        }
      }
    }
  ]
}
```

**Key fields in `NodeMetadata`:**

- `id` (required) — unique identifier
- `name` (required) — display name
- `type` — node visual type: `workflowNode`, `simple`, `square`, `tool`, `gateway`, `terminal`, `idea`, `note`
- `category` — sidebar group: `inputs`, `outputs`, `models`, `processing`, `logic`, `tools`, etc.
- `icon` — [Iconify](https://icon-sets.iconify.design/) icon ID (e.g., `mdi:text-box-outline`)
- `inputs` / `outputs` — port definitions with `id`, `name`, `type`, `dataType`
- `configSchema` — JSON Schema defining the configuration form

### `POST /workflows`

Creates a new workflow. FlowDrop sends the full workflow JSON.

**Request body:**

```json
{
  "name": "My Workflow",
  "description": "A simple workflow",
  "nodes": [
    {
      "id": "node-1",
      "type": "simple",
      "position": { "x": 100, "y": 200 },
      "data": {
        "label": "Text Input",
        "config": { "placeholder": "Enter text..." },
        "metadata": { "id": "text_input", "name": "Text Input", "...": "..." }
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "node-1",
      "sourceHandle": "output",
      "target": "node-2",
      "targetHandle": "input"
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "wf-abc123",
    "name": "My Workflow",
    "nodes": [],
    "edges": [],
    "metadata": {
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    }
  }
}
```

### `PUT /workflows/:id`

Updates an existing workflow. Same request body format as `POST`.

### `GET /workflows/:id`

Returns a single workflow by ID. Same response format as `POST` response.

### `GET /categories`

Returns category definitions for the node sidebar.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "inputs",
      "name": "Inputs",
      "description": "Data input nodes",
      "icon": "mdi:import",
      "color": "var(--fd-node-emerald)",
      "weight": 10
    },
    {
      "id": "processing",
      "name": "Processing",
      "description": "Data transformation nodes",
      "icon": "mdi:cog",
      "color": "var(--fd-node-blue)",
      "weight": 30
    }
  ]
}
```

### `GET /port-config`

Returns data type definitions and compatibility rules for port connections.

**Response:**

```json
{
  "success": true,
  "data": {
    "version": "1.0.0",
    "defaultDataType": "string",
    "dataTypes": [
      {
        "id": "string",
        "name": "String",
        "description": "Text data",
        "color": "#10b981",
        "category": "basic"
      },
      {
        "id": "json",
        "name": "JSON",
        "description": "Structured data",
        "color": "#f59e0b",
        "category": "complex"
      }
    ],
    "compatibilityRules": [
      { "from": "string", "to": "json" },
      { "from": "json", "to": "string" }
    ]
  }
}
```

## CORS Configuration

FlowDrop runs in the browser, so your backend must allow cross-origin requests if served from a different domain:

```typescript
// Express example
import cors from 'cors';
app.use(
  cors({
    origin: 'http://localhost:5173', // your frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
```

## Error Response Format

When an operation fails, return a consistent error format:

```json
{
  "success": false,
  "error": "Workflow not found",
  "code": "NOT_FOUND",
  "message": "No workflow exists with ID 'wf-xyz'"
}
```

FlowDrop's API client expects standard HTTP status codes:

- `200` — success
- `201` — created
- `400` — bad request (validation error)
- `401` — unauthorized (triggers `onApiError` and auth provider's `onUnauthorized`)
- `404` — not found
- `500` — server error

## Static vs. Dynamic Node Serving

For simple use cases, you can serve node metadata as **static JSON**:

```typescript
// nodes.json — serve as a static file
const nodes = [
  { id: 'text_input', name: 'Text Input', ... },
  { id: 'http_request', name: 'HTTP Request', ... }
];

app.get('/api/flowdrop/nodes', (req, res) => {
  res.json({ success: true, data: nodes });
});
```

For dynamic use cases, load from a database:

```typescript
app.get('/api/flowdrop/nodes', async (req, res) => {
  const nodes = await db
    .collection('nodes')
    .find({
      ...(req.query.category && { category: req.query.category })
    })
    .toArray();
  res.json({ success: true, data: nodes });
});
```

## Next Steps

- [Backend: Express.js](/recipes/backend-express/) — get a working backend in 15 minutes
- [Framework Integration](/guides/integration/) — connect FlowDrop to your backend
- [API Overview](/reference/api-overview/) — complete module and endpoint reference
- [OpenAPI Specification](https://flowdrop-io.github.io/flowdrop/) — full API contract
