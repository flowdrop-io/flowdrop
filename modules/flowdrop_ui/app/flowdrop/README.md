# FlowDrop

A powerful Svelte Flow-based library for building workflows with a drag-and-drop interface. Inspired by tools like n8n, Langflow, and Flowise.

## Features

- 🎯 **Node-based Workflow Editor** - Drag and drop interface for building workflows
- 🔌 **HTTP API Integration** - Fetch node definitions and manage workflows via REST API
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices
- 🔧 **TypeScript Support** - Full TypeScript support with comprehensive type definitions
- 🚀 **SvelteKit Ready** - Built for SvelteKit applications
- 📦 **Modular Architecture** - Easy to extend and customize

## Installation

```bash
npm install flowdrop
```

## Quick Start

### 1. Basic Setup

```svelte
<script lang="ts">
  import { WorkflowEditor } from "flowdrop";
  import type { FlowDropConfig } from "flowdrop";

  const config: FlowDropConfig = {
    apiBaseUrl: "https://your-api.com",
    theme: "auto",
    enableDebug: true
  };
</script>

<WorkflowEditor {config} />
```

### 2. With Sample Data

```svelte
<script lang="ts">
  import { WorkflowEditor, sampleWorkflow } from "flowdrop";
  import type { FlowDropConfig } from "flowdrop";

  const config: FlowDropConfig = {
    apiBaseUrl: "https://your-api.com",
    theme: "auto"
  };
</script>

<WorkflowEditor {config} workflow={sampleWorkflow} />
```

### 3. Custom API Client

```svelte
<script lang="ts">
  import { WorkflowEditor, FlowDropApiClient } from "flowdrop";
  import type { FlowDropConfig } from "flowdrop";

  const config: FlowDropConfig = {
    apiBaseUrl: "https://your-api.com",
    apiKey: "your-api-key"
  };

  const apiClient = new FlowDropApiClient(config.apiBaseUrl, config.apiKey);
</script>

<WorkflowEditor {config} />
```

## API Reference

### Configuration

```typescript
interface FlowDropConfig {
  apiBaseUrl: string;           // Your API endpoint
  theme?: "light" | "dark" | "auto";
  enableDebug?: boolean;
  autoSave?: boolean;
  autoSaveInterval?: number;    // milliseconds
  maxUndoSteps?: number;
  nodeSpacing?: number;
  gridSize?: number;
}
```

### Node Types

The library supports various node categories:

- **Models** - OpenAI, Anthropic, and other model providers
- **Input/Output** - Text input, file upload, display output
- **Processing** - Text transformation, data processing
- **Conditional** - Logic gates, conditional flows
- **Utility** - Helper functions, data manipulation
- **Integration** - External service connections

### Node Metadata Structure

```typescript
interface NodeMetadata {
  id: string;
  name: string;
  description: string;
  category: NodeCategory;
  icon?: string;
  color?: string;
  inputs: NodePort[];
  outputs: NodePort[];
  configSchema?: Record<string, unknown>;
  tags?: string[];
}
```

### API Endpoints

The library expects the following API endpoints:

- `GET /api/nodes` - Fetch available node types
- `GET /api/nodes?category={category}` - Fetch nodes by category
- `GET /api/nodes/{id}` - Fetch specific node metadata
- `POST /api/workflows` - Save workflow
- `PUT /api/workflows/{id}` - Update workflow
- `GET /api/workflows/{id}` - Load workflow
- `GET /api/workflows` - List workflows
- `DELETE /api/workflows/{id}` - Delete workflow
- `POST /api/workflows/{id}/execute` - Execute workflow
- `GET /api/executions/{id}` - Get execution status
- `POST /api/executions/{id}/cancel` - Cancel execution

## Components

### WorkflowEditor

The main component that provides the complete workflow editing experience.

```svelte
<WorkflowEditor
  config={config}
  workflow={workflow}
  apiKey="optional-api-key"
/>
```

### NodeSidebar

A sidebar component that displays available nodes organized by category.

```svelte
<NodeSidebar
  nodes={availableNodes}
  loading={false}
  on:nodeSelected={handleNodeSelected}
  on:categoryChanged={handleCategoryChanged}
  on:searchChanged={handleSearchChanged}
/>
```

### WorkflowNode

A customizable node component for displaying workflow nodes.

```svelte
<WorkflowNode
  data={nodeData}
  selected={false}
  on:configChanged={handleConfigChange}
  on:nodeSelected={handleNodeSelect}
/>
```

## Events

The library dispatches various events for integration:

```typescript
// Node events
nodeSelected: { node: NodeMetadata }
nodeAdded: { node: WorkflowNode }
nodeRemoved: { nodeId: string }
nodeUpdated: { node: WorkflowNode }

// Edge events
edgeAdded: { edge: WorkflowEdge }
edgeRemoved: { edgeId: string }

// Workflow events
workflowSaved: { workflow: Workflow }
workflowLoaded: { workflow: Workflow }

// Execution events
executionStarted: { workflowId: string }
executionCompleted: { result: ExecutionResult }
executionFailed: { error: string }
```

## Customization

### Custom Node Types

You can create custom node types by extending the base components:

```svelte
<script lang="ts">
  import WorkflowNode from "flowdrop/WorkflowNode.svelte";
  
  // Custom node logic here
</script>

<div class="custom-node">
  <!-- Your custom node UI -->
</div>
```

### Custom Styling

@TODO

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
git clone https://github.com/your-repo/flowdrop.git
cd flowdrop
npm install
```

### Development Server

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Testing

```bash
npm run test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📚 [Documentation](https://flowdrop.dev)
- 🐛 [Issue Tracker](https://github.com/your-repo/flowdrop/issues)
- 💬 [Discussions](https://github.com/your-repo/flowdrop/discussions)

## Acknowledgments

- [Svelte Flow](https://github.com/xyflow/xyflow) - The underlying flow library
- [DaisyUI](https://daisyui.com/) - Beautiful UI components
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [SvelteKit](https://kit.svelte.dev/) - The web framework
