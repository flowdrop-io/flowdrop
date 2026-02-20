"""LLM provider factory — creates the appropriate LLM based on config."""

from .. import config


def create_llm():
    """Create an LLM instance based on the configured provider.

    Supports:
      - "ollama": Local Ollama server (default, no API key needed)
      - "openai": OpenAI API (requires OPENAI_API_KEY env var)

    Returns a WayFlow-compatible LLM object.
    """
    provider = config.LLM_PROVIDER.lower()

    if provider == "ollama":
        from wayflowcore.llm import OllamaModel

        return OllamaModel(
            model=config.OLLAMA_MODEL,
            base_url=config.OLLAMA_BASE_URL,
        )

    if provider == "openai":
        if not config.OPENAI_API_KEY:
            raise ValueError(
                "OPENAI_API_KEY environment variable is required when LLM_PROVIDER=openai"
            )
        from wayflowcore.llm import OpenAIModel

        return OpenAIModel(
            model=config.OPENAI_MODEL,
            api_key=config.OPENAI_API_KEY,
        )

    raise ValueError(
        f"Unknown LLM_PROVIDER: {provider!r}. Supported: 'ollama', 'openai'"
    )


# Singleton — created on first import
_llm = None


def get_llm():
    """Get or create the singleton LLM instance."""
    global _llm
    if _llm is None:
        _llm = create_llm()
    return _llm
