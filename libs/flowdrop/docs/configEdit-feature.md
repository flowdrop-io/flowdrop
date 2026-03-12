# FlowDrop configEdit Feature Reference

## Overview

The `configEdit` property on `NodeMetadata` enables nodes to have their configuration managed dynamically - either by fetching the schema from a REST endpoint at runtime, or by linking to an external configuration form.

This is useful when:

- Config options depend on external data (e.g., available models, API keys, database connections)
- Configuration is managed by a 3rd party system
- The config schema cannot be determined when the workflow is loaded

## Usage in NodeMetadata

```typescript
{
  id: "my_node",
  name: "My Node",
  // ... other node properties

  configEdit: {
    // Option 1: Dynamic schema from REST endpoint
    dynamicSchema: {
      url: "/nodes/{nodeTypeId}/schema",  // Relative to API base URL
      method: "GET",                       // Optional, defaults to GET
      parameterMapping: {                  // Map URL variables to node data
        nodeTypeId: "metadata.id",
        instanceId: "id"
      },
      headers: { "X-Custom": "value" },    // Optional custom headers
      cacheSchema: true,                   // Cache the fetched schema (default: true)
      timeout: 10000                       // Request timeout in ms
    },

    // Option 2: External edit link (opens in new tab)
    externalEditLink: {
      url: "https://admin.example.com/nodes/{nodeTypeId}/configure?instance={instanceId}",
      label: "Configure in Admin Portal",
      icon: "mdi:open-in-new",
      description: "Opens external configuration form",
      parameterMapping: {
        nodeTypeId: "metadata.id",
        instanceId: "id",
        workflowId: "workflowId"
      },
      openInNewTab: true
    },

    // Behavior options
    preferDynamicSchema: true,   // When both options exist, prefer dynamic schema
    showRefreshButton: true,     // Show button to manually refresh schema
    loadingMessage: "Loading configuration...",
    errorMessage: "Failed to load configuration"
  }
}
```

## Parameter Mapping

URL template variables use `{variableName}` syntax. The `parameterMapping` object maps these to paths in the node context:

| Path                | Description                            |
| ------------------- | -------------------------------------- |
| `id`                | Node instance ID (e.g., `"my_node.1"`) |
| `metadata.id`       | Node type ID (e.g., `"my_node"`)       |
| `metadata.name`     | Node type display name                 |
| `metadata.category` | Node category                          |
| `config.{key}`      | Node configuration values              |
| `workflowId`        | Current workflow ID                    |

### Example URL Resolution

```typescript
// Given this configuration:
externalEditLink: {
  url: "https://admin.example.com/nodes/{nodeTypeId}/edit/{instanceId}?workflow={workflowId}",
  parameterMapping: {
    nodeTypeId: "metadata.id",
    instanceId: "id",
    workflowId: "workflowId"
  }
}

// With node data:
// - metadata.id = "llm_chat"
// - id = "llm_chat.1"
// - workflowId = "workflow-123"

// Resolves to:
// https://admin.example.com/nodes/llm_chat/edit/llm_chat.1?workflow=workflow-123
```

## Dynamic Schema API Response Format

The dynamic schema endpoint should return a JSON response with a `ConfigSchema` object:

```json
{
  "success": true,
  "data": {
    "type": "object",
    "properties": {
      "apiKey": {
        "type": "string",
        "title": "API Key",
        "description": "Your API key for authentication",
        "format": "password",
        "required": true
      },
      "model": {
        "type": "string",
        "title": "Model",
        "description": "Select the AI model to use",
        "enum": ["gpt-4", "gpt-3.5-turbo", "claude-3"],
        "default": "gpt-4"
      },
      "temperature": {
        "type": "number",
        "title": "Temperature",
        "description": "Sampling temperature (0-2)",
        "minimum": 0,
        "maximum": 2,
        "default": 0.7
      },
      "enableLogging": {
        "type": "boolean",
        "title": "Enable Logging",
        "description": "Log all requests for debugging",
        "default": false
      }
    }
  }
}
```

### Supported Response Formats

The service accepts multiple response formats:

1. Direct schema: `{ type: "object", properties: {...} }`
2. Wrapped in data: `{ data: { type: "object", properties: {...} } }`
3. Wrapped in schema: `{ schema: { type: "object", properties: {...} } }`
4. API response: `{ success: true, data: { type: "object", properties: {...} } }`

## When to Use Each Option

### Use `dynamicSchema` when:

- Config options are fetched from an external API
- Options change based on user authentication or permissions
- You want FlowDrop to render the configuration form
- Schema needs to be refreshed periodically

### Use `externalEditLink` when:

- Configuration is managed by a 3rd party system
- You need a specialized UI not supported by FlowDrop forms
- Config includes complex nested structures or file uploads
- The external system handles validation and persistence

### Use Both when:

- You want a fallback if dynamic schema fetch fails
- Some users prefer the external editor
- Set `preferDynamicSchema: true` to default to dynamic schema

## Service Functions

FlowDrop exports these functions for working with configEdit:

```typescript
import {
  fetchDynamicSchema,
  resolveExternalEditUrl,
  getEffectiveConfigEditOptions,
  clearSchemaCache,
  invalidateSchemaCache,
  hasConfigEditOptions,
  shouldShowExternalEdit,
  shouldUseDynamicSchema,
} from "@flowdrop/flowdrop";
```

### `fetchDynamicSchema(endpoint, node, workflowId?)`

Fetches a config schema from a REST endpoint with caching support.

```typescript
const result = await fetchDynamicSchema(
  node.data.metadata.configEdit.dynamicSchema,
  node,
  workflowId,
);

if (result.success) {
  console.log("Schema:", result.schema);
  console.log("From cache:", result.fromCache);
} else {
  console.error("Error:", result.error);
}
```

### `resolveExternalEditUrl(link, node, workflowId?, callbackUrl?)`

Resolves URL template variables for external edit links.

```typescript
const url = resolveExternalEditUrl(
  node.data.metadata.configEdit.externalEditLink,
  node,
  workflowId,
);
window.open(url, "_blank");
```

### `clearSchemaCache(pattern?)`

Clears cached schemas. Optionally filter by pattern.

```typescript
// Clear all cached schemas
clearSchemaCache();

// Clear schemas for a specific node type
clearSchemaCache("my_node");
```

## TypeScript Types

```typescript
import type {
  ConfigEditOptions,
  DynamicSchemaEndpoint,
  ExternalEditLink,
  HttpMethod,
  DynamicSchemaResult,
} from "@flowdrop/flowdrop";
```

## Demo Nodes

FlowDrop includes demo nodes showcasing the configEdit feature:

- `dynamic_config_demo` - Both external link and dynamic schema
- `external_only_config_demo` - External edit link only
- `dynamic_schema_only_demo` - Dynamic schema fetching only

These are available in the "Tools" category when using the mock API.
