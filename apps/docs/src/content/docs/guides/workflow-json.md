---
title: Workflow Structure
description: The JSON format for FlowDrop workflows — top-level fields, metadata, and how nodes and edges fit together.
---

A **workflow** is the top-level JSON document that FlowDrop reads and writes. It contains an array of nodes, an array of edges connecting them, and optional metadata.

## Schema

```typescript
interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  metadata?: WorkflowMetadata;
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier for the workflow (typically a UUID). |
| `name` | `string` | Yes | Human-readable name displayed in the editor navbar. |
| `description` | `string` | No | Brief summary of the workflow's purpose. |
| `nodes` | `WorkflowNode[]` | Yes | Array of node instances placed on the canvas. See [Node Structure](/guides/node-json/). |
| `edges` | `WorkflowEdge[]` | Yes | Array of connections between nodes. See [Edge Structure](/guides/edge-json/). |
| `metadata` | `object` | No | Version tracking and authoring information. |

## Metadata

```typescript
interface WorkflowMetadata {
  version: string;
  createdAt: string;        // ISO 8601 timestamp
  updatedAt: string;        // ISO 8601 timestamp
  author?: string;
  tags?: string[];
  versionId?: string;       // UUID for this specific version
  updateNumber?: number;    // Incrementing revision counter
  format?: WorkflowFormat;  // "flowdrop" | "agentspec" | custom string
}
```

The `format` field determines which nodes appear in the sidebar and how the workflow is exported. The default is `"flowdrop"`. Set it to `"agentspec"` for workflows compatible with the [Oracle Open Agent Spec](https://github.com/oracle/agent-spec).

## Minimal Example

The smallest valid workflow — an empty canvas ready for editing:

```json
{
  "id": "my-workflow",
  "name": "My Workflow",
  "nodes": [],
  "edges": []
}
```

## Full Example

A workflow with two connected nodes and complete metadata:

```json
{
  "id": "content-pipeline",
  "name": "Content Processing Pipeline",
  "description": "Load articles and analyze them with AI",
  "nodes": [
    {
      "id": "content_loader.1",
      "type": "universalNode",
      "position": { "x": 0, "y": 100 },
      "data": {
        "label": "Content Loader",
        "config": {
          "contentType": "article",
          "limit": 50
        },
        "metadata": {
          "id": "content_loader",
          "name": "Content Loader",
          "type": "tool",
          "description": "Load content for batch processing",
          "category": "content",
          "icon": "mdi:database-import",
          "version": "1.0.0",
          "inputs": [],
          "outputs": [
            {
              "id": "items",
              "name": "Items",
              "type": "output",
              "dataType": "array"
            }
          ]
        }
      }
    },
    {
      "id": "analyzer.1",
      "type": "universalNode",
      "position": { "x": 400, "y": 100 },
      "data": {
        "label": "AI Analyzer",
        "config": {
          "confidenceThreshold": 0.8
        },
        "metadata": {
          "id": "ai_analyzer",
          "name": "AI Analyzer",
          "type": "tool",
          "description": "AI-powered content analysis",
          "category": "ai",
          "icon": "mdi:brain",
          "version": "1.0.0",
          "inputs": [
            {
              "id": "content",
              "name": "Content",
              "type": "input",
              "dataType": "array"
            }
          ],
          "outputs": [
            {
              "id": "results",
              "name": "Results",
              "type": "output",
              "dataType": "json"
            }
          ]
        }
      }
    }
  ],
  "edges": [
    {
      "id": "e-loader-analyzer",
      "source": "content_loader.1",
      "target": "analyzer.1",
      "sourceHandle": "content_loader.1-output-items",
      "targetHandle": "analyzer.1-input-content"
    }
  ],
  "metadata": {
    "version": "1.0.0",
    "createdAt": "2025-11-12T21:29:32.473Z",
    "updatedAt": "2025-11-12T21:29:32.473Z",
    "author": "demo",
    "tags": ["ai", "content"],
    "format": "flowdrop"
  }
}
```

## Import and Export

For programmatic access to workflows, see [Creating Workflows — Import and Export](/guides/creating-workflows/#import-and-export).

## Next Steps

- [Node Structure](/guides/node-json/) — anatomy of each node in the `nodes` array
- [Edge Structure](/guides/edge-json/) — how connections in the `edges` array work
- [Configuration Schema](/guides/config-schema/) — JSON Schema that powers node config forms
