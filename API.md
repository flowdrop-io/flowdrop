# FlowDrop API Documentation

This document describes the REST API specification for backend integration with FlowDrop, a visual workflow editor library.

## Base URL

All API endpoints are typically prefixed with `/api/flowdrop` (configurable via `endpointConfig`).

## Authentication

Authentication is configurable and backend-dependent. The FlowDrop client supports various authentication methods including bearer tokens, API keys, and custom headers.

## Response Format

All API responses follow a consistent format:

```typescript
interface ApiResponse<T> {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
}
```

## Node Types API

### Get All Node Types

**GET** `/api/flowdrop/nodes`

Retrieve all available node types with optional filtering and pagination.

#### Query Parameters

- `category` (optional): Filter by node category (e.g., "ai", "data_processing", "input_output")
- `search` (optional): Search in node names, descriptions, and tags
- `limit` (optional): Maximum number of nodes to return (default: 100)
- `offset` (optional): Number of nodes to skip (default: 0)

#### Example Request

```bash
GET /api/flowdrop/nodes?category=ai&search=openai&limit=10
```

#### Example Response

```json
{
	"success": true,
	"data": [
		{
			"id": "openai_chat_executor",
			"name": "OpenAI Chat",
			"description": "Chat completion using OpenAI's GPT models",
			"category": "ai",
			"icon": "mdi:chat",
			"color": "#10a37f",
			"inputs": [
				{
					"id": "data",
					"name": "Input Data",
					"type": "input",
					"dataType": "mixed",
					"required": false,
					"description": "Input data for the node"
				}
			],
			"outputs": [
				{
					"id": "response",
					"name": "Response",
					"type": "output",
					"dataType": "string",
					"description": "The OpenAI response"
				},
				{
					"id": "model",
					"name": "Model",
					"type": "output",
					"dataType": "string",
					"description": "The model used"
				}
			],
			"configSchema": {
				"type": "object",
				"properties": {
					"model": {
						"type": "string",
						"default": "gpt-3.5-turbo",
						"title": "Model"
					},
					"temperature": {
						"type": "number",
						"default": 0.7,
						"title": "Temperature"
					},
					"maxTokens": {
						"type": "integer",
						"default": 1000,
						"title": "Max Tokens"
					},
					"apiKey": {
						"type": "string",
						"title": "API Key"
					}
				}
			},
			"tags": ["openai", "gpt", "chat"]
		}
	],
	"message": "Found 1 node types"
}
```

#### Response Headers

- `X-Total-Count`: Total number of nodes matching the filter
- `X-Page-Size`: Number of nodes per page
- `X-Page-Offset`: Current page offset

### Get Node Type by ID

**GET** `/api/flowdrop/nodes/{id}`

Retrieve metadata for a specific node type.

#### Example Request

```bash
GET /api/flowdrop/nodes/calculator
```

#### Example Response

```json
{
	"success": true,
	"data": {
		"id": "calculator",
		"name": "Calculator",
		"description": "Perform mathematical operations on input data",
		"category": "data_processing",
		"icon": "mdi:calculator",
		"color": "#3b82f6",
		"inputs": [
			{
				"id": "data",
				"name": "Input Data",
				"type": "input",
				"dataType": "mixed",
				"required": false,
				"description": "Input data for the node"
			}
		],
		"outputs": [
			{
				"id": "result",
				"name": "Result",
				"type": "output",
				"dataType": "number",
				"description": "The calculated result"
			}
		],
		"configSchema": {
			"type": "object",
			"properties": {
				"operation": {
					"type": "string",
					"enum": [
						"add",
						"subtract",
						"multiply",
						"divide",
						"power",
						"sqrt",
						"average",
						"min",
						"max",
						"median",
						"mode"
					],
					"default": "add",
					"title": "Operation"
				},
				"precision": {
					"type": "integer",
					"default": 2,
					"title": "Precision"
				}
			}
		}
	}
}
```

### Get Node Categories

**GET** `/api/flowdrop/nodes/categories`

Retrieve all available node categories.

#### Example Response

```json
{
	"success": true,
	"data": [
		{
			"id": "ai",
			"name": "AI Models",
			"description": "Artificial Intelligence and machine learning models",
			"icon": "mdi:brain",
			"color": "#10a37f"
		},
		{
			"id": "data_processing",
			"name": "Data Processing",
			"description": "Data manipulation and transformation nodes",
			"icon": "mdi:database",
			"color": "#3b82f6"
		},
		{
			"id": "input_output",
			"name": "Input/Output",
			"description": "Data input and output nodes",
			"icon": "mdi:input",
			"color": "#8b5cf6"
		},
		{
			"id": "http",
			"name": "HTTP Operations",
			"description": "HTTP requests and webhook nodes",
			"icon": "mdi:web",
			"color": "#f59e0b"
		},
		{
			"id": "logic",
			"name": "Logic & Control",
			"description": "Conditional logic and control flow nodes",
			"icon": "mdi:logic-gate",
			"color": "#ef4444"
		},
		{
			"id": "utility",
			"name": "Utility",
			"description": "Utility and helper nodes",
			"icon": "mdi:tools",
			"color": "#6b7280"
		},
		{
			"id": "storage",
			"name": "Storage",
			"description": "Data storage and retrieval nodes",
			"icon": "mdi:database",
			"color": "#059669"
		}
	]
}
```

## Workflows API

### List Workflows

**GET** `/api/flowdrop/workflows`

Retrieve all workflows with optional filtering.

#### Query Parameters

- `status` (optional): Filter by workflow status
- `search` (optional): Search in workflow names and descriptions
- `limit` (optional): Maximum number of workflows to return
- `offset` (optional): Number of workflows to skip

#### Example Response

```json
{
  "success": true,
  "data": [
    {
      "id": "workflow_1",
      "name": "Data Processing Pipeline",
      "description": "Process and transform data using AI models",
      "status": "active",
      "created": "2024-01-15T10:30:00Z",
      "updated": "2024-01-15T14:45:00Z",
      "nodes": [...],
      "edges": [...]
    }
  ]
}
```

### Create Workflow

**POST** `/api/flowdrop/workflows`

Create a new workflow.

#### Request Body

```json
{
  "name": "My Workflow",
  "description": "A workflow for processing data",
  "nodes": [
    {
      "id": "node_1",
      "type": "text_input",
      "position": {"x": 100, "y": 100},
      "config": {...}
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "source": "node_1",
      "target": "node_2",
      "sourceHandle": "output",
      "targetHandle": "input"
    }
  ]
}
```

### Get Workflow

**GET** `/api/flowdrop/workflows/{id}`

Retrieve a specific workflow by ID.

### Update Workflow

**PUT** `/api/flowdrop/workflows/{id}`

Update an existing workflow.

### Delete Workflow

**DELETE** `/api/flowdrop/workflows/{id}`

Delete a workflow.

### Execute Workflow

**POST** `/api/flowdrop/workflows/{id}/execute`

Execute a workflow with optional input data.

#### Request Body

```json
{
	"inputs": {
		"node_1": "Hello, world!"
	},
	"config": {
		"timeout": 30000,
		"debug": false
	}
}
```

#### Response

```json
{
	"success": true,
	"data": {
		"execution_id": "exec_123",
		"status": "running",
		"started_at": "2024-01-15T15:00:00Z",
		"estimated_completion": "2024-01-15T15:00:30Z"
	}
}
```

## Executions API

### Get Active Executions

**GET** `/api/flowdrop/executions/active`

Retrieve all currently active workflow executions.

### Get Execution State

**GET** `/api/flowdrop/executions/{id}/state`

Get the current state of a workflow execution.

#### Example Response

```json
{
	"success": true,
	"data": {
		"id": "exec_123",
		"workflow_id": "workflow_1",
		"status": "completed",
		"started_at": "2024-01-15T15:00:00Z",
		"completed_at": "2024-01-15T15:00:25Z",
		"results": {
			"node_1": "Hello, world!",
			"node_2": "Processed: Hello, world!"
		},
		"errors": [],
		"logs": [
			{
				"timestamp": "2024-01-15T15:00:05Z",
				"level": "info",
				"message": "Node calculator executed successfully",
				"node_id": "node_2"
			}
		]
	}
}
```

### Cancel Execution

**POST** `/api/flowdrop/executions/{id}/cancel`

Cancel a running workflow execution.

### Get Execution Logs

**GET** `/api/flowdrop/executions/{id}/logs`

Retrieve detailed logs for a workflow execution.

## Node Types Reference

### AI Models

#### OpenAI Chat (`openai_chat_executor`)

- **Category**: AI
- **Description**: Chat completion using OpenAI's GPT models
- **Config**: model, temperature, maxTokens, apiKey
- **Outputs**: response, model, temperature, tokens_used, finish_reason

#### OpenAI Embeddings (`openai_embeddings`)

- **Category**: AI
- **Description**: Generate text embeddings using OpenAI
- **Config**: model, apiKey
- **Outputs**: embeddings, model, dimensions

#### HuggingFace Embeddings (`huggingface_embeddings`)

- **Category**: AI
- **Description**: Generate embeddings using HuggingFace models
- **Config**: model, apiKey
- **Outputs**: embeddings, model, dimensions

#### Simple Agent (`simple_agent`)

- **Category**: AI
- **Description**: Basic AI agent implementation
- **Config**: agent_type, memory_size
- **Outputs**: response, agent_state

### Data Processing

#### Calculator (`calculator`)

- **Category**: Data Processing
- **Description**: Perform mathematical operations
- **Config**: operation, precision
- **Outputs**: result, operation, precision

#### Dataframe Operations (`dataframe_operations`)

- **Category**: Data Processing
- **Description**: Advanced data manipulation
- **Config**: operation, columns, rows, condition
- **Outputs**: result, operation, input_rows, output_rows

#### Data Operations (`data_operations`)

- **Category**: Data Processing
- **Description**: General data processing operations
- **Config**: operation, parameters
- **Outputs**: result, operation, metadata

#### Data to Dataframe (`data_to_dataframe`)

- **Category**: Data Processing
- **Description**: Convert data to dataframe format
- **Config**: format, options
- **Outputs**: dataframe, schema, row_count

### Input/Output

#### Text Input (`text_input`)

- **Category**: Input/Output
- **Description**: User input collection
- **Config**: placeholder, default_value
- **Outputs**: value

#### Text Output (`text_output`)

- **Category**: Input/Output
- **Description**: Display text results
- **Config**: format, display_options
- **Outputs**: formatted_text

#### Chat Output (`chat_output`)

- **Category**: Input/Output
- **Description**: Chat interface output
- **Config**: chat_format, display_options
- **Outputs**: chat_message, timestamp

#### File Upload (`file_upload`)

- **Category**: Input/Output
- **Description**: File upload handling
- **Config**: allowed_types, max_size
- **Outputs**: file_data, file_info

### HTTP Operations

#### URL Fetch (`url_fetch`)

- **Category**: HTTP
- **Description**: HTTP GET requests
- **Config**: url, headers, timeout
- **Outputs**: response, status_code, headers

#### HTTP Request (`http_request`)

- **Category**: HTTP
- **Description**: Full HTTP client
- **Config**: method, url, headers, body, timeout
- **Outputs**: response, status_code, headers, body

#### Webhook (`webhook`)

- **Category**: HTTP
- **Description**: Webhook endpoint handling
- **Config**: endpoint, method, headers
- **Outputs**: webhook_data, response

### Logic & Control

#### Conditional (`conditional`)

- **Category**: Logic
- **Description**: If/else logic branching
- **Config**: condition, true_branch, false_branch
- **Outputs**: result, branch_taken

#### Loop (`loop`)

- **Category**: Logic
- **Description**: Iterative operations
- **Config**: max_iterations, condition
- **Outputs**: result, iterations, final_state

### Utility

#### DateTime (`datetime`)

- **Category**: Utility
- **Description**: Date/time operations
- **Config**: operation, format, timezone
- **Outputs**: result, formatted_date

#### Regex Extractor (`regex_extractor`)

- **Category**: Utility
- **Description**: Pattern matching
- **Config**: pattern, flags, group
- **Outputs**: matches, groups

#### Split Text (`split_text`)

- **Category**: Utility
- **Description**: Text segmentation
- **Config**: delimiter, max_splits
- **Outputs**: parts, count

#### Conversation Buffer (`conversation_buffer`)

- **Category**: Utility
- **Description**: Chat history management
- **Config**: max_messages, format
- **Outputs**: buffer, message_count

#### Structured Output (`structured_output`)

- **Category**: Utility
- **Description**: Formatted output generation
- **Config**: format, template
- **Outputs**: structured_data, format_used

### Storage

#### Save to File (`save_to_file`)

- **Category**: Storage
- **Description**: Save data to file
- **Config**: filename, format, path
- **Outputs**: file_path, file_size

#### Chroma Vector Store (`chroma_vector_store`)

- **Category**: Storage
- **Description**: Vector database operations
- **Config**: collection, operation, metadata
- **Outputs**: result, operation_status

## Error Handling

### Error Response Format

```json
{
	"success": false,
	"error": "Error message",
	"code": "ERROR_CODE",
	"details": {
		"field": "Additional error details"
	}
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Input validation failed
- `NODE_NOT_FOUND`: Node type not found
- `WORKFLOW_NOT_FOUND`: Workflow not found
- `EXECUTION_FAILED`: Workflow execution failed
- `PERMISSION_DENIED`: Insufficient permissions
- `TIMEOUT`: Operation timed out
- `MEMORY_LIMIT`: Memory limit exceeded

## Rate Limiting

Rate limiting is backend-dependent. Recommended limits:

- **Node Discovery**: 100 requests per minute
- **Workflow Operations**: 50 requests per minute
- **Workflow Execution**: 10 requests per minute

Recommended rate limit headers:

- `X-RateLimit-Limit`: Request limit per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when the rate limit resets

## Security Considerations

1. **Authentication**: Implement appropriate authentication for your backend
2. **Input Validation**: Validate all inputs against schemas
3. **Output Sanitization**: Sanitize outputs to prevent XSS
4. **Logging**: Log all operations for audit purposes
5. **Error Handling**: Avoid exposing sensitive information in error messages

## Best Practices

1. **Use HTTPS**: Always use HTTPS in production
2. **Validate Inputs**: Always validate inputs before processing
3. **Handle Errors**: Implement proper error handling
4. **Monitor Usage**: Monitor API usage and performance
5. **Cache Responses**: Cache static data like node metadata
6. **Use Pagination**: Use pagination for large datasets
7. **Implement Retries**: Implement retry logic for transient failures
