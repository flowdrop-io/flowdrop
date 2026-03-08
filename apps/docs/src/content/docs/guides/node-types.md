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

For the complete JSON structure, see [Node Structure](/guides/node-json/). For port definitions and data types, see [Port System & Data Types](/guides/port-system/).

## Connection Validation

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
