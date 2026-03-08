---
title: Edge Structure
description: The JSON format for workflow edges — connections between nodes, handle IDs, and edge categories.
---

Every item in a workflow's `edges` array is a **WorkflowEdge**. It represents a connection between an output port on one node and an input port on another.

## Schema

```typescript
interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: ConnectionLineType;
  selectable?: boolean;
  deletable?: boolean;
  data?: {
    label?: string;
    condition?: string;
    metadata?: {
      edgeType?: EdgeCategory;
      sourcePortDataType?: string;
    };
  };
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique edge identifier (e.g., `"e-loader-analyzer"`). |
| `source` | `string` | Yes | ID of the source node. |
| `target` | `string` | Yes | ID of the target node. |
| `sourceHandle` | `string` | No | ID of the specific output port. See [Handle IDs](#handle-ids). |
| `targetHandle` | `string` | No | ID of the specific input port. See [Handle IDs](#handle-ids). |
| `selectable` | `boolean` | No | Whether the edge can be selected in the editor. |
| `deletable` | `boolean` | No | Whether the edge can be deleted by the user. |
| `data.label` | `string` | No | Display label on the edge. |
| `data.condition` | `string` | No | Condition expression (used with gateway branches). |
| `data.metadata.edgeType` | `EdgeCategory` | No | Visual styling category. |
| `data.metadata.sourcePortDataType` | `string` | No | Data type of the source output port. |

## Handle IDs

Port handles follow a deterministic naming pattern:

```
{nodeId}-{direction}-{portId}
```

For example:
- `content_loader.1-output-items` — the "items" output port on node `content_loader.1`
- `analyzer.1-input-content` — the "content" input port on node `analyzer.1`
- `router.1-output-high` — the "high" branch output on a gateway node

This format lets FlowDrop map edges back to specific ports during rendering and execution.

## Edge Categories

The `edgeType` field controls the visual style of the edge on the canvas:

| Category | Visual Style | When Used |
|----------|-------------|-----------|
| `data` | Solid gray line | Default — general data flow between nodes. |
| `trigger` | Solid line with trigger color | Control flow connections (port `dataType: "trigger"`). |
| `tool` | Dashed amber line | Tool interface connections (port `dataType: "tool"`). |
| `loopback` | Dashed gray line | Loop iteration connections (targets a `loop_back` port). |

The editor sets `edgeType` automatically based on the source port's data type. You generally don't need to set it manually in JSON.

## Examples

### Data Edge

A simple data connection between two ports:

```json
{
  "id": "e-loader-analyzer",
  "source": "content_loader.1",
  "target": "analyzer.1",
  "sourceHandle": "content_loader.1-output-items",
  "targetHandle": "analyzer.1-input-content"
}
```

### Trigger Edge

A control-flow connection that triggers execution:

```json
{
  "id": "e-start-loader",
  "source": "start.1",
  "target": "content_loader.1",
  "sourceHandle": "start.1-output-trigger",
  "targetHandle": "content_loader.1-input-trigger",
  "data": {
    "metadata": {
      "edgeType": "trigger",
      "sourcePortDataType": "trigger"
    }
  }
}
```

### Tool Edge

A dashed connection linking an agent to a tool:

```json
{
  "id": "e-agent-tool",
  "source": "search_tool.1",
  "target": "agent.1",
  "sourceHandle": "search_tool.1-output-tool",
  "targetHandle": "agent.1-input-tool",
  "data": {
    "metadata": {
      "edgeType": "tool",
      "sourcePortDataType": "tool"
    }
  }
}
```

### Gateway Branch Edge

A conditional edge from a gateway branch:

```json
{
  "id": "e-router-high",
  "source": "router.1",
  "target": "urgent_handler.1",
  "sourceHandle": "router.1-output-high",
  "targetHandle": "urgent_handler.1-input-input",
  "data": {
    "condition": "priority > 8",
    "metadata": {
      "edgeType": "data"
    }
  }
}
```

## Connection Validation

The editor validates connections automatically before creating edges:

- **Type compatibility** — only compatible port data types can connect
- **Cycle detection** — prevents circular dependencies (O(V+E) algorithm)
- **Loopback prevention** — nodes cannot connect to themselves

For more on data type compatibility rules, see [Port System & Data Types](/guides/port-system/).

## Next Steps

- [Node Structure](/guides/node-json/) — the nodes that edges connect
- [Port System & Data Types](/guides/port-system/) — port definitions and compatibility rules
- [Workflow Structure](/guides/workflow-json/) — the top-level document containing edges
