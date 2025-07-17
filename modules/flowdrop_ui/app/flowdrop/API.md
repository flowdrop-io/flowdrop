# FlowDrop API Documentation

This document describes the REST API endpoints for FlowDrop, a workflow editor for LLM applications.

## Base URL

All API endpoints are prefixed with `/api`.

## Authentication

Currently, the API does not require authentication. In a production environment, you should implement proper authentication and authorization.

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

**GET** `/api/nodes`

Retrieve all available node types with optional filtering and pagination.

#### Query Parameters

- `category` (optional): Filter by node category (e.g., "llm", "input", "processing")
- `search` (optional): Search in node names, descriptions, and tags
- `limit` (optional): Maximum number of nodes to return (default: 100)
- `offset` (optional): Number of nodes to skip (default: 0)

#### Example Request

```bash
GET /api/nodes?category=llm&search=openai&limit=10
```

#### Example Response

```json
{
  "success": true,
  "data": [
    {
      "id": "openai-chat",
      "name": "OpenAI Chat",
      "description": "Chat completion using OpenAI's GPT models",
      "category": "llm",
      "icon": "mdi:chat",
      "color": "#10a37f",
      "inputs": [
        {
          "id": "prompt",
          "name": "Prompt",
          "type": "input",
          "dataType": "string",
          "required": true,
          "description": "The input prompt for the model"
        }
      ],
      "outputs": [
        {
          "id": "response",
          "name": "Response",
          "type": "output",
          "dataType": "text",
          "description": "The model's response"
        }
      ],
      "configSchema": {
        "model": "gpt-3.5-turbo",
        "temperature": 0.7,
        "maxTokens": 1000
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

**GET** `/api/nodes/{id}`

Retrieve a specific node type by its ID.

#### Path Parameters

- `id`: The unique identifier of the node type

#### Example Request

```bash
GET /api/nodes/openai-chat
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "id": "openai-chat",
    "name": "OpenAI Chat",
    "description": "Chat completion using OpenAI's GPT models",
    "category": "llm",
    "icon": "mdi:chat",
    "color": "#10a37f",
    "inputs": [...],
    "outputs": [...],
    "configSchema": {...},
    "tags": ["openai", "gpt", "chat"]
  }
}
```

## Workflows API

### Get All Workflows

**GET** `/api/workflows`

Retrieve all saved workflows with optional filtering and pagination.

#### Query Parameters

- `search` (optional): Search in workflow names, descriptions, and tags
- `limit` (optional): Maximum number of workflows to return (default: 50)
- `offset` (optional): Number of workflows to skip (default: 0)

#### Example Request

```bash
GET /api/workflows?search=chat&limit=10
```

#### Example Response

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Chat Workflow",
      "description": "A simple chat workflow",
      "nodes": [
        {
          "id": "node-1",
          "type": "workflowNode",
          "position": { "x": 100, "y": 100 },
          "data": {
            "label": "Text Input",
            "config": {},
            "metadata": {...}
          }
        }
      ],
      "edges": [
        {
          "id": "edge-1",
          "source": "node-1",
          "target": "node-2",
          "sourceHandle": "text",
          "targetHandle": "prompt"
        }
      ],
      "metadata": {
        "version": "1.0.0",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T11:45:00.000Z",
        "author": "user@example.com",
        "tags": ["chat", "demo"]
      }
    }
  ],
  "message": "Found 1 workflows"
}
```

### Create Workflow

**POST** `/api/workflows`

Create a new workflow.

#### Request Body

```typescript
{
  name: string;           // Required: Workflow name
  description?: string;   // Optional: Workflow description
  nodes?: WorkflowNode[]; // Optional: Array of workflow nodes
  edges?: WorkflowEdge[]; // Optional: Array of workflow edges
  author?: string;        // Optional: Author of the workflow
  tags?: string[];        // Optional: Array of tags
}
```

#### Example Request

```bash
POST /api/workflows
Content-Type: application/json

{
  "name": "My New Workflow",
  "description": "A workflow for processing text",
  "nodes": [],
  "edges": [],
  "author": "user@example.com",
  "tags": ["text", "processing"]
}
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "id": "workflow-1234567890-def456",
    "name": "My New Workflow",
    "description": "A workflow for processing text",
    "nodes": [],
    "edges": [],
    "metadata": {
      "version": "1.0.0",
      "createdAt": "2024-01-15T12:00:00.000Z",
      "updatedAt": "2024-01-15T12:00:00.000Z",
      "author": "user@example.com",
      "tags": ["text", "processing"]
    }
  },
  "message": "Workflow created successfully"
}
```

### Get Workflow by ID

**GET** `/api/workflows/{id}`

Retrieve a specific workflow by its ID.

#### Path Parameters

- `id`: The unique identifier of the workflow

#### Example Request

```bash
GET /api/workflows/550e8400-e29b-41d4-a716-446655440000
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "id": "workflow-1234567890-abc123",
    "name": "Chat Workflow",
    "description": "A simple chat workflow",
    "nodes": [...],
    "edges": [...],
    "metadata": {...}
  }
}
```

### Update Workflow

**PUT** `/api/workflows/{id}`

Update an existing workflow.

#### Path Parameters

- `id`: The unique identifier of the workflow

#### Request Body

```typescript
{
  name?: string;           // Optional: New workflow name
  description?: string;    // Optional: New workflow description
  nodes?: WorkflowNode[];  // Optional: New array of workflow nodes
  edges?: WorkflowEdge[];  // Optional: New array of workflow edges
  metadata?: {             // Optional: Updated metadata
    version?: string;
    author?: string;
    tags?: string[];
  };
}
```

#### Example Request

```bash
PUT /api/workflows/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "name": "Updated Chat Workflow",
  "description": "An improved chat workflow",
  "metadata": {
    "tags": ["chat", "improved", "demo"]
  }
}
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "id": "workflow-1234567890-abc123",
    "name": "Updated Chat Workflow",
    "description": "An improved chat workflow",
    "nodes": [...],
    "edges": [...],
    "metadata": {
      "version": "1.0.0",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T12:30:00.000Z",
      "author": "user@example.com",
      "tags": ["chat", "improved", "demo"]
    }
  },
  "message": "Workflow updated successfully"
}
```

### Delete Workflow

**DELETE** `/api/workflows/{id}`

Delete a workflow.

#### Path Parameters

- `id`: The unique identifier of the workflow

#### Example Request

```bash
DELETE /api/workflows/550e8400-e29b-41d4-a716-446655440000
```

#### Example Response

```json
{
  "success": true,
  "data": null,
  "message": "Workflow deleted successfully"
}
```

## Data Types

### NodeMetadata

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

### NodePort

```typescript
interface NodePort {
  id: string;
  name: string;
  type: "input" | "output";
  dataType: NodeDataType;
  required?: boolean;
  description?: string;
  defaultValue?: unknown;
}
```

### Workflow

```typescript
interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  metadata?: {
    version: string;
    createdAt: string;
    updatedAt: string;
    author?: string;
    tags?: string[];
  };
}
```

### WorkflowNode

```typescript
interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  deletable?: boolean;
  data: {
    label: string;
    config: Record<string, unknown>;
    metadata: NodeMetadata;
    isProcessing?: boolean;
    error?: string;
    nodeId?: string;
  };
}
```

### WorkflowEdge

```typescript
interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  selectable?: boolean;
  deletable?: boolean;
  data?: {
    label?: string;
    condition?: string;
  };
}
```

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- `400 Bad Request`: Invalid request data
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

### Error Response Format

```json
{
  "success": false,
  "error": "Error description",
  "message": "Detailed error message"
}
```

## Rate Limiting

Currently, there are no rate limits implemented. In production, you should implement appropriate rate limiting to prevent abuse.

## Testing

You can test the API using the built-in test page at `/api-test` which provides a user interface for testing all endpoints.

## Client-Side Usage

The project includes a client-side API service (`src/lib/services/api.ts`) that provides convenient methods for interacting with the API:

```typescript
import { api } from "$lib/services/api.js";

// Get all node types
const nodes = await api.nodes.getNodes();

// Create a workflow
const workflow = await api.workflows.createWorkflow({
  name: "My Workflow",
  description: "A test workflow"
});

// Update a workflow
const updatedWorkflow = await api.workflows.updateWorkflow(workflow.id, {
  description: "Updated description"
});
```

## Future Enhancements

- Authentication and authorization
- Workflow execution endpoints
- Real-time collaboration
- Version control for workflows
- Plugin system for custom node types
- Advanced search and filtering
- Bulk operations
- Export/import functionality 