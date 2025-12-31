# FlowDrop API Documentation

This document describes the REST API specification for backend integration with FlowDrop, a visual workflow editor library for AI applications and data processing pipelines.

## Overview

FlowDrop provides a complete API for:
- **Node Type Discovery**: Browse and search available node processors with metadata
- **Workflow Management**: Complete CRUD operations for workflows with nodes and edges
- **Pipeline Execution**: Execute workflows with real-time status tracking and job management
- **Port Configuration**: Dynamic port compatibility system with data type management
- **Import/Export**: Import and export workflows in JSON format
- **Validation**: Workflow validation before execution

## Base URL

All API endpoints are prefixed with `/api/flowdrop` (configurable via `EndpointConfig`).

```typescript
// Default endpoint configuration
const endpointConfig: EndpointConfig = {
    baseUrl: "/api/flowdrop",
    // ... other options
};
```

## Authentication

FlowDrop supports multiple authentication methods via the `AuthProvider` interface:

### Authentication Types

| Type      | Description       | Header                          |
| --------- | ----------------- | ------------------------------- |
| `none`    | No authentication | -                               |
| `bearer`  | JWT Bearer token  | `Authorization: Bearer <token>` |
| `api_key` | API Key           | `X-API-Key: <key>`              |
| `custom`  | Custom headers    | Configurable                    |

### AuthProvider Interface

```typescript
interface AuthProvider {
    getAuthHeaders(): Promise<Record<string, string>>;
    isAuthenticated(): boolean;
    onUnauthorized?(): Promise<boolean>;
    onForbidden?(): Promise<void>;
}
```

### Built-in Providers

- **`StaticAuthProvider`**: Static credentials configured at instantiation
- **`CallbackAuthProvider`**: Dynamic token retrieval via callbacks
- **`NoAuthProvider`**: No authentication required

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

| Code               | Description                                                     |
| ------------------ | --------------------------------------------------------------- |
| `VALIDATION_ERROR` | Input validation failed                                         |
| `NOT_FOUND`        | Resource not found                                              |
| `BAD_REQUEST`      | Invalid request parameters                                      |
| `UNAUTHORIZED`     | Authentication required                                         |
| `FORBIDDEN`        | Insufficient permissions                                        |
| `CONFLICT`         | Operation cannot be performed (e.g., stop non-running pipeline) |
| `INTERNAL_ERROR`   | Internal server error                                           |

---

## System API

### Health Check

**GET** `/api/flowdrop/health`

Check if the FlowDrop API is running and responsive.

#### Response

```json
{
    "status": "healthy",
    "timestamp": "2024-01-15T10:00:00Z",
    "version": "1.0.0",
    "service": "FlowDrop API",
    "uptime": 3600
}
```

---

## Port Configuration API

### Get Port Configuration

**GET** `/api/flowdrop/port-config`

Retrieve the complete port configuration system including available data types and compatibility rules.

#### Response

```json
{
    "success": true,
    "data": {
        "version": "1.0.0",
        "defaultDataType": "string",
        "dataTypes": [
            {
                "id": "trigger",
                "name": "Trigger",
                "description": "Control flow of the workflow",
                "color": "var(--color-ref-purple-500)",
                "category": "basic",
                "enabled": true
            },
            {
                "id": "string",
                "name": "String",
                "description": "Text data",
                "color": "var(--color-ref-emerald-500)",
                "category": "basic",
                "enabled": true
            }
        ],
        "compatibilityRules": []
    },
    "message": "Port configuration loaded successfully"
}
```

### Available Data Types

| ID          | Name          | Category   | Description                  |
| ----------- | ------------- | ---------- | ---------------------------- |
| `trigger`   | Trigger       | basic      | Control flow of the workflow |
| `string`    | String        | basic      | Text data                    |
| `number`    | Number        | numeric    | Numeric data                 |
| `boolean`   | Boolean       | logical    | True/false values            |
| `array`     | Array         | collection | Ordered list of items        |
| `string[]`  | String Array  | collection | Array of strings             |
| `number[]`  | Number Array  | collection | Array of numbers             |
| `boolean[]` | Boolean Array | collection | Array of booleans            |
| `json[]`    | JSON Array    | collection | Array of JSON objects        |
| `file[]`    | File Array    | collection | Array of files               |
| `image[]`   | Image Array   | collection | Array of images              |
| `json`      | JSON          | complex    | JSON structured data         |
| `file`      | File          | file       | File data                    |
| `image`     | Image         | media      | Image data                   |
| `audio`     | Audio         | media      | Audio data                   |
| `video`     | Video         | media      | Video data                   |
| `url`       | URL           | special    | Web address                  |
| `email`     | Email         | special    | Email address                |
| `date`      | Date          | temporal   | Date value                   |
| `datetime`  | DateTime      | temporal   | Date and time value          |
| `time`      | Time          | temporal   | Time value                   |

---

## Node Types API

### List All Node Types

**GET** `/api/flowdrop/nodes`

Retrieve all available node types with optional filtering and pagination.

#### Query Parameters

| Parameter  | Type    | Default | Description                             |
| ---------- | ------- | ------- | --------------------------------------- |
| `category` | string  | -       | Filter by node category                 |
| `search`   | string  | -       | Search in names, descriptions, and tags |
| `limit`    | integer | 100     | Maximum results (1-1000)                |
| `offset`   | integer | 0       | Number of results to skip               |

#### Valid Categories

`ai`, `models`, `inputs`, `outputs`, `prompts`, `processing`, `logic`, `data`, `helpers`, `tools`, `vector_store`, `embeddings`, `memories`, `agents`, `control`, `content`, `integrations`, `ui`

#### Response Headers

| Header          | Description                               |
| --------------- | ----------------------------------------- |
| `X-Total-Count` | Total number of nodes matching the filter |
| `X-Page-Size`   | Number of nodes per page                  |
| `X-Page-Offset` | Current page offset                       |

#### Response

```json
{
    "success": true,
    "data": [
        {
            "id": "openai_chat_executor",
            "name": "OpenAI Chat",
            "description": "Chat completion using OpenAI's GPT models",
            "category": "ai",
            "version": "1.0.0",
            "type": "default",
            "supportedTypes": ["default", "simple"],
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
                }
            ],
            "configSchema": {
                "type": "object",
                "properties": {
                    "model": {
                        "type": "string",
                        "title": "Model",
                        "default": "gpt-4o-mini",
                        "enum": ["gpt-4o-mini", "gpt-4", "gpt-3.5-turbo"]
                    },
                    "temperature": {
                        "type": "number",
                        "title": "Temperature",
                        "default": 0.7,
                        "minimum": 0,
                        "maximum": 2
                    }
                }
            },
            "tags": ["openai", "gpt", "chat", "ai"]
        }
    ],
    "message": "Found 1 node types"
}
```

### Get Node Type by ID

**GET** `/api/flowdrop/nodes/{id}`

Retrieve metadata for a specific node type.

#### Response

```json
{
    "success": true,
    "data": {
        "id": "calculator",
        "name": "Calculator",
        "description": "Perform mathematical operations on input data",
        "category": "processing",
        "version": "1.0.0",
        "type": "default",
        "icon": "mdi:calculator",
        "color": "#3b82f6",
        "inputs": [...],
        "outputs": [...],
        "configSchema": {...}
    }
}
```

### Built-in Node Types (Visual Rendering)

FlowDrop includes built-in node rendering types:

| Type                       | Display Name                     | Description                                                    | Dynamic Support                           |
| -------------------------- | -------------------------------- | -------------------------------------------------------------- | ----------------------------------------- |
| `workflowNode` / `default` | Default (Standard Workflow Node) | Full-featured workflow node with inputs/outputs display        | `dynamicInputs`, `dynamicOutputs`         |
| `simple`                   | Simple (Compact Layout)          | Compact node with header, icon, and description                | -                                         |
| `square`                   | Square (Minimal Icon)            | Minimal square node showing only an icon                       | -                                         |
| `tool`                     | Tool (Agent Tool)                | Specialized node for agent tools with tool metadata            | -                                         |
| `gateway`                  | Gateway (Branching)              | Branching control flow node with multiple output branches      | `branches` (dynamic output paths)         |
| `note`                     | Note (Sticky Note)               | Documentation note with markdown support                       | -                                         |
| `terminal`                 | Terminal (Start/End/Exit)        | Circular terminal node for workflow start, end, or exit points | -                                         |

All node types support the `extensions.ui.hideUnconnectedHandles` setting to control visibility of unconnected ports.

---

## Workflows API

### List Workflows

**GET** `/api/flowdrop/workflows`

Retrieve all workflows with optional filtering and pagination.

#### Query Parameters

| Parameter | Type    | Default      | Description                                    |
| --------- | ------- | ------------ | ---------------------------------------------- |
| `search`  | string  | -            | Search in names and descriptions               |
| `tags`    | string  | -            | Filter by tags (comma-separated)               |
| `limit`   | integer | 50           | Maximum results (1-100)                        |
| `offset`  | integer | 0            | Number of results to skip                      |
| `sort`    | string  | `updated_at` | Sort field: `created_at`, `updated_at`, `name` |
| `order`   | string  | `desc`       | Sort direction: `asc`, `desc`                  |

#### Response Headers

| Header          | Description               |
| --------------- | ------------------------- |
| `X-Total-Count` | Total number of workflows |
| `X-Page-Size`   | Workflows per page        |
| `X-Page-Offset` | Current page offset       |

#### Response

```json
{
    "success": true,
    "data": [
        {
            "id": "550e8400-e29b-41d4-a716-446655440001",
            "name": "AI Chat Workflow",
            "description": "Process chat messages using AI",
            "nodes": [...],
            "edges": [...],
            "metadata": {
                "version": "1.0.0",
                "createdAt": "2024-01-15T10:30:00Z",
                "updatedAt": "2024-01-15T14:45:00Z",
                "author": "admin",
                "tags": ["ai", "chat"]
            }
        }
    ],
    "message": "Found 1 workflows"
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
            "id": "node-1",
            "type": "text_input",
            "position": { "x": 100, "y": 100 },
            "data": {
                "label": "User Input",
                "config": { "placeholder": "Enter text" },
                "metadata": {
                    "id": "text_input",
                    "name": "Text Input",
                    "category": "inputs",
                    "version": "1.0.0",
                    "inputs": [],
                    "outputs": [
                        { "id": "value", "name": "Value", "type": "output", "dataType": "string" }
                    ]
                }
            }
        }
    ],
    "edges": [],
    "tags": ["example"]
}
```

#### Response (201 Created)

```json
{
    "success": true,
    "data": {
        "id": "550e8400-e29b-41d4-a716-446655440099",
        "name": "My Workflow",
        "description": "A workflow for processing data",
        "nodes": [...],
        "edges": [],
        "metadata": {
            "version": "1.0.0",
            "createdAt": "2024-01-15T15:00:00Z",
            "updatedAt": "2024-01-15T15:00:00Z",
            "tags": ["example"]
        }
    },
    "message": "Workflow created successfully"
}
```

### Get Workflow by ID

**GET** `/api/flowdrop/workflows/{id}`

Retrieve a specific workflow by ID.

### Update Workflow

**PUT** `/api/flowdrop/workflows/{id}`

Update an existing workflow. All fields are optional - only provided fields will be updated.

#### Request Body

```json
{
    "name": "Updated Workflow Name",
    "description": "Updated description",
    "nodes": [...],
    "edges": [...],
    "metadata": {
        "tags": ["updated", "example"]
    }
}
```

### Delete Workflow

**DELETE** `/api/flowdrop/workflows/{id}`

Delete a workflow permanently.

#### Response

```json
{
    "success": true,
    "message": "Workflow deleted successfully"
}
```

---

## Workflow Validation API

### Validate Workflow

**POST** `/api/flowdrop/workflows/validate`

Validate a workflow structure without saving it.

#### Request Body

Full workflow object to validate.

#### Response

```json
{
    "success": true,
    "data": {
        "valid": true,
        "errors": [],
        "warnings": ["Node 'Calculator' has no connections"],
        "suggestions": ["Connect your nodes with edges to create a workflow"]
    }
}
```

### Validation Checks

- Valid node connections and port compatibility
- Required configuration fields
- Circular dependencies
- Orphaned nodes (no connections)
- Missing required inputs
- Duplicate node IDs
- Edge references to existing nodes

---

## Workflow Import/Export API

### Export Workflow

**GET** `/api/flowdrop/workflows/{id}/export`

Export a workflow as JSON or YAML format.

#### Query Parameters

| Parameter | Type   | Default | Description                   |
| --------- | ------ | ------- | ----------------------------- |
| `format`  | string | `json`  | Export format: `json`, `yaml` |

#### Response (JSON)

Returns the complete workflow object with `Content-Disposition` header for download.

#### Response (YAML)

Returns YAML-formatted workflow with `Content-Type: application/x-yaml`.

### Import Workflow

**POST** `/api/flowdrop/workflows/import`

Import a workflow from JSON. A new UUID will be assigned to the imported workflow.

#### Request Body

Complete workflow JSON object.

#### Response (201 Created)

```json
{
    "success": true,
    "data": {
        "id": "new-generated-uuid",
        "name": "Imported Workflow",
        ...
    },
    "message": "Workflow imported successfully"
}
```

---

## Pipeline Execution API

Pipelines represent individual execution instances of workflows.

### List Workflow Pipelines

**GET** `/api/flowdrop/workflow/{workflow_id}/pipelines`

Get all pipeline executions for a specific workflow.

#### Query Parameters

| Parameter | Type   | Description                                                                |
| --------- | ------ | -------------------------------------------------------------------------- |
| `status`  | string | Filter by status: `pending`, `running`, `completed`, `failed`, `cancelled` |

#### Response

```json
{
    "success": true,
    "data": [
        {
            "id": "pipeline-001",
            "workflow_id": "550e8400-e29b-41d4-a716-446655440001",
            "status": "completed",
            "created": "2024-01-15T10:00:00Z",
            "updated": "2024-01-15T10:05:30Z"
        }
    ],
    "message": "Found 1 pipeline executions"
}
```

### Get Pipeline Details

**GET** `/api/flowdrop/pipeline/{id}`

Retrieve detailed information about a pipeline execution.

#### Response

```json
{
    "status": "running",
    "jobs": [
        {
            "id": "job-001-1",
            "node_id": "node-input-1",
            "status": "completed",
            "execution_count": 1,
            "started": "2024-01-15T10:00:00Z",
            "completed": "2024-01-15T10:00:01Z",
            "execution_time": 1000
        },
        {
            "id": "job-001-2",
            "node_id": "node-openai-1",
            "status": "running",
            "execution_count": 1,
            "started": "2024-01-15T10:00:01Z"
        }
    ],
    "node_statuses": {
        "node-input-1": {
            "status": "completed",
            "last_executed": "2024-01-15T10:00:01Z",
            "execution_time": 1000
        },
        "node-openai-1": {
            "status": "running",
            "last_executed": "2024-01-15T10:00:01Z"
        }
    },
    "job_status_summary": {
        "total": 3,
        "pending": 1,
        "running": 1,
        "completed": 1,
        "failed": 0,
        "cancelled": 0
    }
}
```

### Execute Pipeline

**POST** `/api/flowdrop/pipeline/{id}/execute`

Start execution of a pipeline.

#### Request Body (Optional)

```json
{
    "inputs": {
        "node_id": "input value"
    },
    "options": {
        "timeout": 30000,
        "maxSteps": 100
    }
}
```

#### Response (202 Accepted)

```json
{
    "success": true,
    "data": {
        "pipeline_id": "pipeline-001",
        "status": "running",
        "message": "Pipeline execution started"
    },
    "message": "Pipeline execution started"
}
```

### Execute Workflow (Create & Execute)

**POST** `/api/flowdrop/workflows/{id}/execute`

Create a new pipeline and start execution in one call.

#### Request Body (Optional)

```json
{
    "inputs": {
        "node_id": "input value"
    }
}
```

#### Response (202 Accepted)

```json
{
    "success": true,
    "data": {
        "execution_id": "pipeline-12345",
        "status": "running",
        "started_at": "2024-01-15T15:00:00Z",
        "estimated_completion": "2024-01-15T15:00:30Z"
    },
    "message": "Workflow execution started"
}
```

### Stop Pipeline

**POST** `/api/flowdrop/pipeline/{id}/stop`

Cancel a running pipeline execution.

#### Response

```json
{
    "success": true,
    "message": "Pipeline stopped successfully"
}
```

#### Error Response (409 Conflict)

```json
{
    "success": false,
    "error": "Pipeline cannot be stopped: current status is \"completed\"",
    "code": "CONFLICT"
}
```

### Get Pipeline Logs

**GET** `/api/flowdrop/pipeline/{id}/logs`

Retrieve detailed execution logs for a pipeline.

#### Query Parameters

| Parameter | Type   | Description                                          |
| --------- | ------ | ---------------------------------------------------- |
| `level`   | string | Filter by level: `debug`, `info`, `warning`, `error` |

#### Response

```json
{
    "success": true,
    "data": [
        {
            "timestamp": "2024-01-15T10:00:00Z",
            "level": "info",
            "message": "Pipeline execution started",
            "context": { "workflow_id": "550e8400-e29b-41d4-a716-446655440001" }
        },
        {
            "timestamp": "2024-01-15T10:00:01Z",
            "level": "info",
            "message": "Node execution completed successfully",
            "node_id": "node-input-1",
            "context": { "execution_time": 1000 }
        }
    ],
    "message": "Retrieved 2 log entries"
}
```

---

## Execution Status Types

### Pipeline Status

| Status      | Description                          |
| ----------- | ------------------------------------ |
| `pending`   | Pipeline created but not yet started |
| `running`   | Pipeline is currently executing      |
| `completed` | Pipeline finished successfully       |
| `failed`    | Pipeline failed due to an error      |
| `cancelled` | Pipeline was manually stopped        |

### Node Execution Status

| Status      | Description                                |
| ----------- | ------------------------------------------ |
| `idle`      | Node has not been executed                 |
| `pending`   | Node is queued for execution               |
| `running`   | Node is currently executing                |
| `completed` | Node finished successfully                 |
| `failed`    | Node failed due to an error                |
| `cancelled` | Node execution was cancelled               |
| `skipped`   | Node was skipped (due to upstream failure) |

---

## Type Definitions

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
        executionInfo?: NodeExecutionInfo;
        /** Per-instance extension properties (overrides metadata.extensions) */
        extensions?: NodeExtensions;
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
    type?: "default" | "straight" | "step" | "smoothstep";
    selectable?: boolean;
    deletable?: boolean;
    data?: {
        label?: string;
        condition?: string;
        metadata?: {
            edgeType?: "trigger" | "tool" | "data";
            sourcePortDataType?: string;
        };
    };
}
```

### NodeMetadata

```typescript
interface NodeMetadata {
    id: string;
    name: string;
    type?: NodeType;
    supportedTypes?: NodeType[];
    description: string;
    category: NodeCategory;
    version: string;
    icon?: string;
    color?: string;
    inputs: NodePort[];
    outputs: NodePort[];
    configSchema?: ConfigSchema;
    tags?: string[];
    /** Default extension properties for all instances of this node type */
    extensions?: NodeExtensions;
}
```

### NodePort

```typescript
interface NodePort {
    id: string;
    name: string;
    type: "input" | "output" | "metadata";
    dataType: string;
    required?: boolean;
    description?: string;
    defaultValue?: unknown;
}
```

### DynamicPort

Dynamic ports are user-defined input/output handles that can be added at runtime through node configuration. They work similarly to static ports but are stored in the node's config.

```typescript
interface DynamicPort {
    /** Unique identifier for the port (used for handle IDs and connections) */
    name: string;
    /** Display label shown in the UI */
    label: string;
    /** Description of what this port accepts/provides */
    description?: string;
    /** Data type for the port (affects color and connection validation) */
    dataType: string;
    /** Whether this port is required for execution */
    required?: boolean;
}
```

### Branch (Gateway Nodes)

Branches define conditional output paths for gateway/switch nodes. Each branch creates an output handle.

```typescript
interface Branch {
    /** Unique identifier for the branch (used as handle ID) */
    name: string;
    /** Display label shown in the UI */
    label: string;
    /** Description of when this branch is activated */
    description?: string;
    /** Optional condition expression for this branch */
    condition?: string;
    /** Whether this is the default/fallback branch */
    isDefault?: boolean;
}
```

### NodeExtensions

Extensions allow storing UI settings and third-party integration data on nodes.

```typescript
interface NodeExtensions {
    /** UI-related settings for the node */
    ui?: NodeUIExtensions;
    /** Namespaced extension data from third-party integrations */
    [namespace: string]: unknown;
}

interface NodeUIExtensions {
    /** Show/hide unconnected handles to reduce visual noise */
    hideUnconnectedHandles?: boolean;
    /** Custom styles or theme overrides */
    style?: Record<string, unknown>;
    [key: string]: unknown;
}
```

### ConfigSchema

```typescript
interface ConfigSchema {
    type: "object";
    properties: Record<string, ConfigProperty>;
    required?: string[];
    additionalProperties?: boolean;
}

interface ConfigProperty {
    type: "string" | "number" | "boolean" | "array" | "object" | "integer";
    title?: string;
    description?: string;
    default?: unknown;
    enum?: unknown[];
    multiple?: boolean;
    minimum?: number;
    maximum?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    format?: "multiline" | "hidden" | string;
    items?: ConfigProperty;
    properties?: Record<string, ConfigProperty>;
}
```

---

## Dynamic Ports, Branches, and Extensions

FlowDrop supports dynamic configuration of node ports, gateway branches, and UI extensions. These features allow users to customize node behavior at runtime through the configuration panel.

### Dynamic Input/Output Ports

Nodes can support user-defined dynamic ports through their `configSchema`. Dynamic ports appear alongside static ports defined in the node metadata.

#### Enabling Dynamic Ports in ConfigSchema

```json
{
    "configSchema": {
        "type": "object",
        "properties": {
            "dynamicInputs": {
                "type": "array",
                "title": "Dynamic Inputs",
                "description": "User-defined input ports",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {
                            "type": "string",
                            "title": "Port ID",
                            "description": "Unique identifier for connections"
                        },
                        "label": {
                            "type": "string",
                            "title": "Label",
                            "description": "Display name in the UI"
                        },
                        "description": {
                            "type": "string",
                            "title": "Description"
                        },
                        "dataType": {
                            "type": "string",
                            "title": "Data Type",
                            "enum": ["string", "number", "boolean", "json", "array", "mixed"],
                            "default": "string"
                        },
                        "required": {
                            "type": "boolean",
                            "title": "Required",
                            "default": false
                        }
                    },
                    "required": ["name", "label", "dataType"]
                }
            },
            "dynamicOutputs": {
                "type": "array",
                "title": "Dynamic Outputs",
                "description": "User-defined output ports",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": { "type": "string", "title": "Port ID" },
                        "label": { "type": "string", "title": "Label" },
                        "description": { "type": "string", "title": "Description" },
                        "dataType": {
                            "type": "string",
                            "title": "Data Type",
                            "enum": ["string", "number", "boolean", "json", "array", "mixed"],
                            "default": "string"
                        },
                        "required": { "type": "boolean", "default": false }
                    },
                    "required": ["name", "label", "dataType"]
                }
            }
        }
    }
}
```

#### Node Config with Dynamic Ports

```json
{
    "id": "node-123",
    "type": "custom_function",
    "data": {
        "label": "Custom Function",
        "config": {
            "dynamicInputs": [
                {
                    "name": "input_a",
                    "label": "Input A",
                    "dataType": "string",
                    "required": true
                },
                {
                    "name": "input_b",
                    "label": "Input B",
                    "dataType": "json",
                    "required": false
                }
            ],
            "dynamicOutputs": [
                {
                    "name": "result",
                    "label": "Result",
                    "dataType": "string"
                }
            ]
        },
        "metadata": { ... }
    }
}
```

### Dynamic Branches (Gateway Nodes)

Gateway nodes support dynamic branching through the `config.branches` array. Each branch creates an output handle for conditional routing.

#### Branch ConfigSchema

```json
{
    "configSchema": {
        "type": "object",
        "properties": {
            "branches": {
                "type": "array",
                "title": "Branches",
                "description": "Conditional output paths",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {
                            "type": "string",
                            "title": "Branch ID",
                            "description": "Unique identifier for the branch"
                        },
                        "label": {
                            "type": "string",
                            "title": "Label",
                            "description": "Display name for the branch"
                        },
                        "description": {
                            "type": "string",
                            "title": "Description"
                        },
                        "condition": {
                            "type": "string",
                            "title": "Condition",
                            "description": "Expression that activates this branch"
                        },
                        "isDefault": {
                            "type": "boolean",
                            "title": "Default Branch",
                            "default": false
                        }
                    },
                    "required": ["name", "label"]
                }
            }
        }
    }
}
```

#### Gateway Node with Branches

```json
{
    "id": "gateway-1",
    "type": "switch",
    "data": {
        "label": "Route Decision",
        "config": {
            "branches": [
                {
                    "name": "high",
                    "label": "High Priority",
                    "condition": "priority > 8"
                },
                {
                    "name": "medium",
                    "label": "Medium Priority",
                    "condition": "priority >= 4"
                },
                {
                    "name": "default",
                    "label": "Default",
                    "isDefault": true
                }
            ]
        },
        "metadata": {
            "type": "gateway",
            ...
        }
    }
}
```

### Node Extensions

Extensions provide a way to store UI settings and third-party integration data on nodes at two levels:

1. **Node Type Level** (`metadata.extensions`): Default settings for all instances
2. **Instance Level** (`data.extensions`): Override for specific node instances

Instance-level settings take precedence over type-level defaults.

#### hideUnconnectedHandles

The most common extension setting is `hideUnconnectedHandles`, which reduces visual clutter by hiding ports that don't have connections.

```json
{
    "metadata": {
        "id": "complex_node",
        "extensions": {
            "ui": {
                "hideUnconnectedHandles": true
            }
        }
    }
}
```

#### Per-Instance Extensions

```json
{
    "id": "node-456",
    "type": "data_processor",
    "data": {
        "label": "Data Processor",
        "config": { ... },
        "metadata": { ... },
        "extensions": {
            "ui": {
                "hideUnconnectedHandles": false,
                "style": {
                    "opacity": 0.9
                }
            },
            "myapp:analytics": {
                "trackUsage": true,
                "customMetric": "value"
            }
        }
    }
}
```

### Extension Precedence

When resolving extension values, the system merges settings with this priority:

1. Instance-level (`data.extensions.ui.hideUnconnectedHandles`) - highest priority
2. Type-level (`metadata.extensions.ui.hideUnconnectedHandles`) - fallback

```typescript
// Example resolution logic
const hideUnconnectedHandles = 
    node.data.extensions?.ui?.hideUnconnectedHandles ??
    node.data.metadata.extensions?.ui?.hideUnconnectedHandles ??
    false;
```

---

## Rate Limiting

Rate limiting is backend-dependent. Recommended limits:

| Endpoint Category   | Limit               |
| ------------------- | ------------------- |
| Node Discovery      | 100 requests/minute |
| Workflow Operations | 50 requests/minute  |
| Pipeline Execution  | 20 requests/minute  |

### Rate Limit Headers (Recommended)

| Header                  | Description              |
| ----------------------- | ------------------------ |
| `X-RateLimit-Limit`     | Request limit per window |
| `X-RateLimit-Remaining` | Remaining requests       |
| `X-RateLimit-Reset`     | Time when limit resets   |

---

## Client Configuration

### EndpointConfig Interface

```typescript
interface EndpointConfig {
    baseUrl: string;
    endpoints: {
        nodes: { list, get, byCategory, metadata };
        portConfig: string;
        workflows: { list, get, create, update, delete, validate, export, import };
        executions: { execute, status, cancel, logs, history };
        pipelines: { list, get, create, update, delete, status, logs, execute, stop };
        templates: { list, get, create, update, delete };
        users: { profile, preferences };
        system: { health, config, version };
    };
    methods?: Record<string, "GET" | "POST" | "PUT" | "DELETE" | "PATCH">;
    headers?: Record<string, Record<string, string>>;
    auth?: {
        type: "none" | "bearer" | "api_key" | "custom";
        token?: string;
        apiKey?: string;
        headers?: Record<string, string>;
    };
    timeout?: number;
    retry?: {
        enabled: boolean;
        maxAttempts: number;
        delay: number;
        backoff?: "linear" | "exponential";
    };
}
```

### Default Configuration

```typescript
const defaultEndpointConfig: EndpointConfig = {
    baseUrl: "/api/flowdrop",
    endpoints: {
        nodes: {
            list: "/nodes",
            get: "/nodes/{id}",
            byCategory: "/nodes?category={category}",
            metadata: "/nodes/{id}/metadata"
        },
        portConfig: "/port-config",
        workflows: {
            list: "/workflows",
            get: "/workflows/{id}",
            create: "/workflows",
            update: "/workflows/{id}",
            delete: "/workflows/{id}",
            validate: "/workflows/validate",
            export: "/workflows/{id}/export",
            import: "/workflows/import"
        },
        executions: {
            execute: "/workflows/{id}/execute",
            status: "/executions/{id}",
            cancel: "/executions/{id}/cancel",
            logs: "/executions/{id}/logs",
            history: "/executions"
        },
        pipelines: {
            list: "/workflow/{workflow_id}/pipelines",
            get: "/pipeline/{id}",
            create: "/pipeline",
            update: "/pipeline/{id}",
            delete: "/pipeline/{id}",
            status: "/pipeline/{id}/status",
            logs: "/pipeline/{id}/logs",
            execute: "/pipeline/{id}/execute",
            stop: "/pipeline/{id}/stop"
        },
        // ... additional endpoints
    },
    timeout: 30000,
    retry: {
        enabled: true,
        maxAttempts: 3,
        delay: 1000,
        backoff: "exponential"
    }
};
```

---

## API Client Usage

### FlowDropApiClient (Basic)

```typescript
import { FlowDropApiClient } from "@flowdrop/ui";

const client = new FlowDropApiClient("/api/flowdrop", "your-api-key");

// Fetch nodes
const nodes = await client.getAvailableNodes();

// Save workflow
const saved = await client.saveWorkflow(workflow);

// Execute workflow
const result = await client.executeWorkflow(workflowId, { input: "value" });

// Get pipeline data
const pipeline = await client.getPipelineData(pipelineId);
```

### EnhancedFlowDropApiClient (With AuthProvider)

```typescript
import { EnhancedFlowDropApiClient, CallbackAuthProvider } from "@flowdrop/ui";

const authProvider = new CallbackAuthProvider({
    getToken: async () => authService.getAccessToken(),
    onUnauthorized: async () => {
        const refreshed = await authService.refreshToken();
        return refreshed;
    }
});

const client = new EnhancedFlowDropApiClient(endpointConfig, authProvider);

// All methods available with automatic retry and auth handling
const workflows = await client.listWorkflows();
```

---

## Security Considerations

1. **Authentication**: Implement appropriate authentication for your backend
2. **Input Validation**: Validate all inputs against schemas
3. **Output Sanitization**: Sanitize outputs to prevent XSS
4. **Logging**: Log all operations for audit purposes
5. **Error Handling**: Avoid exposing sensitive information in error messages
6. **CORS**: Configure CORS headers appropriately for your deployment

---

## Best Practices

1. **Use HTTPS**: Always use HTTPS in production
2. **Validate Inputs**: Always validate inputs before processing
3. **Handle Errors**: Implement proper error handling with retries
4. **Monitor Usage**: Monitor API usage and performance
5. **Cache Responses**: Cache static data like node metadata and port config
6. **Use Pagination**: Use pagination for large datasets
7. **Implement Retries**: Use exponential backoff for transient failures
