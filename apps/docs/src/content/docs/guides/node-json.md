---
title: Node Structure
description: The JSON format for workflow nodes — WorkflowNode, NodeMetadata, config values, and node types.
---

Every item in a workflow's `nodes` array is a **WorkflowNode**. It combines canvas positioning with the node's type definition (metadata) and user-configured values.

## WorkflowNode

```typescript
interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  deletable?: boolean;
  data: {
    label: string;
    config: ConfigValues;
    metadata: NodeMetadata;
    isProcessing?: boolean;
    error?: string;
    nodeId?: string;
    executionInfo?: NodeExecutionInfo;
    extensions?: NodeExtensions;
  };
}
```

| Field             | Type           | Description                                                                                                     |
| ----------------- | -------------- | --------------------------------------------------------------------------------------------------------------- |
| `id`              | `string`       | Unique instance ID, typically `"{metadataId}.{n}"` (e.g., `"text_input.1"`).                                    |
| `type`            | `string`       | Internal renderer type. Always `"universalNode"` — the visual appearance is controlled by `data.metadata.type`. |
| `position`        | `{x, y}`       | Canvas coordinates in pixels.                                                                                   |
| `deletable`       | `boolean`      | Whether the user can delete this node. Defaults to `true`.                                                      |
| `data.label`      | `string`       | Display name shown in the node header.                                                                          |
| `data.config`     | `ConfigValues` | User-configured settings for this instance.                                                                     |
| `data.metadata`   | `NodeMetadata` | The node type definition — inputs, outputs, config schema, etc.                                                 |
| `data.nodeId`     | `string`       | Alternative identifier, usually same as `id`.                                                                   |
| `data.extensions` | `object`       | Per-instance extension data for plugins.                                                                        |

## NodeMetadata

The `metadata` object defines what the node _is_ — its capabilities, ports, and configuration schema. This is the same structure your backend returns from the `/nodes` API.

```typescript
interface NodeMetadata {
  id: string;
  name: string;
  type?: NodeType;
  supportedTypes?: NodeType[];
  description: string;
  category: NodeCategory;
  version: string;
  icon?: string;
  color?: string;
  badge?: string;
  portDataType?: string;
  inputs: NodePort[];
  outputs: NodePort[];
  configSchema?: ConfigSchema;
  uiSchema?: UISchemaElement;
  config?: Record<string, unknown>;
  tags?: string[];
  formats?: WorkflowFormat[];
  configEdit?: ConfigEditOptions;
  extensions?: NodeExtensions;
}
```

### Key Fields

| Field                | Description                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                 | Machine name (e.g., `"content_loader"`, `"ai_analyzer"`).                                                                             |
| `type`               | Visual rendering style — see [Node Types](#node-types) below.                                                                         |
| `supportedTypes`     | Alternative visual types the user can switch between (e.g., `["tool", "default"]`).                                                   |
| `category`           | Sidebar grouping — see [Categories](#categories) below.                                                                               |
| `icon`               | [Iconify](https://icon-sets.iconify.design/) icon name (e.g., `"mdi:brain"`, `"mdi:text"`). See [Icons reference](/reference/icons/). |
| `color`              | CSS color for the node accent (e.g., `"#9C27B0"`).                                                                                    |
| `badge`              | Short label badge in the header (e.g., `"TOOL"`, `"API"`, `"LLM"`).                                                                   |
| `portDataType`       | Default port data type for tool nodes. Defaults to `"tool"`.                                                                          |
| `inputs` / `outputs` | Port definitions — see [Port System & Data Types](/guides/port-system/).                                                              |
| `configSchema`       | JSON Schema driving the config form — see [Configuration Schema](/guides/config-schema/).                                             |
| `uiSchema`           | Layout hints for form rendering (groups, ordering).                                                                                   |
| `config`             | Default values for the configuration form.                                                                                            |
| `formats`            | Which workflow formats this node is compatible with. Omit for universal nodes.                                                        |
| `configEdit`         | Dynamic schema endpoint or external edit link for advanced configuration.                                                             |

## Node Types

The `type` field controls how the node renders on the canvas:

| Type       | Purpose                                                           |
| ---------- | ----------------------------------------------------------------- |
| `default`  | Full-featured — input/output port lists, icon, label, description |
| `simple`   | Compact — header with icon and description                        |
| `square`   | Icon-only — minimal design for simple operations                  |
| `tool`     | AI agent tools — tool metadata with badge label                   |
| `gateway`  | Branching logic — conditional output paths                        |
| `terminal` | Start/end — circular nodes for workflow entry and exit            |
| `note`     | Documentation — markdown sticky notes (no execution)              |

Custom node types can also be registered. See the [Custom Nodes](/guides/custom-nodes/) guide.

## Categories

Built-in categories for sidebar grouping:

`triggers` · `inputs` · `outputs` · `prompts` · `models` · `processing` · `logic` · `data` · `tools` · `helpers` · `vector stores` · `embeddings` · `memories` · `agents` · `ai`

You can also use any custom string — the editor will create a new sidebar group automatically.

## ConfigValues

The `config` object on each node instance holds the user's configured settings:

```typescript
interface ConfigValues {
  /** Dynamic input ports for user-defined input handles */
  dynamicInputs?: DynamicPort[];
  /** Dynamic output ports for user-defined output handles */
  dynamicOutputs?: DynamicPort[];
  /** Branches for gateway node conditional output paths */
  branches?: Branch[];
  /** Any other properties defined in configSchema */
  [key: string]: unknown;
}
```

Most fields come from the node's `configSchema`. Three special properties trigger editor behavior:

| Property         | Effect                                              |
| ---------------- | --------------------------------------------------- |
| `dynamicInputs`  | Creates additional input port handles at runtime.   |
| `dynamicOutputs` | Creates additional output port handles at runtime.  |
| `branches`       | Creates conditional output paths for gateway nodes. |

Per-instance overrides are also supported via `instanceTitle`, `instanceDescription`, and `instanceBadge` — these override the metadata values for display.

## Example: Simple Input Node

```json
{
  "id": "text_input.1",
  "type": "universalNode",
  "position": { "x": 0, "y": 100 },
  "data": {
    "label": "Text Input",
    "config": {
      "placeholder": "Enter text...",
      "defaultValue": ""
    },
    "metadata": {
      "id": "text_input",
      "name": "Text Input",
      "type": "simple",
      "description": "Simple text input for user data",
      "category": "inputs",
      "icon": "mdi:text",
      "color": "#22c55e",
      "version": "1.0.0",
      "inputs": [],
      "outputs": [
        {
          "id": "text",
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
  }
}
```

## Example: Gateway Node with Branches

```json
{
  "id": "router.1",
  "type": "universalNode",
  "position": { "x": 300, "y": 200 },
  "data": {
    "label": "Priority Router",
    "config": {
      "branches": [
        {
          "name": "high",
          "label": "High Priority",
          "condition": "priority > 8"
        },
        {
          "name": "medium",
          "label": "Medium Priority",
          "condition": "priority >= 4"
        },
        {
          "name": "default",
          "label": "Default",
          "isDefault": true
        }
      ]
    },
    "metadata": {
      "id": "priority_router",
      "name": "Priority Router",
      "type": "gateway",
      "description": "Route items by priority level",
      "category": "logic",
      "icon": "mdi:source-branch",
      "version": "1.0.0",
      "inputs": [
        {
          "id": "input",
          "name": "Input",
          "type": "input",
          "dataType": "json"
        }
      ],
      "outputs": []
    }
  }
}
```

Gateway nodes generate output ports dynamically from the `branches` array. Each branch becomes an output handle named `router.1-output-{branch.name}`.

## Next Steps

- [Edge Structure](/guides/edge-json/) — how connections reference node and port IDs
- [Port System & Data Types](/guides/port-system/) — input/output port definitions and data types
- [Configuration Schema](/guides/config-schema/) — JSON Schema that powers config forms
- [Node Types](/guides/node-types/) — visual appearance and behavior in the editor
