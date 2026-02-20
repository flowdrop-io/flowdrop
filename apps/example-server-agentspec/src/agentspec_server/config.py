"""Server configuration via environment variables and .env file."""

import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env file from the project root (apps/example-server-agentspec/.env)
_env_path = Path(__file__).resolve().parent.parent.parent.parent / ".env"
load_dotenv(_env_path)


def env(key: str, default: str = "") -> str:
    return os.environ.get(key, default)


# --- LLM Provider ---
# Supported: "ollama" | "openai"
LLM_PROVIDER: str = env("LLM_PROVIDER", "ollama")

# --- Ollama (default for local development, no API key needed) ---
OLLAMA_MODEL: str = env("OLLAMA_MODEL", "llama3.2")
OLLAMA_BASE_URL: str = env("OLLAMA_BASE_URL", "http://localhost:11434")

# --- OpenAI ---
OPENAI_API_KEY: str = env("OPENAI_API_KEY")
OPENAI_MODEL: str = env("OPENAI_MODEL", "gpt-4o-mini")

# --- Server ---
PORT: int = int(env("PORT", "8000"))
