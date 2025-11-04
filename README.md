# FlowDrop - Drupal Workflow Editor

A powerful visual workflow editor for Drupal that enables drag-and-drop creation of complex workflows with AI integration, data processing, and automation capabilities.

## 🚀 Features

- **Visual Workflow Editor**: Drag-and-drop interface for building complex workflows
- **AI Integration**: OpenAI, Anthropic, and other AI model integrations
- **Data Processing**: Advanced data manipulation and transformation nodes
- **HTTP Integration**: Webhook and API request capabilities
- **File Operations**: Upload, download, and file processing
- **Conditional Logic**: Advanced branching and decision-making nodes
- **Real-time Execution**: Live workflow execution with status monitoring
- **Drupal Native**: Built specifically for Drupal 10/11

## 📁 Project Structure

```
flowdrop/
├── src/                          # Core PHP classes
│   ├── Service/NodeRuntime/      # Node execution engine
│   ├── Plugin/FlowDropNodeProcessor/  # 25+ node processors
│   ├── Attribute/                # Plugin discovery attributes
│   └── Exception/                # Custom exception classes
├── modules/                      # Drupal sub-modules
│   ├── flowdrop_workflow/        # Workflow entity management
│   ├── flowdrop_ui/             # Svelte frontend application
│   ├── flowdrop_node_type/      # Node type definitions
│   ├── flowdrop_node_category/  # Node categorization
│   ├── flowdrop_pipeline/       # Pipeline management
│   ├── flowdrop_job/           # Job execution system
│   ├── flowdrop_runner/        # Workflow execution engine
│   └── flowdrop_ai/            # AI integration features
├── js/                         # Drupal JavaScript integration
└── config/                     # Drupal configuration
```

## 🏗️ Architecture

### Core Components

1. **Plugin System**: Attribute-based discovery of node processors
2. **Node Runtime**: Execution engine for workflow nodes
3. **Workflow Engine**: Drupal entity-based workflow management
4. **Frontend**: Svelte-based visual editor
5. **API Layer**: RESTful API for workflow operations

### Node Categories

- **AI Models**: OpenAI Chat, Embeddings, HuggingFace
- **Data Processing**: Calculator, Dataframe Operations, Data Operations
- **Input/Output**: Text Input, Chat Output, File Upload
- **HTTP Operations**: URL Fetch, HTTP Request, Webhook
- **Conditional Logic**: Conditional nodes, Loop operations
- **Utility**: DateTime, Regex Extractor, Split Text
- **Storage**: Save to File, Chroma Vector Store

## 🛠️ Installation

### Prerequisites

- Drupal 10 or 11
- PHP 8.1+
- Node.js 18+ (for frontend development)

### Installation Steps

1. **Install the module**:

   ```bash
   # Copy to your Drupal modules directory
   cp -r flowdrop /path/to/drupal/web/modules/custom/
   ```

2. **Enable the module**:

   ```bash
   ddev drush en flowdrop flowdrop_workflow flowdrop_ui
   ```

3. **Build the frontend**:

   ```bash
   cd modules/flowdrop_ui/app/flowdrop
   npm install
   npm run build:iife
   ```

4. **Clear Drupal cache**:
   ```bash
   ddev drush cr
   ```

## 🎯 Usage

### Accessing the Workflow Editor

1. Navigate to `/admin/structure/flowdrop-workflow`
2. Create a new workflow or edit an existing one
3. Use the visual editor to build your workflow

### Creating Workflows

1. **Add Nodes**: Drag nodes from the palette to the canvas
2. **Configure Nodes**: Set parameters and configuration for each node
3. **Connect Nodes**: Create connections between node inputs and outputs
4. **Test Execution**: Use the execution panel to test your workflow
5. **Save & Deploy**: Save your workflow for production use

### Available Node Types

#### AI Models

- **OpenAI Chat**: GPT model integration
- **OpenAI Embeddings**: Text embedding generation
- **HuggingFace Embeddings**: Alternative embedding models
- **Simple Agent**: Basic AI agent implementation

#### Data Processing

- **Calculator**: Mathematical operations
- **Dataframe Operations**: Advanced data manipulation
- **Data Operations**: General data processing
- **Data to Dataframe**: Data format conversion

#### Input/Output

- **Text Input**: User input collection
- **Text Output**: Display text results
- **Chat Output**: Chat interface output
- **File Upload**: File upload handling

#### HTTP & Integration

- **URL Fetch**: HTTP GET requests
- **HTTP Request**: Full HTTP client
- **Webhook**: Webhook endpoint handling

#### Logic & Control

- **Conditional**: If/else logic branching
- **Loop**: Iterative operations
- **Split Text**: Text segmentation

#### Utility

- **DateTime**: Date/time operations
- **Regex Extractor**: Pattern matching
- **Conversation Buffer**: Chat history management
- **Structured Output**: Formatted output generation

## 🔧 Development

### Adding New Node Types

1. **Create Node Class**:

   ```php
   <?php

   namespace Drupal\flowdrop\Plugin\FlowDropNodeProcessor;

   use Drupal\flowdrop\Attribute\FlowDropNodeProcessor;

   #[FlowDropNodeProcessor(
     id: "my_custom_node",
     label: new \Drupal\Core\StringTranslation\TranslatableMarkup("My Custom Node")
   )]
   class MyCustomNode extends AbstractFlowDropNodeProcessor {

     public function execute(array $inputs, array $config): array {
       // Your node logic here
       return ['result' => 'processed data'];
     }

     public function getConfigSchema(): array {
       return [
         'type' => 'object',
         'properties' => [
           'mySetting' => ['type' => 'string'],
         ],
       ];
     }
   }
   ```

2. **Implement Required Methods**:
   - `execute()`: Main node logic
   - `getConfigSchema()`: Configuration schema
   - `getInputSchema()`: Input validation schema
   - `getOutputSchema()`: Output schema
   - `validateInputs()`: Input validation

### Frontend Development

The frontend is a Svelte application located in `modules/flowdrop_ui/app/flowdrop/`.

```bash
cd modules/flowdrop_ui/app/flowdrop
npm run dev          # Development server
npm run build:iife   # Build for Drupal integration
npm run test         # Run tests
```

## 📚 API Documentation

### IIFE Integration API

The FlowDrop library can be integrated into Drupal using the IIFE (Immediately Invoked Function Expression) build. The library provides two main mounting functions:

#### Mounting Functions

```javascript
// Mount the full FlowDrop App
window.FlowDrop.mountFlowDropApp(container, options);

// Mount just the WorkflowEditor component
window.FlowDrop.mountWorkflowEditor(container, options);
```

#### Configuration Options

```javascript
// Basic usage with default configuration
window.FlowDrop.mountWorkflowEditor(container, {
	workflow: myWorkflow,
	nodes: availableNodes
});

// Advanced usage with custom endpoint configuration
window.FlowDrop.mountWorkflowEditor(container, {
	workflow: myWorkflow,
	nodes: availableNodes,
	endpointConfig: {
		baseUrl: '/api/flowdrop',
		endpoints: {
			nodes: {
				list: '/nodes',
				get: '/nodes/{id}',
				byCategory: '/nodes?category={category}',
				metadata: '/nodes/{id}/metadata'
			},
			workflows: {
				list: '/workflows',
				get: '/workflows/{id}',
				create: '/workflows',
				update: '/workflows/{id}',
				delete: '/workflows/{id}',
				validate: '/workflows/validate',
				export: '/workflows/{id}/export',
				import: '/workflows/import'
			},
			executions: {
				execute: '/workflows/{id}/execute',
				status: '/executions/{id}',
				cancel: '/executions/{id}/cancel',
				logs: '/executions/{id}/logs',
				history: '/executions'
			}
		},
		timeout: 30000,
		retry: {
			enabled: true,
			maxAttempts: 3,
			delay: 1000,
			backoff: 'exponential'
		},
		auth: {
			type: 'bearer',
			token: 'your-auth-token'
		}
	}
});
```

#### Drupal Integration Example

```javascript
// Drupal behavior for FlowDrop integration
Drupal.behaviors.flowdropWorkflowEditor = {
	attach: function (context, settings) {
		const container = context.querySelector('.flowdrop-workflow-editor');
		if (container && window.FlowDrop) {
			window.FlowDrop.mountWorkflowEditor(container, {
				endpointConfig: settings.flowdrop.endpointConfig,
				workflow: settings.flowdrop.workflow,
				nodes: settings.flowdrop.nodes
			});
		}
	}
};
```

### REST API Endpoints

#### Workflows

- `GET /api/flowdrop/workflows` - List workflows
- `POST /api/flowdrop/workflows` - Create workflow
- `GET /api/flowdrop/workflows/{id}` - Get workflow
- `PUT /api/flowdrop/workflows/{id}` - Update workflow
- `DELETE /api/flowdrop/workflows/{id}` - Delete workflow
- `POST /api/flowdrop/workflows/{id}/execute` - Execute workflow

#### Nodes

- `GET /api/flowdrop/nodes` - List available nodes
- `GET /api/flowdrop/nodes/{id}` - Get node metadata
- `GET /api/flowdrop/nodes?category={category}` - Filter by category

#### Executions

- `GET /api/flowdrop/executions/active` - Active executions
- `GET /api/flowdrop/executions/{id}/state` - Execution status

### Node Configuration Schema

Each node type defines its configuration schema:

```json
{
	"type": "object",
	"properties": {
		"setting1": {
			"type": "string",
			"title": "Setting 1",
			"description": "Description of setting"
		},
		"setting2": {
			"type": "number",
			"default": 0
		}
	}
}
```

## 🔒 Security

- All API endpoints require appropriate Drupal permissions
- Input validation on all node processors
- Exception handling for failed executions
- Logging of all workflow operations

## 🧪 Testing

### Backend Testing

```bash
ddev drush test:run flowdrop
```

### Frontend Testing

```bash
cd modules/flowdrop_ui/app/flowdrop
npm run test:unit
npm run test:e2e
```

## 📝 Logging

Workflow execution is logged through Drupal's logging system:

```php
$this->loggerFactory->get('flowdrop')->info('Workflow executed', [
  'workflow_id' => $workflowId,
  'execution_time' => $executionTime,
]);
```

## 🤝 Contributing

Not accepting Contribution until the module stabilizes. Stay tuned.

## 🆘 Support

For issues and questions:

- Check the API documentation in `modules/flowdrop_ui/app/flowdrop/API.md`
- Review the security guidelines in `modules/flowdrop_ui/app/flowdrop/SECURITY.md`
- Create an issue in the project repository

---

**FlowDrop** - Empowering Drupal with visual workflow automation.
