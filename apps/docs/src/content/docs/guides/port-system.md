---
title: Port System & Data Types
description: Node port definitions, built-in data types, compatibility rules, dynamic ports, and gateway branches.
---

Ports are the connection points on nodes. Each port has a **data type** that determines which other ports it can connect to and how the connection renders on the canvas.

## NodePort

Every node declares its inputs and outputs as an array of `NodePort` objects:

```typescript
interface NodePort {
  id: string;
  name: string;
  type: 'input' | 'output' | 'metadata';
  dataType: string;
  required?: boolean;
  description?: string;
  defaultValue?: unknown;
  schema?: object;
}
```

| Field          | Type      | Description                                                                                               |
| -------------- | --------- | --------------------------------------------------------------------------------------------------------- |
| `id`           | `string`  | Unique port identifier within the node (e.g., `"text"`, `"trigger"`, `"tool"`).                           |
| `name`         | `string`  | Display name shown next to the port handle.                                                               |
| `type`         | `string`  | Port direction: `"input"`, `"output"`, or `"metadata"`.                                                   |
| `dataType`     | `string`  | Data type ID — determines color and connection compatibility.                                             |
| `required`     | `boolean` | Whether a connection to this port is required for execution.                                              |
| `description`  | `string`  | Tooltip text explaining the port's purpose.                                                               |
| `defaultValue` | `unknown` | Default value when no connection is made.                                                                 |
| `schema`       | `object`  | Optional JSON Schema describing the data structure on this port. Used for template variable autocomplete. |

### Example

```json
{
  "inputs": [
    {
      "id": "content",
      "name": "Content",
      "type": "input",
      "dataType": "string",
      "required": true,
      "description": "Text content to process"
    },
    {
      "id": "trigger",
      "name": "Trigger",
      "type": "input",
      "dataType": "trigger",
      "required": false
    }
  ],
  "outputs": [
    {
      "id": "result",
      "name": "Result",
      "type": "output",
      "dataType": "json",
      "description": "Processed output data"
    }
  ]
}
```

## Built-in Data Types

FlowDrop ships with 21 built-in data types, each with a distinct color on the canvas:

### Basic Types

| ID        | Name    | Category | Description                  |
| --------- | ------- | -------- | ---------------------------- |
| `trigger` | Trigger | basic    | Control flow of the workflow |
| `string`  | String  | basic    | Text data                    |
| `number`  | Number  | numeric  | Numeric data                 |
| `boolean` | Boolean | logical  | True/false values            |

### Collection Types

| ID          | Name          | Description                |
| ----------- | ------------- | -------------------------- |
| `array`     | Array         | Ordered list of items      |
| `string[]`  | String Array  | Array of strings           |
| `number[]`  | Number Array  | Array of numbers           |
| `boolean[]` | Boolean Array | Array of true/false values |
| `json[]`    | JSON Array    | Array of JSON objects      |
| `file[]`    | File Array    | Array of files             |
| `image[]`   | Image Array   | Array of images            |

### Complex Types

| ID     | Name | Description          |
| ------ | ---- | -------------------- |
| `json` | JSON | JSON structured data |

### File & Media Types

| ID      | Name  | Description |
| ------- | ----- | ----------- |
| `file`  | File  | File data   |
| `image` | Image | Image data  |
| `audio` | Audio | Audio data  |
| `video` | Video | Video data  |

### Special Types

| ID         | Name     | Description                          |
| ---------- | -------- | ------------------------------------ |
| `tool`     | Tool     | Tool interface for agent connections |
| `url`      | URL      | Web address                          |
| `email`    | Email    | Email address                        |
| `date`     | Date     | Date value                           |
| `datetime` | DateTime | Date and time value                  |
| `time`     | Time     | Time value                           |

Your backend can extend this list by returning additional data types from the `/port-config` API endpoint.

## Port Data Type Configuration

Each data type is defined by a `PortDataTypeConfig`:

```typescript
interface PortDataTypeConfig {
  id: string;
  name: string;
  description?: string;
  color: string; // CSS color value or CSS variable
  category?: string; // Grouping: "basic", "numeric", "collection", etc.
  aliases?: string[]; // Alternative names for this data type
  enabled?: boolean; // Whether this type is active
}
```

## Compatibility Rules

By default, ports connect only when their data types match exactly (e.g., `string` to `string`).

You can add custom compatibility rules to allow cross-type connections:

```typescript
interface PortCompatibilityRule {
  from: string; // Source data type ID
  to: string; // Target data type ID
  description?: string;
}
```

For example, to allow `string` ports to connect to `json` inputs:

```json
{
  "compatibilityRules": [
    {
      "from": "string",
      "to": "json",
      "description": "Strings can be parsed as JSON"
    }
  ]
}
```

Rules are configured via the `/port-config` API endpoint.

## Dynamic Ports

Nodes can let users create additional ports at runtime through special config properties. When `dynamicInputs` or `dynamicOutputs` appear in a node's config, the editor creates port handles dynamically.

```typescript
interface DynamicPort {
  name: string; // Port identifier (used in handle IDs)
  label: string; // Display label
  description?: string;
  dataType: string; // Data type for color and compatibility
  required?: boolean;
}
```

### Example: Dynamic Input Ports

In the node's `configSchema`, declare a `dynamicInputs` property:

```json
{
  "type": "object",
  "properties": {
    "dynamicInputs": {
      "type": "array",
      "title": "Custom Inputs",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string", "title": "Port ID" },
          "label": { "type": "string", "title": "Display Name" },
          "dataType": { "type": "string", "title": "Data Type", "default": "json" }
        },
        "required": ["name", "label"]
      }
    }
  }
}
```

When a user adds entries, the editor creates matching input handles. The same pattern works for `dynamicOutputs`.

## Gateway Branches

Gateway nodes use `branches` in config to create conditional output paths. Each branch becomes an output port handle.

```typescript
interface Branch {
  name: string; // Unique identifier (used as handle ID)
  label?: string; // Display label (defaults to name)
  description?: string;
  value?: string; // Optional value for switch matching
  condition?: string; // Condition expression
  isDefault?: boolean; // Fallback branch
}
```

### Example

```json
{
  "branches": [
    {
      "name": "success",
      "label": "Success",
      "condition": "status === 200"
    },
    {
      "name": "error",
      "label": "Error",
      "isDefault": true
    }
  ]
}
```

Each branch creates an output handle: `{nodeId}-output-success`, `{nodeId}-output-error`, etc. Edges connect from these handles to downstream nodes.

## Handle ID Format

All port handles — static, dynamic, and branch — follow the same naming convention:

```
{nodeId}-{direction}-{portId}
```

Examples:

- `text_input.1-output-text` — static output port
- `merger.1-input-extra_data` — dynamic input port
- `router.1-output-success` — gateway branch output

This format is used in [edge `sourceHandle` and `targetHandle` fields](/guides/edge-json/#handle-ids).

## Next Steps

- [Node Structure](/guides/node-json/) — where ports are defined in the node JSON
- [Edge Structure](/guides/edge-json/) — how edges reference port handles
- [Configuration Schema](/guides/config-schema/) — JSON Schema for node config forms
- [Node Types](/guides/node-types/) — visual appearance and connection behavior in the editor
