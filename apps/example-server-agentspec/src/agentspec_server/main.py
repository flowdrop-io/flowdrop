"""FastAPI application for the Agent Spec runtime server."""

import os

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes.health import router as health_router
from .routes.flows import router as flows_router
from .routes.executions import router as executions_router
from .routes.discovery import router as discovery_router

root_path = os.environ.get("ROOT_PATH", "")

app = FastAPI(
    title="FlowDrop Agent Spec Runtime",
    description=(
        "Example Agent Spec runtime server for FlowDrop, "
        "powered by pyagentspec + WayFlow. "
        "Implements the Agent Spec runtime API for flow execution, "
        "validation, and discovery."
    ),
    version="0.1.0",
    root_path=root_path,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(flows_router)
app.include_router(executions_router)
app.include_router(discovery_router)


def run():
    """Entry point for the agentspec-server script."""
    uvicorn.run(
        "agentspec_server.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
