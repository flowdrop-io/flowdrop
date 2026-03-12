# Config Schema & Dynamic Forms Guide

FlowDrop automatically generates configuration forms from JSON Schema definitions. This guide covers everything from basic static schemas to dynamic runtime forms, conditional fields, and advanced layout control.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Field Types & Formats](#field-types--formats)
- [Select Fields & Labeled Options](#select-fields--labeled-options)
- [Autocomplete Fields](#autocomplete-fields)
- [Template Fields](#template-fields)
- [UISchema Layout](#uischema-layout)
- [Special Config Properties](#special-config-properties)
- [Dynamic Schema (Runtime)](#dynamic-schema-runtime)
- [Conditional Fields with Dynamic Schema](#conditional-fields-with-dynamic-schema)
- [External Edit Links](#external-edit-links)
- [Using ConfigForm Standalone](#using-configform-standalone)
- [Service Functions](#service-functions)
- [TypeScript Types](#typescript-types)

---

## Overview

FlowDrop provides three ways to define configuration forms for nodes:

| Approach                                   | When to use                                       |
| ------------------------------------------ | ------------------------------------------------- |
| **Static `configSchema`**                  | Fields are known ahead of time                    |
| **Dynamic `configEdit.dynamicSchema`**     | Fields depend on external data or user selections |
| **External `configEdit.externalEditLink`** | Configuration is managed by a 3rd-party system    |

All three approaches can be combined — FlowDrop tries the dynamic schema first, then falls back to the static schema if the fetch fails.

---

## Quick Start

Define `configSchema` on your node metadata. FlowDrop auto-renders the form:

```typescript
const myNode: NodeMetadata = {
  id: "my-processor",
  name: "My Processor",
  description: "Processes data",
  category: "processing",
  version: "1.0.0",
  inputs: [{ id: "in", name: "Input", dataType: "any" }],
  outputs: [{ id: "out", name: "Output", dataType: "any" }],
  configSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        title: "Name",
        description: "A friendly name for this processor",
      },
      enabled: {
        type: "boolean",
        title: "Enabled",
        default: true,
      },
    },
    required: ["name"],
  },
  config: { enabled: true },
};
```

---

## Field Types & Formats

The `type` and `format` properties control how each field renders.

### Basic Types

| `type`    | Renders as            |
| --------- | --------------------- |
| `string`  | Text input            |
| `number`  | Number input          |
| `integer` | Integer input         |
| `boolean` | Toggle switch         |
| `array`   | Repeatable field list |
| `object`  | Nested fieldset       |

### Format Overrides

Use `format` to change the rendering of a field:

| Format         | Renders as               | Notes                                 |
| -------------- | ------------------------ | ------------------------------------- |
| `multiline`    | Textarea                 | Multi-line text input                 |
| `hidden`       | Nothing                  | Stored in config but not shown in UI  |
| `range`        | Slider                   | Requires `minimum` and `maximum`      |
| `json`         | CodeMirror editor        | JSON syntax highlighting & validation |
| `code`         | CodeMirror editor        | Alias for `json`                      |
| `markdown`     | SimpleMDE editor         | Toolbar and preview                   |
| `template`     | CodeMirror editor        | `{{ variable }}` autocomplete         |
| `autocomplete` | Text input + suggestions | Fetches options from API              |

### Examples

```json
{
  "type": "object",
  "properties": {
    "prompt": {
      "type": "string",
      "title": "Prompt",
      "format": "multiline",
      "description": "Enter your prompt text"
    },
    "temperature": {
      "type": "number",
      "title": "Temperature",
      "format": "range",
      "minimum": 0,
      "maximum": 2,
      "default": 0.7
    },
    "systemMessage": {
      "type": "string",
      "title": "System Message",
      "format": "template",
      "description": "Use {{ variable }} for dynamic values"
    },
    "metadata": {
      "type": "object",
      "title": "Metadata",
      "format": "json"
    },
    "internalId": {
      "type": "string",
      "format": "hidden"
    }
  }
}
```

### Field Constraints

```json
{
  "temperature": {
    "type": "number",
    "minimum": 0,
    "maximum": 2,
    "default": 0.7
  },
  "maxTokens": {
    "type": "integer",
    "minimum": 1,
    "maximum": 4096,
    "default": 1000
  },
  "apiKey": {
    "type": "string",
    "minLength": 10,
    "maxLength": 100,
    "pattern": "^sk-[a-zA-Z0-9]+$"
  }
}
```

### Read-Only Fields

Add `"readOnly": true` to any property to display it but prevent editing:

```json
{
  "status": {
    "type": "string",
    "title": "Status",
    "readOnly": true
  }
}
```

---

## Select Fields & Labeled Options

### Simple Enum (dropdown)

```json
{
  "model": {
    "type": "string",
    "title": "Model",
    "enum": ["gpt-4o", "gpt-4o-mini", "claude-3"],
    "default": "gpt-4o-mini"
  }
}
```

### Labeled Options with `oneOf`

Use `oneOf` with `const`/`title` for human-readable labels:

```json
{
  "status": {
    "type": "string",
    "title": "Status",
    "oneOf": [
      { "const": "pending", "title": "Pending" },
      { "const": "in_progress", "title": "In Progress" },
      { "const": "completed", "title": "Completed" }
    ],
    "default": "pending"
  }
}
```

### Multi-Select (checkboxes)

Add `"multiple": true` with an `enum` to render as checkboxes:

```json
{
  "tags": {
    "type": "string",
    "title": "Tags",
    "enum": ["urgent", "review", "archive", "featured"],
    "multiple": true,
    "default": []
  }
}
```

---

## Autocomplete Fields

Autocomplete fields fetch suggestions from a remote API as the user types.

```json
{
  "userId": {
    "type": "string",
    "title": "User",
    "format": "autocomplete",
    "autocomplete": {
      "url": "/api/users/search",
      "queryParam": "q",
      "minChars": 2,
      "debounceMs": 300,
      "labelField": "name",
      "valueField": "id",
      "allowFreeText": false,
      "fetchOnFocus": true
    }
  }
}
```

### Autocomplete Options

| Option          | Type      | Default   | Description                          |
| --------------- | --------- | --------- | ------------------------------------ |
| `url`           | `string`  | —         | API endpoint for suggestions         |
| `queryParam`    | `string`  | `"q"`     | Query parameter name                 |
| `minChars`      | `number`  | `0`       | Minimum characters before fetching   |
| `debounceMs`    | `number`  | `300`     | Debounce delay in ms                 |
| `labelField`    | `string`  | `"label"` | Response field for display text      |
| `valueField`    | `string`  | `"value"` | Response field for stored value      |
| `allowFreeText` | `boolean` | `false`   | Allow values not in suggestions      |
| `fetchOnFocus`  | `boolean` | `false`   | Fetch all options when field focused |
| `multiple`      | `boolean` | `false`   | Allow multiple selections (tags)     |

---

## Template Fields

Template fields provide CodeMirror editing with `{{ variable }}` syntax highlighting and autocomplete from connected node outputs.

```json
{
  "prompt": {
    "type": "string",
    "title": "Prompt Template",
    "format": "template",
    "variables": {
      "ports": ["data", "context"],
      "showHints": true
    }
  }
}
```

### Variables Configuration

| Option            | Type                 | Description                         |
| ----------------- | -------------------- | ----------------------------------- |
| `ports`           | `string[]`           | Which input ports provide variables |
| `schema`          | `VariableSchema`     | Pre-defined static variables        |
| `includePortName` | `boolean`            | Prefix variables with port name     |
| `showHints`       | `boolean`            | Show variable hints below editor    |
| `api`             | `ApiVariablesConfig` | Fetch variables from API            |

---

## UISchema Layout

By default, fields render in property order. Use `uiSchema` to control layout, grouping, and field ordering — inspired by [JSON Forms](https://jsonforms.io/).

### Vertical Layout

```json
{
  "type": "VerticalLayout",
  "elements": [
    { "type": "Control", "scope": "#/properties/name" },
    { "type": "Control", "scope": "#/properties/model" },
    { "type": "Control", "scope": "#/properties/prompt" }
  ]
}
```

### Grouped Fields

```json
{
  "type": "VerticalLayout",
  "elements": [
    { "type": "Control", "scope": "#/properties/name" },
    { "type": "Control", "scope": "#/properties/model" },
    {
      "type": "Group",
      "label": "Advanced Settings",
      "collapsible": true,
      "defaultOpen": false,
      "elements": [
        { "type": "Control", "scope": "#/properties/temperature" },
        { "type": "Control", "scope": "#/properties/maxTokens" },
        { "type": "Control", "scope": "#/properties/topP" }
      ]
    }
  ]
}
```

### Label Overrides

```json
{ "type": "Control", "scope": "#/properties/prompt", "label": "System Prompt" }
```

### Element Types

| Type             | Description                                                             |
| ---------------- | ----------------------------------------------------------------------- |
| `Control`        | Renders a single form field. `scope` is a JSON Pointer to the property. |
| `VerticalLayout` | Stacks child elements vertically.                                       |
| `Group`          | Wraps elements in a collapsible fieldset with a label.                  |

### Group Options

| Option        | Type      | Default | Description                |
| ------------- | --------- | ------- | -------------------------- |
| `label`       | `string`  | —       | Group heading text         |
| `description` | `string`  | —       | Help text below heading    |
| `collapsible` | `boolean` | `true`  | Allow collapsing the group |
| `defaultOpen` | `boolean` | `true`  | Initial collapsed state    |

---

## Special Config Properties

Certain property names trigger automatic behaviors in FlowDrop. See the [full reference](./config-schema-special-properties.md) for details.

| Property              | Type            | Behavior                                                   |
| --------------------- | --------------- | ---------------------------------------------------------- |
| `instanceTitle`       | `string`        | Overrides the node's displayed title                       |
| `instanceDescription` | `string`        | Overrides the node's displayed description                 |
| `instanceBadge`       | `string`        | Overrides the node's badge                                 |
| `nodeType`            | `string`        | Switches visual rendering type (requires `supportedTypes`) |
| `dynamicInputs`       | `DynamicPort[]` | Creates user-defined input handles                         |
| `dynamicOutputs`      | `DynamicPort[]` | Creates user-defined output handles                        |
| `branches`            | `Branch[]`      | Creates conditional output paths (gateway nodes)           |

### Display Order

Use `x-display-order` to control field position. Negative values appear first:

```json
{
  "instanceTitle": {
    "type": "string",
    "title": "Custom Title",
    "x-display-order": -2
  },
  "instanceDescription": {
    "type": "string",
    "title": "Custom Description",
    "format": "multiline",
    "x-display-order": -1
  }
}
```

---

## Dynamic Schema (Runtime)

Use `configEdit.dynamicSchema` to fetch config schemas from your backend at runtime. This is the recommended approach when fields depend on external data or user selections.

### Basic Setup

```typescript
const myNode: NodeMetadata = {
  id: "dynamic-processor",
  name: "Dynamic Processor",
  // ...
  configEdit: {
    dynamicSchema: {
      url: "/api/nodes/{nodeTypeId}/schema",
      method: "GET",
      parameterMapping: {
        nodeTypeId: "metadata.id",
      },
      cacheSchema: true,
      timeout: 10000,
    },
    showRefreshButton: true,
    loadingMessage: "Loading configuration...",
    errorMessage: "Failed to load schema",
  },
  // Fallback static schema (used if API fails)
  configSchema: {
    type: "object",
    properties: {
      apiKey: { type: "string", title: "API Key" },
    },
  },
};
```

### Dynamic Schema Endpoint Options

| Option             | Type      | Default | Description                                 |
| ------------------ | --------- | ------- | ------------------------------------------- |
| `url`              | `string`  | —       | URL template with `{variable}` placeholders |
| `method`           | `string`  | `"GET"` | HTTP method (`GET`, `POST`, `PUT`, `PATCH`) |
| `headers`          | `object`  | —       | Custom request headers                      |
| `body`             | `object`  | —       | Request body for POST/PUT/PATCH             |
| `parameterMapping` | `object`  | —       | Maps URL variables to node data paths       |
| `cacheSchema`      | `boolean` | `true`  | Cache responses (5 min TTL)                 |
| `timeout`          | `number`  | `10000` | Request timeout in ms                       |

### Parameter Mapping

URL template variables are resolved from node data:

| Path                | Description                            |
| ------------------- | -------------------------------------- |
| `id`                | Node instance ID (e.g., `"my_node.1"`) |
| `metadata.id`       | Node type ID (e.g., `"my_node"`)       |
| `metadata.name`     | Node type display name                 |
| `metadata.category` | Node category                          |
| `config.{key}`      | Current config values                  |
| `workflowId`        | Current workflow ID                    |

### API Response Format

Your endpoint should return a `ConfigSchema` object. Multiple response shapes are accepted:

```json
// Direct schema
{ "type": "object", "properties": { ... } }

// Wrapped in "data"
{ "data": { "type": "object", "properties": { ... } } }

// Wrapped in "schema"
{ "schema": { "type": "object", "properties": { ... } } }

// With success flag
{ "success": true, "data": { "type": "object", "properties": { ... } } }
```

You can optionally return a `uiSchema` alongside the config schema:

```json
{
  "configSchema": {
    "type": "object",
    "properties": {
      "model": { "type": "string", "enum": ["gpt-4o", "claude-3"] },
      "temperature": {
        "type": "number",
        "format": "range",
        "minimum": 0,
        "maximum": 2
      }
    }
  },
  "uiSchema": {
    "type": "VerticalLayout",
    "elements": [
      { "type": "Control", "scope": "#/properties/model" },
      { "type": "Control", "scope": "#/properties/temperature" }
    ]
  }
}
```

---

## Conditional Fields with Dynamic Schema

Dynamic schemas enable conditional form fields — where the available fields change based on user selections. The pattern works by including current config values in the schema request, so your API can return a different schema based on those values.

### How It Works

1. User changes a config value (e.g., selects a "provider")
2. FlowDrop re-fetches the schema, passing current config values via `parameterMapping`
3. Your API returns a new schema with fields appropriate for the selected value
4. The form re-renders with the updated fields

### Node Definition

```typescript
const myNode: NodeMetadata = {
  id: "ai-model",
  name: "AI Model",
  description: "Configurable AI model node",
  category: "models",
  version: "1.0.0",
  inputs: [{ id: "in", name: "Input", dataType: "string" }],
  outputs: [{ id: "out", name: "Output", dataType: "string" }],
  configEdit: {
    dynamicSchema: {
      url: "/api/nodes/{nodeTypeId}/schema?provider={provider}",
      method: "GET",
      parameterMapping: {
        nodeTypeId: "metadata.id",
        provider: "config.provider", // passes current selection
      },
      cacheSchema: true,
    },
    showRefreshButton: true,
  },
  // Minimal fallback schema
  configSchema: {
    type: "object",
    properties: {
      provider: {
        type: "string",
        title: "Provider",
        oneOf: [
          { const: "openai", title: "OpenAI" },
          { const: "anthropic", title: "Anthropic" },
          { const: "local", title: "Local (Ollama)" },
        ],
      },
    },
  },
  config: { provider: "openai" },
};
```

### Backend Example (Express)

```typescript
app.get("/api/nodes/:nodeTypeId/schema", (req, res) => {
  const { provider } = req.query;

  // Base fields always present
  const properties: Record<string, any> = {
    provider: {
      type: "string",
      title: "Provider",
      oneOf: [
        { const: "openai", title: "OpenAI" },
        { const: "anthropic", title: "Anthropic" },
        { const: "local", title: "Local (Ollama)" },
      ],
    },
  };

  // Conditional fields based on provider selection
  switch (provider) {
    case "openai":
      properties.apiKey = {
        type: "string",
        title: "API Key",
        description: "Your OpenAI API key",
      };
      properties.model = {
        type: "string",
        title: "Model",
        oneOf: [
          { const: "gpt-4o", title: "GPT-4o" },
          { const: "gpt-4o-mini", title: "GPT-4o Mini" },
          { const: "o1", title: "o1" },
        ],
        default: "gpt-4o",
      };
      properties.temperature = {
        type: "number",
        title: "Temperature",
        format: "range",
        minimum: 0,
        maximum: 2,
        default: 0.7,
      };
      break;

    case "anthropic":
      properties.apiKey = {
        type: "string",
        title: "API Key",
        description: "Your Anthropic API key",
      };
      properties.model = {
        type: "string",
        title: "Model",
        oneOf: [
          { const: "claude-opus-4-6", title: "Claude Opus 4.6" },
          { const: "claude-sonnet-4-6", title: "Claude Sonnet 4.6" },
          { const: "claude-haiku-4-5", title: "Claude Haiku 4.5" },
        ],
        default: "claude-sonnet-4-6",
      };
      properties.maxTokens = {
        type: "integer",
        title: "Max Tokens",
        minimum: 1,
        maximum: 8192,
        default: 1024,
      };
      break;

    case "local":
      properties.endpoint = {
        type: "string",
        title: "Ollama Endpoint",
        default: "http://localhost:11434",
      };
      properties.model = {
        type: "string",
        title: "Model",
        format: "autocomplete",
        autocomplete: {
          url: "/api/ollama/models",
          labelField: "name",
          valueField: "name",
          fetchOnFocus: true,
        },
      };
      break;
  }

  res.json({
    type: "object",
    properties,
    required: ["provider"],
  });
});
```

### Using POST with Current Config

For more complex conditional logic, send the full config via POST:

```typescript
configEdit: {
  dynamicSchema: {
    url: '/api/nodes/{nodeTypeId}/schema',
    method: 'POST',
    parameterMapping: {
      nodeTypeId: 'metadata.id'
    },
    body: {
      config: '{config}'    // sends entire current config as body
    }
  }
}
```

---

## External Edit Links

For configuration managed by a 3rd-party system or when you need a custom UI that FlowDrop forms can't provide (e.g., file uploads, complex nested structures).

```typescript
configEdit: {
  externalEditLink: {
    url: 'https://admin.example.com/nodes/{nodeTypeId}/configure?instance={instanceId}',
    label: 'Configure in Admin Portal',
    icon: 'mdi:open-in-new',
    description: 'Opens external configuration form',
    parameterMapping: {
      nodeTypeId: 'metadata.id',
      instanceId: 'id',
      workflowId: 'workflowId'
    },
    openInNewTab: true,
    callbackUrlParam: 'returnUrl'
  }
}
```

### Combining Dynamic Schema + External Edit

You can offer both options. Use `preferDynamicSchema` to control the default:

```typescript
configEdit: {
  dynamicSchema: { url: '/api/nodes/{nodeTypeId}/schema', ... },
  externalEditLink: { url: 'https://admin.example.com/...', ... },
  preferDynamicSchema: true   // show dynamic form by default
}
```

---

## Using ConfigForm Standalone

You can render the `ConfigForm` component directly, independent of the workflow editor:

```svelte
<script>
  import { ConfigForm } from "@flowdrop/flowdrop";

  const schema = {
    type: "object",
    properties: {
      name: { type: "string", title: "Name" },
      email: { type: "string", title: "Email" },
      role: {
        type: "string",
        title: "Role",
        oneOf: [
          { const: "admin", title: "Admin" },
          { const: "editor", title: "Editor" },
          { const: "viewer", title: "Viewer" },
        ],
      },
    },
    required: ["name", "email"],
  };

  const uiSchema = {
    type: "VerticalLayout",
    elements: [
      { type: "Control", scope: "#/properties/name" },
      { type: "Control", scope: "#/properties/email" },
      { type: "Control", scope: "#/properties/role" },
    ],
  };

  let values = $state({ role: "viewer" });
</script>

<ConfigForm
  {schema}
  {uiSchema}
  {values}
  onChange={(config) => {
    values = config;
  }}
  onSave={(config) => {
    /* persist */
  }}
  onCancel={() => {
    /* close */
  }}
/>
```

### ConfigForm Props

| Prop            | Type                      | Description                              |
| --------------- | ------------------------- | ---------------------------------------- |
| `node`          | `WorkflowNode`            | Derive schema/values from a node         |
| `schema`        | `ConfigSchema`            | Direct schema (alternative to `node`)    |
| `uiSchema`      | `UISchemaElement`         | Optional layout definition               |
| `values`        | `Record<string, unknown>` | Direct config values                     |
| `workflowId`    | `string`                  | Current workflow ID (for dynamic schema) |
| `workflowNodes` | `WorkflowNode[]`          | For template variable derivation         |
| `workflowEdges` | `WorkflowEdge[]`          | For template variable derivation         |
| `authProvider`  | `AuthProvider`            | Auth for dynamic schema requests         |
| `onChange`      | `function`                | Called when any field changes            |
| `onSave`        | `function`                | Called when the save button is clicked   |
| `onCancel`      | `function`                | Called when cancel is clicked            |

---

## Service Functions

FlowDrop exports utility functions for working with dynamic schemas:

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

Fetches a config schema from a REST endpoint with caching.

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
clearSchemaCache(); // clear all
clearSchemaCache("my_node"); // clear for a specific node type
```

### `invalidateSchemaCache(node, endpoint)`

Invalidates the cache for a specific node + endpoint combination.

---

## TypeScript Types

All types are available from the main package or the `core` export:

```typescript
import type {
  // Schema
  ConfigSchema,
  ConfigProperty,
  FieldSchema,
  FieldType,
  FieldFormat,

  // UISchema
  UISchemaElement,
  UISchemaControl,
  UISchemaVerticalLayout,
  UISchemaGroup,

  // Dynamic schema
  ConfigEditOptions,
  DynamicSchemaEndpoint,
  DynamicSchemaResult,
  ExternalEditLink,
  HttpMethod,

  // Autocomplete
  AutocompleteConfig,

  // Template variables
  TemplateVariablesConfig,
  TemplateVariable,

  // Nodes
  NodeMetadata,
  WorkflowNode,
} from "@flowdrop/flowdrop";
```

---

## Complete Example

A full node definition demonstrating multiple features:

```typescript
const advancedNode: NodeMetadata = {
  id: "advanced-processor",
  name: "Advanced Processor",
  type: "default",
  supportedTypes: ["default", "simple"],
  description: "A fully-featured processor node",
  category: "processing",
  version: "1.0.0",
  inputs: [
    { id: "data", name: "Data", dataType: "json" },
    { id: "context", name: "Context", dataType: "string" },
  ],
  outputs: [{ id: "result", name: "Result", dataType: "json" }],
  configSchema: {
    type: "object",
    properties: {
      instanceTitle: {
        type: "string",
        title: "Custom Title",
        "x-display-order": -2,
      },
      nodeType: {
        type: "string",
        title: "Node Style",
        oneOf: [
          { const: "default", title: "Default" },
          { const: "simple", title: "Compact" },
        ],
        default: "default",
      },
      model: {
        type: "string",
        title: "Model",
        enum: ["gpt-4o", "gpt-4o-mini", "claude-3"],
        default: "gpt-4o-mini",
      },
      temperature: {
        type: "number",
        title: "Temperature",
        format: "range",
        minimum: 0,
        maximum: 2,
        default: 0.7,
      },
      prompt: {
        type: "string",
        title: "Prompt Template",
        format: "template",
        variables: {
          ports: ["data", "context"],
          showHints: true,
        },
        default: "Process: {{ data }}",
      },
      tags: {
        type: "string",
        title: "Tags",
        enum: ["urgent", "review", "archive"],
        multiple: true,
      },
      internalId: {
        type: "string",
        format: "hidden",
      },
    },
    required: ["model"],
  },
  uiSchema: {
    type: "VerticalLayout",
    elements: [
      { type: "Control", scope: "#/properties/instanceTitle" },
      { type: "Control", scope: "#/properties/model" },
      { type: "Control", scope: "#/properties/prompt" },
      {
        type: "Group",
        label: "Advanced",
        collapsible: true,
        defaultOpen: false,
        elements: [
          { type: "Control", scope: "#/properties/nodeType" },
          { type: "Control", scope: "#/properties/temperature" },
          { type: "Control", scope: "#/properties/tags" },
        ],
      },
    ],
  },
  config: {
    nodeType: "default",
    model: "gpt-4o-mini",
    temperature: 0.7,
  },
};
```

---

## Related Documentation

- [Config Schema Special Properties](./config-schema-special-properties.md) — Reserved property names and their behaviors
- [ConfigEdit Feature Reference](./configEdit-feature.md) — Dynamic schema and external edit API details
- [Theming Guide](./theming.md) — Customizing colors, spacing, and visual tokens
- [Settings Integration](./settings-integration.md) — Persistent user preferences
