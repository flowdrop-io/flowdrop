"""Flow endpoints — POST /flows/execute, POST /flows/validate."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from ..engine.execution_runner import (
    extract_node_names,
    generate_execution_id,
    run_execution,
)
from ..engine.execution_store import store

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------


class ExecuteFlowRequest(BaseModel):
    """Request body for POST /flows/execute."""

    flow: dict[str, Any]
    inputs: dict[str, Any] = {}


class ExecuteFlowResponse(BaseModel):
    execution_id: str
    status: str


class ValidationResult(BaseModel):
    valid: bool
    errors: list[str] = []


# ---------------------------------------------------------------------------
# POST /flows/execute
# ---------------------------------------------------------------------------


@router.post("/flows/execute", response_model=ExecuteFlowResponse)
async def execute_flow(
    request: ExecuteFlowRequest,
    background_tasks: BackgroundTasks,
):
    """Submit an Agent Spec flow for execution.

    Returns an execution_id immediately. The flow executes in the
    background. Poll GET /executions/{id} for status updates.
    """
    flow = request.flow

    # Basic validation
    errors = _validate_flow_structure(flow)
    if errors:
        raise HTTPException(status_code=400, detail={"errors": errors})

    # Create execution
    execution_id = generate_execution_id()
    node_names = extract_node_names(flow)
    store.create(execution_id, node_names)

    # Run execution in background
    background_tasks.add_task(run_execution, execution_id, flow, request.inputs)

    return ExecuteFlowResponse(execution_id=execution_id, status="running")


# ---------------------------------------------------------------------------
# POST /flows/validate
# ---------------------------------------------------------------------------


@router.post("/flows/validate", response_model=ValidationResult)
async def validate_flow(request: dict[str, Any]):
    """Validate an Agent Spec flow specification.

    Checks structural correctness without executing.
    """
    errors = _validate_flow_structure(request)
    return ValidationResult(valid=len(errors) == 0, errors=errors)


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------


def _validate_flow_structure(flow: dict) -> list[str]:
    """Validate the structure of an Agent Spec flow."""
    errors: list[str] = []

    # Required fields
    if flow.get("component_type") != "flow":
        errors.append("component_type must be 'flow'")

    if not flow.get("name"):
        errors.append("Flow must have a 'name'")

    start_node = flow.get("start_node")
    if not start_node:
        errors.append("Flow must have a 'start_node'")

    nodes = flow.get("nodes")
    if not nodes or not isinstance(nodes, list):
        errors.append("Flow must have a non-empty 'nodes' array")
        return errors  # Can't validate further without nodes

    connections = flow.get("control_flow_connections")
    if not connections or not isinstance(connections, list):
        errors.append("Flow must have non-empty 'control_flow_connections'")

    # Build node name set
    node_names = set()
    for node in nodes:
        name = node.get("name")
        if not name:
            errors.append("Every node must have a 'name'")
            continue
        if name in node_names:
            errors.append(f"Duplicate node name: '{name}'")
        node_names.add(name)

    # Check start_node exists
    if start_node and start_node not in node_names:
        errors.append(f"start_node '{start_node}' does not reference an existing node")

    # Check for at least one start_node component
    component_types = {n.get("component_type") for n in nodes}
    if "start_node" not in component_types:
        errors.append("Flow must contain at least one node with component_type 'start_node'")

    # Check for at least one end_node
    if "end_node" not in component_types:
        errors.append("Flow must contain at least one node with component_type 'end_node'")

    # Validate edges reference existing nodes
    if connections and isinstance(connections, list):
        for edge in connections:
            from_node = edge.get("from_node", "")
            to_node = edge.get("to_node", "")
            if from_node and from_node not in node_names:
                errors.append(
                    f"control_flow_connections: from_node '{from_node}' not found"
                )
            if to_node and to_node not in node_names:
                errors.append(
                    f"control_flow_connections: to_node '{to_node}' not found"
                )

    # Validate data_flow_connections if present
    data_connections = flow.get("data_flow_connections")
    if data_connections and isinstance(data_connections, list):
        for edge in data_connections:
            src = edge.get("source_node", "")
            dst = edge.get("destination_node", "")
            if src and src not in node_names:
                errors.append(
                    f"data_flow_connections: source_node '{src}' not found"
                )
            if dst and dst not in node_names:
                errors.append(
                    f"data_flow_connections: destination_node '{dst}' not found"
                )

    return errors
