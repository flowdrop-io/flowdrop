"""Health check endpoint — GET /health."""

import time

from fastapi import APIRouter

from .. import config

router = APIRouter()

_start_time = time.time()


@router.get("/health")
async def health_check():
    """Check runtime health, including LLM provider connectivity."""
    llm_status = await _check_llm()

    return {
        "status": "healthy",
        "version": "0.1.0",
        "runtime": "flowdrop-agentspec-server",
        "uptime": int(time.time() - _start_time),
        "llm": {
            "provider": config.LLM_PROVIDER,
            "model": (
                config.OLLAMA_MODEL
                if config.LLM_PROVIDER == "ollama"
                else config.OPENAI_MODEL
            ),
            "status": llm_status,
        },
    }


async def _check_llm() -> str:
    """Attempt a lightweight check of the configured LLM provider."""
    try:
        if config.LLM_PROVIDER == "ollama":
            import httpx

            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(f"{config.OLLAMA_BASE_URL}/api/tags")
                return "connected" if resp.status_code == 200 else "unreachable"
        elif config.LLM_PROVIDER == "openai":
            return "configured" if config.OPENAI_API_KEY else "missing_api_key"
        return "unknown_provider"
    except Exception:
        return "unreachable"
