# FlowDrop Agent Spec Runtime Server

A Python-based Agent Spec runtime server for FlowDrop, powered by [pyagentspec](https://pypi.org/project/pyagentspec/) + [WayFlow](https://github.com/oracle/wayflow).

This server implements the Agent Spec runtime API that FlowDrop's `AgentSpecExecutionService` connects to for executing workflows, validating flows, and discovering available agents and tools.

## Architecture

```
┌─────────────────────┐         ┌──────────────────────────┐
│   FlowDrop UI       │         │  FlowDrop API Server     │
│   (Browser)         │────────▶│  (Express, port 3001)    │
│                     │         │  nodes, workflows,       │
│                     │         │  categories, port-config  │
│                     │         └──────────────────────────┘
│                     │
│  AgentSpecExecution │         ┌──────────────────────────┐
│  Service            │────────▶│  Agent Spec Runtime      │
│                     │  poll   │  (FastAPI, port 8000)    │
│                     │         │  execution, validation,  │
│                     │         │  agents, tools           │
└─────────────────────┘         └──────────────────────────┘
                                         │
                                         ▼
                                ┌──────────────────────────┐
                                │  LLM Provider            │
                                │  • Ollama (local)        │
                                │  • OpenAI (cloud)        │
                                └──────────────────────────┘
```

## Quick Start

### Prerequisites

- Python 3.10+
- An LLM provider (Ollama or OpenAI)

### Option A: Using Ollama (Local, No API Key)

```bash
# 1. Install and start Ollama (https://ollama.com)
ollama serve
ollama pull llama3.2

# 2. Install and run the server
cd apps/example-server-agentspec
pip install -e .
uvicorn agentspec_server.main:app --reload --port 8000
```

### Option B: Using OpenAI

```bash
# 1. Set your API key
export LLM_PROVIDER=openai
export OPENAI_API_KEY=sk-your-key-here
export OPENAI_MODEL=gpt-4o-mini  # optional, this is the default

# 2. Install and run the server
cd apps/example-server-agentspec
pip install -e .
uvicorn agentspec_server.main:app --reload --port 8000
```

### Verify

```bash
# Health check (includes LLM status)
curl http://localhost:8000/health

# Interactive API docs
open http://localhost:8000/docs
```

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Runtime health check + LLM status |
| `/flows/execute` | POST | Execute an Agent Spec flow |
| `/flows/validate` | POST | Validate a flow without executing |
| `/executions/{id}` | GET | Poll execution status (per-node) |
| `/executions/{id}/cancel` | POST | Cancel a running execution |
| `/executions/{id}/results` | GET | Get results of completed execution |
| `/agents` | GET | List available agents |
| `/tools` | GET | List available tools |

## Example: Execute a Flow

```bash
# Submit a simple flow for execution
curl -X POST http://localhost:8000/flows/execute \
  -H "Content-Type: application/json" \
  -d '{
    "flow": {
      "component_type": "flow",
      "name": "Simple Chat",
      "start_node": "start",
      "nodes": [
        {"component_type": "start_node", "name": "start",
         "outputs": [{"title": "user_prompt", "type": "string"}]},
        {"component_type": "llm_node", "name": "llm",
         "prompt_template": "{{user_prompt}}",
         "system_prompt": "Be helpful and concise.",
         "inputs": [{"title": "user_prompt", "type": "string"}],
         "outputs": [{"title": "llm_output", "type": "string"}]},
        {"component_type": "end_node", "name": "end",
         "inputs": [{"title": "response", "type": "string"}]}
      ],
      "control_flow_connections": [
        {"name": "e1", "from_node": "start", "to_node": "llm"},
        {"name": "e2", "from_node": "llm", "to_node": "end"}
      ],
      "data_flow_connections": [
        {"name": "d1", "source_node": "start", "source_output": "user_prompt",
         "destination_node": "llm", "destination_input": "user_prompt"},
        {"name": "d2", "source_node": "llm", "source_output": "llm_output",
         "destination_node": "end", "destination_input": "response"}
      ]
    },
    "inputs": {"user_prompt": "What is the capital of France?"}
  }'

# Response: {"execution_id": "exec-abc123", "status": "running"}

# Poll for status
curl http://localhost:8000/executions/exec-abc123

# Get final results
curl http://localhost:8000/executions/exec-abc123/results
```

## Configuration

Configuration is loaded from environment variables and/or a `.env` file.
Copy the example to get started:

```bash
cp .env.example .env
# Edit .env with your settings
```

| Environment Variable | Default | Description |
|---|---|---|
| `LLM_PROVIDER` | `ollama` | LLM provider: `ollama` or `openai` |
| `OLLAMA_MODEL` | `llama3.2` | Ollama model name |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL |
| `OPENAI_API_KEY` | _(none)_ | OpenAI API key (required when using OpenAI) |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model name |
| `PORT` | `8000` | Server port |

## Sample Tools

The server includes working tool implementations:

| Tool | Type | Description |
|---|---|---|
| `web_search` | server_tool | Search the web (sample results) |
| `calculator` | server_tool | Safe math expression evaluation |
| `get_current_time` | server_tool | Current UTC time |
| `text_transform` | server_tool | Text operations (uppercase, reverse, etc.) |
| `json_extract` | server_tool | Extract values from JSON via dot-notation |

## Development

```bash
# Install in editable mode
pip install -e .

# Run with auto-reload
uvicorn agentspec_server.main:app --reload --port 8000

# Or use the entry point script
agentspec-server
```

## Integration with FlowDrop

This server implements the exact endpoint paths defined in FlowDrop's
[`agentSpecEndpoints.ts`](../../libs/flowdrop/src/lib/config/agentSpecEndpoints.ts).
FlowDrop's `AgentSpecExecutionService` connects to `http://localhost:8000` by default —
no extra configuration needed.

### Running Both Servers

FlowDrop uses two servers during development:

| Server | Port | Purpose |
|---|---|---|
| FlowDrop API (`example-server-express`) | 3001 | Nodes, workflows, categories, port config |
| Agent Spec Runtime (this server) | 8000 | Flow execution, validation, agents, tools |

```bash
# Terminal 1 — Start the Agent Spec runtime
cd apps/example-server-agentspec
pip install -e .
uvicorn agentspec_server.main:app --reload --port 8000

# Terminal 2 — Start the FlowDrop API server
cd apps/example-server-express
npm install
npm run dev
```

### Connecting from a FlowDrop Client

FlowDrop's `AgentSpecExecutionService` is a singleton that manages the connection
to this runtime. Here's how to wire it up in your application:

#### 1. Configure the Service

```typescript
import { AgentSpecExecutionService } from '@flowdrop/flowdrop';
import { createAgentSpecEndpointConfig } from '@flowdrop/flowdrop/core';

const service = AgentSpecExecutionService.getInstance();

// Default: connects to http://localhost:8000 (this server)
service.configure(createAgentSpecEndpointConfig('http://localhost:8000'));

// Or with authentication
service.configure(createAgentSpecEndpointConfig('https://your-runtime.example.com', {
  auth: { type: 'bearer', token: 'your-api-key' },
  timeout: 120000
}));
```

#### 2. Check Runtime Health

```typescript
const healthy = await service.checkHealth();
if (!healthy) {
  console.error('Agent Spec runtime is not responding on port 8000');
}
```

#### 3. Execute a Workflow

```typescript
// Execute a StandardWorkflow — the service handles conversion to Agent Spec format
const handle = await service.executeWorkflow(
  workflow,                         // StandardWorkflow from FlowDrop editor
  { user_prompt: 'Hello, world!' }, // Input values for the flow
  {
    onNodeUpdate: (nodeId, info) => {
      // Called each poll cycle with per-node status
      // info.status: 'idle' | 'pending' | 'running' | 'completed' | 'failed'
      console.log(`Node ${nodeId}: ${info.status}`);
    },
    onComplete: (results) => {
      console.log('Workflow completed:', results);
    },
    onError: (error) => {
      console.error('Workflow failed:', error.message);
    }
  },
  2000 // polling interval in ms (default)
);

// Cancel if needed
await service.cancelExecution(handle.executionId);

// Or stop polling without cancelling
handle.stop();
```

#### 4. Validate Before Executing

```typescript
const validation = await service.validateOnRuntime(workflow);
if (!validation.valid) {
  console.error('Flow validation errors:', validation.errors);
}
```

### How It Works

```
FlowDrop UI
  │
  ├── User designs a workflow in the visual editor
  │
  ├── AgentSpecAdapter.toAgentSpec(workflow)
  │     Converts StandardWorkflow → Agent Spec flow JSON
  │
  ├── POST http://localhost:8000/flows/execute
  │     { flow: <AgentSpecFlow>, inputs: {...} }
  │     Returns: { execution_id: "exec-abc123", status: "running" }
  │
  ├── GET http://localhost:8000/executions/exec-abc123  (polls every 2s)
  │     Returns: { status: "running", node_statuses: { "llm": { status: "running", ... } } }
  │     → onNodeUpdate callback fires for each node
  │
  └── GET http://localhost:8000/executions/exec-abc123/results
        Returns: { response: "Paris is the capital of France." }
        → onComplete callback fires
```

### Using with the Docker Client

The [Docker client example](../example-client-docker/) can be configured via environment
variables to connect to this runtime:

```bash
# .env for the Docker client
FLOWDROP_API_BASE_URL=http://localhost:3001/api/flowdrop
```

Start all three services together:

```bash
# Terminal 1 — Agent Spec runtime (this server)
cd apps/example-server-agentspec && uvicorn agentspec_server.main:app --reload --port 8000

# Terminal 2 — FlowDrop API server
cd apps/example-server-express && npm run dev

# Terminal 3 — FlowDrop UI (Docker client)
cd apps/example-client-docker && npm run dev
```

Then open the FlowDrop UI, create an Agent Spec workflow with LLM nodes, and hit execute.
The UI will show real-time node status updates as the runtime processes each node.
