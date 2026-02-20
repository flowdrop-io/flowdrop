"""Discovery endpoints — GET /agents, GET /tools."""

from fastapi import APIRouter

from ..data.agents import agent_metadata
from ..data.tools import tool_metadata

router = APIRouter()


@router.get("/agents")
async def list_agents():
    """List available agents on this runtime."""
    return agent_metadata


@router.get("/tools")
async def list_tools():
    """List available tools on this runtime."""
    return tool_metadata
