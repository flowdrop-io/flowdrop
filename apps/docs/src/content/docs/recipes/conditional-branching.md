---
title: Conditional Branching
description: Use gateway nodes with branches for if/else and switch/case routing.
---

Gateway nodes let you route workflow execution based on conditions — like if/else or switch/case logic.

## How Gateways Work

A **gateway node** has:

- Input ports that receive data
- A **default** output port
- **Branch** output ports that you define

Each branch has a label and maps to a separate output port. Your backend decides which branch to activate during execution.

## Defining a Gateway Node

```json
{
  "id": "intent_router",
  "name": "Intent Router",
  "type": "gateway",
  "category": "logic",
  "icon": "mdi:directions-fork",
  "inputs": [
    { "id": "input", "name": "Input", "type": "input", "dataType": "string" },
    { "id": "metadata", "name": "Metadata", "type": "input", "dataType": "json" }
  ],
  "outputs": [{ "id": "default", "name": "Default", "type": "output", "dataType": "string" }],
  "configSchema": {
    "type": "object",
    "properties": {
      "condition_field": {
        "type": "string",
        "title": "Condition Field",
        "description": "JSON path to the field used for routing"
      }
    }
  }
}
```

## Adding Branches in the Editor

When a user clicks on a gateway node, the configuration panel shows a **Branches** section:

1. Click **Add Branch**
2. Enter a branch label (e.g., "Yes", "No", or "Question", "Task")
3. Each branch creates a new output port on the gateway node
4. Connect each branch output to the appropriate downstream node

## If/Else Pattern

For simple true/false routing:

```
                    ┌─ "Yes" ─▸ [Process]
[Check Condition] ──┤
                    └─ "No"  ─▸ [Skip]
```

Define two branches: "Yes" and "No". Your backend evaluates the condition and activates the matching branch.

## Switch/Case Pattern

For multi-way routing:

```
                        ┌─ "Email"   ─▸ [Send Email]
[Detect Channel] ──────┤── "Slack"   ─▸ [Post to Slack]
                        ├─ "Webhook" ─▸ [Call Webhook]
                        └─ "Default" ─▸ [Log Event]
```

Add as many branches as you need. The default output handles unmatched cases.

## Backend Implementation

Your backend decides which branch to activate. The workflow JSON stores branches in the node's data:

```json
{
  "id": "node-3",
  "type": "gateway",
  "data": {
    "label": "Intent Router",
    "branches": [
      { "id": "question", "label": "Question" },
      { "id": "task", "label": "Task" }
    ]
  }
}
```

Edges connect from branch-specific output ports:

```json
{
  "source": "node-3",
  "sourceHandle": "node-3-output-question",
  "target": "node-4",
  "targetHandle": "node-4-input-input"
}
```

## Connection Validation

Gateway branch outputs use the same data type as the gateway's input. FlowDrop validates that downstream nodes have compatible input ports.

## Next Steps

- [Node Types](/guides/node-types/) — all 7 built-in node types including gateway
- [Edge Structure](/guides/edge-json/) — how edges reference branch ports
- [AI Agent Workflow](/recipes/ai-agent-workflow/) — full example using gateway routing
