# FlowDrop

A visual workflow editor component library built with Svelte 5 and @xyflow/svelte. Create complex workflows with drag-and-drop functionality, node-based editing, and configurable API integration.

## 🚀 Features

- **Visual Workflow Editor**: Drag-and-drop interface for building node-based workflows
- **Svelte 5 Components**: Modern, reactive components with runes
- **Configurable API Client**: Flexible endpoint configuration for backend integration
- **Node System**: Extensible node types with customizable configuration
- **Real-time Updates**: Live workflow state management with stores
- **Framework Agnostic**: Can be integrated into any web application
- **TypeScript Support**: Full type definitions included

## 📦 Installation

```bash
npm install @d34dman/flowdrop
```

## 📁 Project Structure

```
@d34dman/flowdrop/
├── dist/                        # Built library files
│   ├── components/              # Svelte components
│   ├── types/                   # TypeScript definitions
│   ├── services/                # API and state management
│   ├── utils/                   # Utility functions
│   └── styles/                  # CSS styles
├── src/                         # Source code
│   └── lib/                     # Library source
│       ├── components/          # Svelte components
│       ├── services/            # Services and APIs
│       ├── stores/              # State management
│       └── types/               # Type definitions
└── api/                         # API documentation
```

## 🎯 Usage

### Basic Import

```javascript
import { WorkflowEditor } from "@d34dman/flowdrop";
import "@d34dman/flowdrop/styles/base.css";
```

### Using the WorkflowEditor Component

```svelte
<script lang="ts">
  import { WorkflowEditor } from "@d34dman/flowdrop";
  import type { NodeMetadata, Workflow } from "@d34dman/flowdrop";

  let nodes: NodeMetadata[] = [
    {
      id: "text_input",
      name: "Text Input",
      category: "input_output",
      description: "User input field",
      inputs: [],
      outputs: [{ id: "value", name: "Value", type: "output", dataType: "string" }]
    }
  ];

  let workflow: Workflow = {
    id: "workflow_1",
    name: "My Workflow",
    nodes: [],
    edges: []
  };
</script>

<WorkflowEditor {nodes} />
```

### Integration Methods

#### 1. As a Svelte Component (Recommended)

```svelte
<script>
  import { WorkflowEditor, NodeSidebar } from "@d34dman/flowdrop";
</script>

<div class="editor-container">
  <NodeSidebar {nodes} />
  <WorkflowEditor {nodes} />
</div>
```

#### 2. Using Mount Functions (Vanilla JS/Other Frameworks)

```javascript
import { mountWorkflowEditor } from "@d34dman/flowdrop";

const container = document.getElementById("workflow-container");
const editor = mountWorkflowEditor(container, {
  nodes: availableNodes,
  endpointConfig: {
    baseUrl: "/api/flowdrop",
    endpoints: {
      workflows: {
        list: "/workflows",
        get: "/workflows/{id}",
        create: "/workflows",
        update: "/workflows/{id}"
      }
    }
  }
});

// Cleanup
editor.destroy();
```

#### 3. Integration with Backend Frameworks

##### Drupal Example

```javascript
Drupal.behaviors.flowdropEditor = {
  attach: function (context, settings) {
    const container = context.querySelector(".flowdrop-container");
    if (container && window.FlowDrop) {
      window.FlowDrop.mountWorkflowEditor(container, {
        endpointConfig: settings.flowdrop.endpointConfig,
        nodes: settings.flowdrop.nodes
      });
    }
  }
};
```

## 📚 Core Components

### WorkflowEditor

Main editor component for creating and editing workflows.

**Props:**
- `nodes`: Array of available node types
- `endpointConfig`: API endpoint configuration
- `height`: Editor height (default: "100vh")
- `width`: Editor width (default: "100%")
- `lockWorkflow`: Disable editing
- `readOnly`: Read-only mode

### NodeSidebar

Sidebar displaying available node types.

**Props:**
- `nodes`: Array of node types to display

### ConfigSidebar

Configuration panel for selected nodes.

**Props:**
- `isOpen`: Sidebar visibility
- `configSchema`: JSON schema for configuration
- `configValues`: Current configuration values
- `onSave`: Save handler
- `onClose`: Close handler

## 🔧 API Configuration

Configure the API client to connect to your backend:

```typescript
import { createEndpointConfig } from "@d34dman/flowdrop";

const config = createEndpointConfig({
  baseUrl: "https://api.example.com",
  endpoints: {
    nodes: {
      list: "/nodes",
      get: "/nodes/{id}"
    },
    workflows: {
      list: "/workflows",
      get: "/workflows/{id}",
      create: "/workflows",
      update: "/workflows/{id}",
      delete: "/workflows/{id}",
      execute: "/workflows/{id}/execute"
    }
  },
  timeout: 30000,
  auth: {
    type: "bearer",
    token: "your-token"
  }
});
```

## 🎨 Customization

### Styling

Override CSS custom properties:

```css
:root {
  --flowdrop-background-color: #f9fafb;
  --flowdrop-primary-color: #3b82f6;
  --flowdrop-border-color: #e5e7eb;
  --flowdrop-text-color: #1f2937;
}
```

### Node Types

Define custom node types:

```typescript
const customNode: NodeMetadata = {
  id: "custom_processor",
  name: "Custom Processor",
  category: "data_processing",
  description: "Process data with custom logic",
  icon: "mdi:cog",
  color: "#3b82f6",
  inputs: [
    {
      id: "input",
      name: "Input",
      type: "input",
      dataType: "mixed"
    }
  ],
  outputs: [
    {
      id: "output",
      name: "Output",
      type: "output",
      dataType: "mixed"
    }
  ],
  configSchema: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        title: "Operation"
      }
    }
  }
};
```

## 🔌 Backend Integration

FlowDrop is backend-agnostic. Implement the API endpoints expected by the client:

### Required Endpoints

- `GET /api/nodes` - List available node types
- `GET /api/workflows` - List workflows
- `GET /api/workflows/{id}` - Get workflow
- `POST /api/workflows` - Create workflow
- `PUT /api/workflows/{id}` - Update workflow
- `DELETE /api/workflows/{id}` - Delete workflow
- `POST /api/workflows/{id}/execute` - Execute workflow

See `API.md` for detailed endpoint specifications.

## 🧪 Testing

```bash
# Unit tests
npm run test:unit

# E2E tests
npm run test:e2e

# All tests
npm test
```

## 🛠️ Development

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build library
npm run build

# Build for production
npm run build:production

# Linting
npm run lint

# Format code
npm run format
```

## 📖 Documentation

- **API.md** - REST API specification
- **CHANGELOG.md** - Version history
- **Storybook** - Component documentation (run `npm run storybook`)

## 🤝 Contributing

Not accepting contributions until the library stabilizes. Stay tuned.

## 📄 License

MIT

## 🆘 Support

- Check the API documentation in `API.md`
- Create an issue in the project repository
- Review the examples in `src/lib/examples/`

---

**FlowDrop** - Visual workflow editing for modern web applications
