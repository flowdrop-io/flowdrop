---
title: Node Types
description: Built-in node types and the port system in FlowDrop.
---

FlowDrop ships with 7 built-in node types, each designed for specific workflow patterns.

## Built-in Types

| Type | Purpose | Description |
|------|---------|-------------|
| `default` | Full-featured nodes | Input/output port lists, icon, label, description |
| `simple` | Compact layout | Header with icon and description, space-efficient |
| `square` | Icon-only | Minimal design for simple operations |
| `tool` | AI agent tools | Tool metadata with badge label |
| `gateway` | Branching logic | Conditional output paths with multiple branches |
| `terminal` | Start/end points | Circular nodes for workflow entry and exit |
| `note` | Documentation | Markdown-enabled sticky notes (no execution) |

## Node Metadata

Every node type in the sidebar is defined by a `NodeMetadata` object:

```typescript
interface NodeMetadata {
  id: string;              // Unique identifier
  name: string;            // Display name
  type: string;            // Visual component type
  description?: string;    // Shown in sidebar and tooltips
  category?: string;       // Sidebar grouping
  version?: string;
  icon?: string;           // Iconify icon (e.g., "mdi:code-braces")
  color?: string;          // CSS color for node accent
  badge?: string;          // Label badge (e.g., "TOOL", "API")
  inputs?: NodePort[];     // Input port definitions
  outputs?: NodePort[];    // Output port definitions
  configSchema?: object;   // JSON Schema for config form
  uiSchema?: object;       // Layout hints for config form
  config?: object;         // Default config values
  tags?: string[];         // Searchable tags
  supportedTypes?: string[]; // Alternative visual types
}
```

## Port System

Ports define how nodes connect. Each port has a data type that determines compatibility:

```typescript
interface NodePort {
  id: string;           // Unique port identifier
  name: string;         // Display name
  type: string;         // "input", "output", or "metadata"
  dataType: string;     // e.g., "string", "number", "tool", "trigger"
  required?: boolean;   // Whether connection is required
  description?: string;
  defaultValue?: unknown;
}
```

### Port Data Types

The port configuration system defines which data types exist and which types are compatible:

```typescript
interface PortDataTypeConfig {
  id: string;
  name: string;
  description?: string;
  color: string;        // Visual color for the port
  category?: string;
  aliases?: string[];
}
```

### Connection Validation

FlowDrop validates connections automatically:

- **Type compatibility** — only compatible port data types can connect
- **Cycle detection** — prevents circular dependencies (O(V+E) algorithm)
- **Loopback prevention** — nodes cannot connect to themselves

### Proximity Connect

When dragging a node near compatible ports, FlowDrop can auto-connect them. This is configurable via editor settings:

```typescript
const app = await mountFlowDropApp(container, {
  features: {
    proximityConnect: true,
    proximityConnectDistance: 50 // pixels
  }
});
```

## Dynamic Ports

Nodes can define user-configurable ports through special config properties:

```json
{
  "dynamicInputs": {
    "type": "array",
    "title": "Input Ports",
    "items": {
      "type": "object",
      "properties": {
        "id": { "type": "string", "title": "Port ID" },
        "name": { "type": "string", "title": "Port Name" },
        "dataType": { "type": "string", "title": "Data Type", "default": "any" }
      }
    }
  }
}
```

## Custom Node Types

Beyond the built-in types, you can register custom Svelte components as node types. See the [Custom Nodes guide](/guides/custom-nodes/) for details.
