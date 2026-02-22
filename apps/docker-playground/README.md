# FlowDrop Docker Playground

All-in-one Docker environment for trying FlowDrop. A single `docker compose up` gives you the workflow editor, API server, and Agent Spec runtime — all behind a reverse proxy at `http://localhost`.

## Architecture

```
Browser → http://localhost
                │
           ┌────┴────┐
           │  Nginx   │  reverse proxy + landing page
           └────┬────┘
     ┌──────────┼──────────┐
     │          │          │
 /editor    /api/flowdrop  /agentspec/
     │          │          │
 SvelteKit   Express    FastAPI
  :3000       :3001      :8000
```

| Path | Service | Description |
|------|---------|-------------|
| `/` | Nginx (static) | Welcome landing page |
| `/editor` | SvelteKit | FlowDrop visual workflow editor |
| `/api/flowdrop/*` | Express | FlowDrop API — nodes, workflows, categories |
| `/agentspec/*` | FastAPI | Agent Spec runtime — flow execution, validation |
| `/agentspec/docs` | FastAPI | Interactive Swagger / OpenAPI documentation |

## Quick Start

**Prerequisites:** Docker 20.10+ and Docker Compose v2.

```bash
cd apps/docker-playground
docker compose up --build
```

Open **http://localhost** to see the welcome page, then click **"Try the Editor"**.

## LLM Provider Setup

The Agent Spec runtime needs an LLM to execute flows. Choose one:

### Option A: Host-machine Ollama (default)

If Ollama is running on your host machine:

```bash
# Install Ollama (https://ollama.ai) and pull a model:
ollama pull llama3.2

# Start the playground (default config points to host Ollama):
docker compose up --build
```

### Option B: OpenAI API

```bash
LLM_PROVIDER=openai OPENAI_API_KEY=sk-... docker compose up --build
```

### Option C: No LLM

The playground works without an LLM — the editor, API, and health endpoints all function normally. Only Agent Spec flow *execution* requires a connected LLM provider.

## Configuration

Copy `.env.example` to `.env` to customize:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `PLAYGROUND_PORT` | `80` | Host port for the playground |
| `FLOWDROP_THEME` | `auto` | UI theme: `light`, `dark`, `auto` |
| `FLOWDROP_TIMEOUT` | `30000` | API request timeout (ms) |
| `LLM_PROVIDER` | `ollama` | LLM provider: `ollama` or `openai` |
| `OLLAMA_MODEL` | `llama3.2` | Ollama model name |
| `OLLAMA_BASE_URL` | `http://host.docker.internal:11434` | Ollama server URL |
| `OPENAI_API_KEY` | — | OpenAI API key (when using OpenAI) |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model name |

## Custom Port

If port 80 is taken:

```bash
PLAYGROUND_PORT=8888 docker compose up --build
# → http://localhost:8888
```

## Stopping

```bash
docker compose down
```

## Troubleshooting

**Port 80 already in use:**
Set `PLAYGROUND_PORT=8080` (or any free port) in `.env` or as an environment variable.

**Ollama not reachable:**
Ensure Ollama is running on your host (`ollama serve`) and accessible at `http://localhost:11434`. On Linux, you may need `OLLAMA_BASE_URL=http://172.17.0.1:11434` instead of `host.docker.internal`.

**Agent Spec health shows "unhealthy":**
This is expected if no LLM provider is connected. The rest of the playground works without it.

**Slow first build:**
The initial `docker compose up --build` downloads base images and installs dependencies. Subsequent builds use Docker's cache and are much faster.
