# =============================================================
# FlowDrop Agent Spec Runtime (FastAPI) — Docker Build
# =============================================================
# Build context: monorepo root (../../)
#
# Usage:
#   docker build -f apps/docker-playground/dockerfiles/agentspec.Dockerfile -t flowdrop-agentspec .
#   docker run -p 8000:8000 flowdrop-agentspec

FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY apps/example-server-agentspec/pyproject.toml ./
COPY apps/example-server-agentspec/src ./src

RUN pip install --no-cache-dir -e .

RUN useradd -r -u 1001 -m flowdrop
USER flowdrop

EXPOSE 8000

ENV LLM_PROVIDER=ollama
ENV OLLAMA_MODEL=llama3.2
ENV OLLAMA_BASE_URL=http://host.docker.internal:11434
ENV PORT=8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "agentspec_server.main:app", "--host", "0.0.0.0", "--port", "8000"]
