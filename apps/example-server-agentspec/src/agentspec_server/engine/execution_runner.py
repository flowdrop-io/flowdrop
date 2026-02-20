"""Flow execution runner — uses WayFlow to execute Agent Spec flows.

Runs as a background task in FastAPI so that POST /flows/execute
returns immediately with an execution_id.
"""

from __future__ import annotations

import json
import logging
import time
import uuid
from typing import Any

from .execution_store import store

logger = logging.getLogger(__name__)


def generate_execution_id() -> str:
    return f"exec-{uuid.uuid4().hex[:12]}"


def extract_node_names(flow: dict) -> list[str]:
    """Extract node names from an Agent Spec flow definition."""
    return [node["name"] for node in flow.get("nodes", [])]


async def run_execution(execution_id: str, flow: dict, inputs: dict[str, Any]) -> None:
    """Execute an Agent Spec flow using WayFlow.

    This function is called as a FastAPI BackgroundTask.
    It loads the flow via WayFlow's AgentSpecLoader and runs it,
    updating the execution store with per-node status as it progresses.
    """
    try:
        from wayflowcore.agentspec import AgentSpecLoader

        from ..data.tools import tool_registry
        from .llm_provider import get_llm

        # Get the configured LLM
        llm = get_llm()

        # Create the loader with tool registry
        loader = AgentSpecLoader(tool_registry=tool_registry)

        # Mark all nodes as pending
        ex = store.get(execution_id)
        if not ex:
            return
        for node_name in ex.node_statuses:
            ns = ex.node_statuses[node_name]
            ns.status = "pending"

        # Load the flow from JSON
        flow_json = json.dumps(flow)
        runnable = loader.load_json(flow_json)

        # Execute
        start_time = time.time()
        result = await runnable.execute_async()
        total_ms = int((time.time() - start_time) * 1000)

        # Mark all nodes as completed (WayFlow handles internal execution)
        for node_name in ex.node_statuses:
            if ex.node_statuses[node_name].status == "pending":
                store.set_node_completed(execution_id, node_name, duration_ms=total_ms)

        # Store final results
        results = _extract_results(result)
        store.set_completed(execution_id, results)
        logger.info("Execution %s completed in %dms", execution_id, total_ms)

    except ImportError:
        # WayFlow not installed — fall back to simulated execution
        logger.warning(
            "wayflowcore not installed, falling back to simulated execution"
        )
        await _run_simulated_execution(execution_id, flow, inputs)

    except Exception as e:
        logger.error("Execution %s failed: %s", execution_id, e, exc_info=True)
        store.set_failed(execution_id, str(e))


async def _run_simulated_execution(
    execution_id: str, flow: dict, inputs: dict[str, Any]
) -> None:
    """Fallback: simulate execution when WayFlow is not installed.

    Walks through nodes in control-flow order with delays to demonstrate
    the status polling lifecycle.
    """
    import asyncio

    ex = store.get(execution_id)
    if not ex:
        return

    # Build execution order from control_flow_connections
    node_order = _compute_execution_order(flow)

    for node_name in node_order:
        # Check for cancellation
        if ex.cancel_event.is_set():
            store.set_cancelled(execution_id)
            return

        node = _find_node(flow, node_name)
        component_type = node.get("component_type", "unknown") if node else "unknown"

        # Mark running
        store.set_node_running(execution_id, node_name)

        # Simulate delay based on node type
        delay = _get_simulated_delay(component_type)
        await asyncio.sleep(delay)

        # Check for cancellation after delay
        if ex.cancel_event.is_set():
            store.set_cancelled(execution_id)
            return

        # Mark completed with mock output
        output = _generate_mock_output(component_type, node_name, inputs)
        duration_ms = int(delay * 1000)
        store.set_node_completed(execution_id, node_name, duration_ms, output)

    # All nodes done
    store.set_completed(
        execution_id,
        {"message": "Simulated execution completed", "inputs": inputs},
    )


def _compute_execution_order(flow: dict) -> list[str]:
    """Topological sort of nodes using control_flow_connections."""
    edges = flow.get("control_flow_connections", [])
    start_node = flow.get("start_node", "")
    all_nodes = {n["name"] for n in flow.get("nodes", [])}

    # Build adjacency list
    adj: dict[str, list[str]] = {name: [] for name in all_nodes}
    for edge in edges:
        from_node = edge.get("from_node", "")
        to_node = edge.get("to_node", "")
        if from_node in adj:
            adj[from_node].append(to_node)

    # BFS from start_node
    visited: list[str] = []
    queue = [start_node] if start_node in all_nodes else list(all_nodes)[:1]
    seen: set[str] = set()

    while queue:
        node = queue.pop(0)
        if node in seen:
            continue
        seen.add(node)
        visited.append(node)
        for neighbor in adj.get(node, []):
            if neighbor not in seen:
                queue.append(neighbor)

    # Add unreachable nodes at the end
    for name in all_nodes:
        if name not in seen:
            visited.append(name)

    return visited


def _find_node(flow: dict, name: str) -> dict | None:
    for node in flow.get("nodes", []):
        if node.get("name") == name:
            return node
    return None


def _get_simulated_delay(component_type: str) -> float:
    """Simulated execution delay per node type (seconds)."""
    delays = {
        "start_node": 0.2,
        "end_node": 0.1,
        "llm_node": 2.0,
        "api_node": 0.8,
        "tool_node": 0.5,
        "agent_node": 3.0,
        "branching_node": 0.1,
        "flow_node": 1.5,
        "map_node": 2.0,
    }
    return delays.get(component_type, 0.5)


def _generate_mock_output(
    component_type: str, node_name: str, inputs: dict
) -> dict[str, Any]:
    """Generate mock output for simulated execution."""
    if component_type == "llm_node":
        return {"llm_output": f"[Simulated LLM response for '{node_name}']"}
    if component_type == "start_node":
        return dict(inputs)
    if component_type == "end_node":
        return {"status": "done"}
    return {"output": f"Simulated output from {node_name}"}


def _extract_results(result: Any) -> dict[str, Any]:
    """Extract serializable results from WayFlow execution output."""
    if isinstance(result, dict):
        return result
    if hasattr(result, "output"):
        out = result.output
        if isinstance(out, dict):
            return out
        return {"output": str(out)}
    return {"output": str(result)}
