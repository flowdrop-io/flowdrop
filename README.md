# FlowDrop

A visual workflow editor component library built with Svelte 5 and @xyflow/svelte. Create complex workflows with drag-and-drop functionality, node-based editing, and configurable API integration.

## 🚀 Features

- **Visual Workflow Editor**: Drag-and-drop interface for building node-based workflows
- **Svelte 5 Components**: Modern, reactive components with runes
- **Configurable API Client**: Flexible endpoint configuration for backend integration
- **Runtime Configuration**: Build once, deploy anywhere with environment variables
- **Node System**: Extensible node types with customizable configuration
- **Real-time Updates**: Live workflow state management with stores
- **Framework Agnostic**: Can be integrated into any web application
- **TypeScript Support**: Full type definitions included
- **Docker Ready**: Production-ready Dockerfile and Docker Compose configuration

### Enterprise Features (v0.0.16+)

- **Pluggable Authentication**: AuthProvider interface for OAuth, JWT, SSO integration
- **Workflow Lifecycle Events**: Hooks for save, load, change, and unmount events
- **Dirty State Tracking**: Monitor unsaved changes with reactive stores
- **Draft Auto-Save**: Automatic localStorage drafts with configurable intervals
- **Feature Flags**: Customize behavior for security and UX requirements

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
import { WorkflowEditor } from '@d34dman/flowdrop';
import '@d34dman/flowdrop/styles/base.css';
```

### Using the WorkflowEditor Component

```svelte
<script lang="ts">
	import { WorkflowEditor } from '@d34dman/flowdrop';
	import type { NodeMetadata, Workflow } from '@d34dman/flowdrop';

	let nodes: NodeMetadata[] = [
		{
			id: 'text_input',
			name: 'Text Input',
			category: 'input_output',
			description: 'User input field',
			inputs: [],
			outputs: [{ id: 'value', name: 'Value', type: 'output', dataType: 'string' }]
		}
	];

	let workflow: Workflow = {
		id: 'workflow_1',
		name: 'My Workflow',
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
	import { WorkflowEditor, NodeSidebar } from '@d34dman/flowdrop';
</script>

<div class="editor-container">
	<NodeSidebar {nodes} />
	<WorkflowEditor {nodes} />
</div>
```

#### 2. Using Mount Functions (Vanilla JS/Other Frameworks)

```javascript
import { mountWorkflowEditor } from '@d34dman/flowdrop';

const container = document.getElementById('workflow-container');
const editor = mountWorkflowEditor(container, {
	nodes: availableNodes,
	endpointConfig: {
		baseUrl: '/api/flowdrop',
		endpoints: {
			workflows: {
				list: '/workflows',
				get: '/workflows/{id}',
				create: '/workflows',
				update: '/workflows/{id}'
			}
		}
	}
});

// Cleanup
editor.destroy();
```

#### 3. Enterprise Integration (v0.0.16+)

```javascript
import { mountFlowDropApp, createEndpointConfig, CallbackAuthProvider } from '@d34dman/flowdrop';

const app = await mountFlowDropApp(container, {
	workflow: myWorkflow,
	endpointConfig: createEndpointConfig('/api/flowdrop'),

	// Dynamic authentication with token refresh
	authProvider: new CallbackAuthProvider({
		getToken: () => authService.getAccessToken(),
		onUnauthorized: () => authService.refreshToken()
	}),

	// Workflow lifecycle hooks
	eventHandlers: {
		onDirtyStateChange: (isDirty) => updateSaveButton(isDirty),
		onAfterSave: (workflow) => showSuccess('Saved!'),
		onBeforeUnmount: (workflow, isDirty) => {
			if (isDirty) saveDraft(workflow);
		}
	},

	// Feature configuration
	features: {
		autoSaveDraft: true,
		autoSaveDraftInterval: 30000,
		showToasts: true
	}
});

// Access instance methods
if (app.isDirty()) {
	await app.save();
}

// Get current workflow data
const workflow = app.getWorkflow();

// Cleanup
app.destroy();
```

See the [Enterprise Integration Guide](./docs/enterprise-integration.md) for React, Vue, Angular, and Drupal examples.

#### 3. Integration with Backend Frameworks

##### Drupal Example

```javascript
Drupal.behaviors.flowdropEditor = {
	attach: function (context, settings) {
		const container = context.querySelector('.flowdrop-container');
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
import { createEndpointConfig } from '@d34dman/flowdrop';

const config = createEndpointConfig({
	baseUrl: 'https://api.example.com',
	endpoints: {
		nodes: {
			list: '/nodes',
			get: '/nodes/{id}'
		},
		workflows: {
			list: '/workflows',
			get: '/workflows/{id}',
			create: '/workflows',
			update: '/workflows/{id}',
			delete: '/workflows/{id}',
			execute: '/workflows/{id}/execute'
		}
	},
	timeout: 30000,
	auth: {
		type: 'bearer',
		token: 'your-token'
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

FlowDrop includes 7 built-in visual node types that control how nodes are rendered:

| Type       | Description                                             | Use Case                 |
| ---------- | ------------------------------------------------------- | ------------------------ |
| `default`  | Full-featured workflow node with inputs/outputs display | Standard nodes           |
| `simple`   | Compact layout with header, icon, and description       | Space-efficient nodes    |
| `square`   | Minimal square node showing only an icon                | Icon-only representation |
| `tool`     | Specialized node for agent tools with tool metadata     | AI agent tools           |
| `gateway`  | Branching control flow with multiple output branches    | Conditional logic        |
| `terminal` | Circular node for workflow start/end/exit points        | Workflow boundaries      |
| `note`     | Documentation note with markdown support                | Comments/documentation   |

#### Terminal Nodes

Terminal nodes are special circular nodes for workflow boundaries:

```typescript
// Start node - output only
const startNode: NodeMetadata = {
	id: 'workflow-start',
	name: 'Start',
	type: 'terminal',
	tags: ['start'],
	inputs: [],
	outputs: [{ id: 'trigger', name: 'Go', type: 'output', dataType: 'trigger' }]
};

// End node - input only
const endNode: NodeMetadata = {
	id: 'workflow-end',
	name: 'End',
	type: 'terminal',
	tags: ['end'],
	inputs: [{ id: 'done', name: 'Done', type: 'input', dataType: 'trigger' }],
	outputs: []
};
```

Terminal variants are auto-detected from `id`, `name`, or `tags` containing: `start`, `end`, `exit`, `abort`, `entry`, `finish`, `complete`.

#### Custom Node Types

Define custom node types:

```typescript
const customNode: NodeMetadata = {
	id: 'custom_processor',
	name: 'Custom Processor',
	category: 'data_processing',
	description: 'Process data with custom logic',
	icon: 'mdi:cog',
	color: '#3b82f6',
	inputs: [
		{
			id: 'input',
			name: 'Input',
			type: 'input',
			dataType: 'mixed'
		}
	],
	outputs: [
		{
			id: 'output',
			name: 'Output',
			type: 'output',
			dataType: 'mixed'
		}
	],
	configSchema: {
		type: 'object',
		properties: {
			operation: {
				type: 'string',
				title: 'Operation'
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

### Enterprise Features (v0.0.16+)

- **[Enterprise Integration Guide](./docs/enterprise-integration.md)** - Complete integration patterns for React, Vue, Angular, Drupal
- **[Authentication Guide](./docs/authentication-guide.md)** - OAuth, JWT, SSO, and custom auth providers
- **[Event Handlers](./docs/event-handlers.md)** - Workflow lifecycle events and hooks
- **[Features Configuration](./docs/features-configuration.md)** - Feature flags, draft auto-save, and customization

## 🤝 Contributing

Not accepting contributions until the library stabilizes. Stay tuned.

## 📄 License

MIT

## 🆘 Support

- Check the API documentation in `API.md`
- Create an issue in the project repository
- Review the examples in `src/lib/examples/`

## 🚢 Deployment

FlowDrop uses **runtime configuration** instead of build-time environment variables, allowing you to build once and deploy to multiple environments.

### Quick Start with Docker

```bash
# Copy environment file
cp env.example .env

# Edit .env with your configuration
# Set FLOWDROP_API_BASE_URL to your backend API URL

# Start with Docker Compose
docker-compose up -d
```

### Environment Variables

**Production (Runtime):**

- `FLOWDROP_API_BASE_URL` - Backend API URL
- `FLOWDROP_THEME` - UI theme (light/dark/auto)
- `FLOWDROP_TIMEOUT` - Request timeout in milliseconds
- `FLOWDROP_AUTH_TYPE` - Authentication type (none/bearer/api_key/custom)
- `FLOWDROP_AUTH_TOKEN` - Authentication token

**Development (Build-time):**

- `VITE_API_BASE_URL` - Dev API URL (used only during `npm run dev`)

### Build for Production

```bash
# Install dependencies
npm ci

# Build the application
npm run build

# Set environment variables and start
export FLOWDROP_API_BASE_URL=http://your-backend:8080/api/flowdrop
node build
```

For detailed deployment instructions, see:

- [DOCKER.md](./DOCKER.md) - Docker quick start

---

**FlowDrop** - Visual workflow editing for modern web applications
