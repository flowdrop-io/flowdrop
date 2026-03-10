---
title: Programmatic API
description: Create and manipulate workflows in code using WorkflowAdapter and helpers.
---

While FlowDrop is primarily a visual editor, you may need to create or modify workflows programmatically — for testing, migration, code generation, or batch operations.

## WorkflowAdapter

The `WorkflowAdapter` provides a high-level API for workflow manipulation using a `StandardWorkflow` format.

```typescript
import { WorkflowAdapter } from '@flowdrop/flowdrop/core';

// Initialize with your node type definitions
const adapter = new WorkflowAdapter(nodeTypes);
```

### Creating Workflows

```typescript
// Create a new workflow
const workflow = adapter.createWorkflow('My Pipeline', 'Processes user input');

// Add nodes
const inputNode = adapter.addNode(
  workflow,
  'text_input',                    // node type ID
  { x: 100, y: 200 },             // position
  { placeholder: 'Enter text...' } // initial config
);

const modelNode = adapter.addNode(
  workflow,
  'chat_model',
  { x: 400, y: 200 },
  { model: 'gpt-4', temperature: 0.7 }
);

const outputNode = adapter.addNode(
  workflow,
  'text_output',
  { x: 700, y: 200 }
);

// Connect nodes
adapter.addEdge(workflow, inputNode.id, modelNode.id, 'output', 'prompt');
adapter.addEdge(workflow, modelNode.id, outputNode.id, 'response', 'input');
```

### Querying Workflows

```typescript
// Find nodes by type
const models = adapter.getNodesByType(workflow, 'chat_model');

// Get edges connected to a node
const edges = adapter.getNodeEdges(workflow, inputNode.id);

// Get adjacent nodes
const connected = adapter.getConnectedNodes(workflow, modelNode.id);

// Get statistics
const stats = adapter.getWorkflowStats(workflow);
// { totalNodes: 3, totalEdges: 2, nodeTypeCounts: { text_input: 1, ... }, lastModified: '...' }
```

### Modifying Workflows

```typescript
// Update node position
adapter.updateNodePosition(workflow, inputNode.id, { x: 150, y: 250 });

// Update node configuration
adapter.updateNodeConfig(workflow, modelNode.id, { temperature: 0.9 });

// Remove a node (also removes connected edges)
adapter.removeNode(workflow, outputNode.id);

// Remove an edge
adapter.removeEdge(workflow, 'edge-id');
```

### Import/Export

```typescript
// Export to JSON string
const json = adapter.exportWorkflow(workflow);

// Import from JSON
const imported = adapter.importWorkflow(json);

// Clone with new IDs
const clone = adapter.cloneWorkflow(workflow, 'Copy of My Pipeline');
```

### Validation

```typescript
const result = adapter.validateWorkflow(workflow);
// { valid: boolean, errors: string[], warnings: string[] }

if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

### Format Conversion

Convert between the adapter's `StandardWorkflow` format and FlowDrop's internal editor format:

```typescript
// Editor format → Standard format
const standard = adapter.fromSvelteFlow(editorWorkflow);

// Standard format → Editor format
const editorFormat = adapter.toSvelteFlow(standard);
```

## Helper Classes

FlowDrop's editor uses helper classes internally. These are available for advanced integrations.

### EdgeStylingHelper

Determines edge visual styles based on port data types:

```typescript
import { EdgeStylingHelper } from '@flowdrop/flowdrop/editor';

// Get edge category from source port type
const category = EdgeStylingHelper.getEdgeCategory('trigger'); // 'trigger'
const category = EdgeStylingHelper.getEdgeCategory('string');  // 'data'
const category = EdgeStylingHelper.getEdgeCategory('tool');    // 'tool'

// Update all edge styles in a workflow
const styledEdges = EdgeStylingHelper.updateEdgeStyles(edges, nodes);
```

Edge categories and their visual styles:
| Category | Port type | Visual style |
|----------|-----------|-------------|
| `trigger` | `trigger` data type | Solid dark line |
| `tool` | `tool` data type | Dashed amber line |
| `loopback` | Targets `loop_back` port | Dashed gray line |
| `data` | Everything else | Gray line |

### NodeOperationsHelper

Creates nodes from drag-and-drop data and loads node metadata:

```typescript
import { NodeOperationsHelper } from '@flowdrop/flowdrop/editor';

// Create a node from sidebar drop data
const node = NodeOperationsHelper.createNodeFromDrop(
  dropDataString,         // JSON string from drag event
  { x: 300, y: 200 },    // canvas position
  existingNodes           // for generating unique IDs
);

// Load node definitions from API
const nodes = await NodeOperationsHelper.loadNodesFromApi();
```

### WorkflowOperationsHelper

Workflow-level operations including save, export, and validation:

```typescript
import { WorkflowOperationsHelper } from '@flowdrop/flowdrop/editor';

// Save to backend
const saved = await WorkflowOperationsHelper.saveWorkflow(workflow);

// Export as JSON download
WorkflowOperationsHelper.exportWorkflow(workflow);

// Export as Agent Spec format
const result = WorkflowOperationsHelper.exportAsAgentSpec(workflow);
// { valid: boolean, errors: string[], warnings: string[] }

// Import from Agent Spec file
const imported = await WorkflowOperationsHelper.importFromAgentSpec(file);

// Check for cycles
const hasCycles = WorkflowOperationsHelper.checkWorkflowCycles(nodes, edges);
```

## Use Cases

### Generate Workflows from Templates

```typescript
function createFromTemplate(template: string, params: Record<string, string>) {
  const adapter = new WorkflowAdapter(nodeTypes);
  const workflow = adapter.createWorkflow(`${template} Pipeline`);

  if (template === 'chat') {
    const input = adapter.addNode(workflow, 'text_input', { x: 100, y: 200 });
    const model = adapter.addNode(workflow, 'chat_model', { x: 400, y: 200 }, {
      model: params.model || 'gpt-4'
    });
    const output = adapter.addNode(workflow, 'text_output', { x: 700, y: 200 });
    adapter.addEdge(workflow, input.id, model.id, 'output', 'prompt');
    adapter.addEdge(workflow, model.id, output.id, 'response', 'input');
  }

  return adapter.toSvelteFlow(workflow);
}
```

### Batch Configuration Updates

```typescript
function updateAllModels(workflow: StandardWorkflow, newModel: string) {
  const adapter = new WorkflowAdapter(nodeTypes);
  const models = adapter.getNodesByType(workflow, 'chat_model');

  for (const node of models) {
    adapter.updateNodeConfig(workflow, node.id, { model: newModel });
  }

  return workflow;
}
```
