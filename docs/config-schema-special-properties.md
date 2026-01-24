# Config Schema Special Properties

This document describes the special "magical" properties that FlowDrop recognizes in node configurations. These properties trigger special behaviors like creating dynamic ports, switching node visual types, and defining conditional branches.

## Table of Contents

- [Reserved Config Property Names](#reserved-config-property-names)
- [Instance Display Overrides](#instance-display-overrides)
- [Schema Format Types](#schema-format-types)
- [Dynamic Port Properties](#dynamic-port-properties)
- [Node Type Selection](#node-type-selection)
- [Gateway Branches](#gateway-branches)

---

## Reserved Config Property Names

These property names in `config` have special meaning and trigger automatic behaviors:

| Property              | Type            | Description                                                                 |
| --------------------- | --------------- | --------------------------------------------------------------------------- |
| `instanceTitle`       | `string`        | Per-instance title override (replaces `label` display)                      |
| `instanceDescription` | `string`        | Per-instance description override (replaces `metadata.description` display) |
| `nodeType`            | `string`        | Changes the visual rendering type of the node                               |
| `dynamicInputs`       | `DynamicPort[]` | Creates user-defined input handles                                          |
| `dynamicOutputs`      | `DynamicPort[]` | Creates user-defined output handles                                         |
| `branches`            | `Branch[]`      | Creates conditional output branches (Gateway nodes)                         |

---

## Instance Display Overrides

### `instanceTitle` - Custom Node Title

Allows each node instance to have a unique title that overrides the default `label` derived from the node type name. This is useful when you have multiple instances of the same node type and want to give each a meaningful name.

**Fallback Behavior:**
- If `instanceTitle` is set in config → displays `instanceTitle`
- If not set → displays `label` (from node data)

**Supported Node Types:**
- `workflowNode` (Default)
- `simple` (Simple)
- `terminal` (Terminal - Start/End/Exit)
- `gateway` (Gateway - Branching)
- `tool` (Tool)
- `idea` (Idea)

**Example Config Schema:**

```json
{
  "type": "object",
  "properties": {
    "instanceTitle": {
      "type": "string",
      "title": "Custom Title",
      "description": "Override the default node title for this instance",
      "x-display-order": -2
    }
  }
}
```

### `instanceDescription` - Custom Node Description

Allows each node instance to have a unique description that overrides the default `metadata.description` from the node type definition. This is useful for documenting what a specific node instance does within your workflow.

**Fallback Behavior:**
- If `instanceDescription` is set in config → displays `instanceDescription`
- If not set → displays `metadata.description` (from node type definition)

**Supported Node Types:**
- `workflowNode` (Default)
- `simple` (Simple)
- `terminal` (Terminal - Start/End/Exit)
- `gateway` (Gateway - Branching)
- `tool` (Tool)
- `idea` (Idea)

**Example Config Schema:**

```json
{
  "type": "object",
  "properties": {
    "instanceDescription": {
      "type": "string",
      "title": "Custom Description",
      "description": "Override the default description for this instance",
      "format": "multiline",
      "x-display-order": -1
    }
  }
}
```

### Combined Example

Here's how to add both properties to a node's config schema to make title and description fully editable:

```json
{
  "id": "llm-processor",
  "name": "LLM Processor",
  "description": "Process text using an LLM",
  "configSchema": {
    "type": "object",
    "properties": {
      "instanceTitle": {
        "type": "string",
        "title": "Custom Title",
        "description": "Give this node a custom name (e.g., 'Summarizer', 'Translator')",
        "x-display-order": -2
      },
      "instanceDescription": {
        "type": "string",
        "title": "Custom Description",
        "description": "Describe what this specific node does",
        "format": "multiline",
        "x-display-order": -1
      },
      "model": {
        "type": "string",
        "title": "Model",
        "enum": ["gpt-4o", "gpt-4o-mini", "claude-3"],
        "default": "gpt-4o-mini"
      },
      "prompt": {
        "type": "string",
        "title": "Prompt",
        "format": "multiline"
      }
    }
  }
}
```

**Result:**
- User can set a custom title like "Email Summarizer" instead of "LLM Processor"
- User can set a custom description like "Summarizes incoming emails into 3 bullet points"
- These values are stored in the node's `config` and persist with the workflow

---

## Schema Format Types

The `format` property in a config schema field controls how it's rendered in the form:

| Format      | Renders As | Description                                                    |
| ----------- | ---------- | -------------------------------------------------------------- |
| `hidden`    | Nothing    | Field is hidden from UI but included in form submission        |
| `multiline` | Textarea   | Multi-line text input                                          |
| `range`     | Slider     | Range slider for numeric values (requires `minimum`/`maximum`) |
| `json`      | CodeMirror | JSON editor with syntax highlighting and validation            |
| `code`      | CodeMirror | Alias for `json` - CodeMirror editor                           |
| `markdown`  | SimpleMDE  | Markdown editor with toolbar and preview                       |
| `template`  | CodeMirror | Template editor with `{{ variable }}` syntax highlighting      |

### Example: Schema with Different Formats

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
      "format": "json",
      "description": "Additional JSON metadata"
    },
    "internalId": {
      "type": "string",
      "format": "hidden"
    }
  }
}
```

---

## Dynamic Port Properties

### `dynamicInputs` - Dynamic Input Handles

Allows users to define additional input ports at runtime. These ports are combined with the static inputs defined in `metadata.inputs`.

**Structure:**

```typescript
interface DynamicPort {
  /** Unique identifier for the port (used as handle ID) */
  name: string;
  /** Display label shown in the UI */
  label?: string;
  /** Description of the port's purpose */
  description?: string;
  /** Data type for validation and styling */
  dataType?: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any' | 'json';
  /** Whether this port is required for execution */
  required?: boolean;
}
```

**Example Config:**

```json
{
  "dynamicInputs": [
    {
      "name": "extra_context",
      "label": "Extra Context",
      "dataType": "string",
      "description": "Additional context data"
    },
    {
      "name": "user_data",
      "label": "User Data",
      "dataType": "json",
      "required": true
    }
  ]
}
```

### `dynamicOutputs` - Dynamic Output Handles

Same as `dynamicInputs` but for output ports.

**Example Config:**

```json
{
  "dynamicOutputs": [
    {
      "name": "processed_data",
      "label": "Processed Data",
      "dataType": "json"
    },
    {
      "name": "summary",
      "label": "Summary",
      "dataType": "string"
    }
  ]
}
```

---

## Node Type Selection

### `nodeType` - Visual Node Type

The `nodeType` config property changes how a node is visually rendered. This allows a single node definition to support multiple visual representations.

**Available Built-in Types:**

| Type       | Description                              |
| ---------- | ---------------------------------------- |
| `default`  | Standard workflow node with full details |
| `simple`   | Compact layout with minimal chrome       |
| `square`   | Geometric square layout                  |
| `tool`     | Specialized style for agent tools        |
| `gateway`  | Branching control flow visualization     |
| `terminal` | Start/end/exit node styling              |
| `note`     | Sticky note style for annotations        |

**How It Works:**

1. The node's `metadata.supportedTypes` defines which types are allowed
2. The `config.nodeType` value is checked against allowed types
3. If valid, the node renders using that visual type
4. If invalid or missing, falls back to `metadata.type` or `"default"`

**Example: Node Metadata with Multiple Supported Types**

```json
{
  "id": "my-node",
  "name": "My Node",
  "type": "default",
  "supportedTypes": ["default", "simple", "square"],
  "configSchema": {
    "type": "object",
    "properties": {
      "nodeType": {
        "type": "string",
        "title": "Node Style",
        "enum": ["default", "simple", "square"],
        "enumNames": ["Default (detailed)", "Simple (compact)", "Square"],
        "default": "default"
      }
    }
  }
}
```

**Utility Function:**

You can use the `createNodeTypeConfigProperty()` utility to automatically generate the enum options:

```typescript
import { createNodeTypeConfigProperty } from '$lib/utils/nodeTypes.js';

// Automatically generates enum values from metadata.supportedTypes
const nodeTypeProperty = createNodeTypeConfigProperty(metadata);
```

---

## Gateway Branches

### `branches` - Conditional Output Paths

Gateway nodes use `config.branches` to define conditional output paths. Each branch creates an output handle that can be connected to downstream nodes.

**Structure:**

```typescript
interface Branch {
  /** Unique identifier for the branch (used as handle ID and for connections) */
  name: string;
  /** Display label shown in the UI (optional, defaults to name) */
  label?: string;
  /** Description of when this branch is activated */
  description?: string;
  /** Optional value associated with the branch (e.g., for Switch matching) */
  value?: string;
  /** Optional condition expression for this branch */
  condition?: string;
  /** Whether this is the default/fallback branch */
  isDefault?: boolean;
}
```

**Example Config for Gateway Node:**

```json
{
  "branches": [
    {
      "name": "high_priority",
      "label": "High Priority",
      "condition": "priority > 8",
      "description": "Items with priority greater than 8"
    },
    {
      "name": "medium_priority",
      "label": "Medium Priority",
      "condition": "priority >= 4 && priority <= 8"
    },
    {
      "name": "low_priority",
      "label": "Low Priority",
      "isDefault": true,
      "description": "All other items (fallback)"
    }
  ]
}
```

**Branch Output Handle IDs:**

Branch handles are created with the format: `{nodeId}-output-{branchName}`

For example, a gateway node with ID `node-123` and branch name `high_priority` would have handle ID: `node-123-output-high_priority`

---

## Schema Property Attributes

### Enum with Multiple Selection

Use `multiple: true` with an `enum` to render as checkboxes instead of a dropdown:

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

### Enum with Display Names

Use `enumNames` to provide human-readable labels for enum values:

```json
{
  "status": {
    "type": "string",
    "title": "Status",
    "enum": ["pending", "in_progress", "completed", "cancelled"],
    "enumNames": ["Pending", "In Progress", "Completed", "Cancelled"],
    "default": "pending"
  }
}
```

### Number Constraints

```json
{
  "temperature": {
    "type": "number",
    "title": "Temperature",
    "minimum": 0,
    "maximum": 2,
    "default": 0.7
  },
  "maxTokens": {
    "type": "integer",
    "title": "Max Tokens",
    "minimum": 1,
    "maximum": 4096,
    "default": 1000
  }
}
```

### String Constraints

```json
{
  "apiKey": {
    "type": "string",
    "title": "API Key",
    "minLength": 10,
    "maxLength": 100,
    "pattern": "^sk-[a-zA-Z0-9]+$"
  }
}
```

---

## Complete Example

Here's a complete node configuration demonstrating multiple special properties:

```typescript
const nodeMetadata: NodeMetadata = {
  id: "advanced-processor",
  name: "Advanced Processor",
  type: "default",
  supportedTypes: ["default", "simple"],
  description: "A processor with dynamic ports and type switching",
  category: "processing",
  version: "1.0.0",
  inputs: [
    { name: "data", label: "Data", dataType: "json" }
  ],
  outputs: [
    { name: "result", label: "Result", dataType: "json" }
  ],
  configSchema: {
    type: "object",
    properties: {
      // Node type selection
      nodeType: {
        type: "string",
        title: "Node Style",
        enum: ["default", "simple"],
        enumNames: ["Default", "Compact"],
        default: "default"
      },
      // Regular config
      model: {
        type: "string",
        title: "Model",
        enum: ["gpt-4o", "gpt-4o-mini", "claude-3"],
        default: "gpt-4o-mini"
      },
      // Template field
      prompt: {
        type: "string",
        title: "Prompt Template",
        format: "template",
        default: "Process: {{ data }}"
      },
      // Hidden internal ID
      internalId: {
        type: "string",
        format: "hidden"
      }
    }
  },
  // Default config values including dynamic ports
  config: {
    nodeType: "default",
    model: "gpt-4o-mini",
    dynamicInputs: [
      { name: "context", label: "Context", dataType: "string" }
    ],
    dynamicOutputs: [
      { name: "logs", label: "Logs", dataType: "string" }
    ]
  }
};
```

---

## Summary

| Property              | Location        | Purpose                                                                            |
| --------------------- | --------------- | ---------------------------------------------------------------------------------- |
| `format`              | Schema property | Controls form field rendering (hidden, multiline, json, markdown, template, range) |
| `multiple`            | Schema property | With `enum`, renders checkboxes instead of dropdown                                |
| `enumNames`           | Schema property | Human-readable labels for enum values                                              |
| `x-display-order`     | Schema property | Controls field ordering (negative values appear first)                             |
| `instanceTitle`       | Config value    | Per-instance title override for node display                                       |
| `instanceDescription` | Config value    | Per-instance description override for node display                                 |
| `nodeType`            | Config value    | Switches visual node type                                                          |
| `dynamicInputs`       | Config value    | User-defined input ports                                                           |
| `dynamicOutputs`      | Config value    | User-defined output ports                                                          |
| `branches`            | Config value    | Gateway conditional output paths                                                   |
