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

The server implements the exact endpoint paths defined in FlowDrop's
[`agentSpecEndpoints.ts`](../../libs/flowdrop/src/lib/config/agentSpecEndpoints.ts).
FlowDrop's `AgentSpecExecutionService` connects to `http://localhost:8000` by default.

To use with FlowDrop:
1. Start this server on port 8000
2. Start the FlowDrop Express server on port 3001
3. Open the FlowDrop UI and create/execute Agent Spec workflows
