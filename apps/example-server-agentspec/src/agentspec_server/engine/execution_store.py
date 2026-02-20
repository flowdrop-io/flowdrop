"""In-memory execution state store.

Tracks execution lifecycle: running → completed | failed | cancelled.
Per-node statuses are updated as WayFlow processes each node.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass
class NodeStatus:
    status: str = "idle"  # idle | pending | running | completed | failed | skipped
    execution_count: int = 0
    started_at: str | None = None
    completed_at: str | None = None
    duration_ms: int | None = None
    error: str | None = None
    output: dict[str, Any] | None = None

    def to_dict(self) -> dict:
        d: dict[str, Any] = {
            "status": self.status,
            "execution_count": self.execution_count,
        }
        if self.started_at:
            d["started_at"] = self.started_at
        if self.completed_at:
            d["completed_at"] = self.completed_at
        if self.duration_ms is not None:
            d["duration_ms"] = self.duration_ms
        if self.error:
            d["error"] = self.error
        return d


@dataclass
class Execution:
    execution_id: str
    status: str = "running"  # running | completed | failed | cancelled
    created_at: str = ""
    updated_at: str = ""
    node_statuses: dict[str, NodeStatus] = field(default_factory=dict)
    results: dict[str, Any] | None = None
    error: str | None = None
    cancel_event: asyncio.Event = field(default_factory=asyncio.Event)

    def __post_init__(self):
        now = _now()
        if not self.created_at:
            self.created_at = now
        if not self.updated_at:
            self.updated_at = now

    def to_status_dict(self) -> dict:
        """Format for GET /executions/{id} — compatible with AgentSpecExecutionService."""
        return {
            "execution_id": self.execution_id,
            "status": self.status,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "node_statuses": {
                name: ns.to_dict() for name, ns in self.node_statuses.items()
            },
        }

    def to_results_dict(self) -> dict | None:
        """Format for GET /executions/{id}/results."""
        if self.results is None:
            return None
        return {
            "execution_id": self.execution_id,
            "status": self.status,
            "results": self.results,
        }


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class ExecutionStore:
    """Thread-safe in-memory store for execution state."""

    def __init__(self):
        self._executions: dict[str, Execution] = {}

    def create(self, execution_id: str, node_names: list[str]) -> Execution:
        """Create a new execution with all nodes in idle state."""
        execution = Execution(execution_id=execution_id)
        for name in node_names:
            execution.node_statuses[name] = NodeStatus()
        self._executions[execution_id] = execution
        return execution

    def get(self, execution_id: str) -> Execution | None:
        return self._executions.get(execution_id)

    def set_node_running(self, execution_id: str, node_name: str) -> None:
        ex = self.get(execution_id)
        if not ex:
            return
        ns = ex.node_statuses.setdefault(node_name, NodeStatus())
        ns.status = "running"
        ns.execution_count += 1
        ns.started_at = _now()
        ex.updated_at = _now()

    def set_node_completed(
        self,
        execution_id: str,
        node_name: str,
        duration_ms: int,
        output: dict[str, Any] | None = None,
    ) -> None:
        ex = self.get(execution_id)
        if not ex:
            return
        ns = ex.node_statuses.setdefault(node_name, NodeStatus())
        ns.status = "completed"
        ns.completed_at = _now()
        ns.duration_ms = duration_ms
        ns.output = output
        ex.updated_at = _now()

    def set_node_failed(
        self, execution_id: str, node_name: str, error: str
    ) -> None:
        ex = self.get(execution_id)
        if not ex:
            return
        ns = ex.node_statuses.setdefault(node_name, NodeStatus())
        ns.status = "failed"
        ns.error = error
        ns.completed_at = _now()
        ex.updated_at = _now()

    def set_completed(
        self, execution_id: str, results: dict[str, Any]
    ) -> None:
        ex = self.get(execution_id)
        if not ex:
            return
        ex.status = "completed"
        ex.results = results
        ex.updated_at = _now()

    def set_failed(self, execution_id: str, error: str) -> None:
        ex = self.get(execution_id)
        if not ex:
            return
        ex.status = "failed"
        ex.error = error
        ex.updated_at = _now()

    def set_cancelled(self, execution_id: str) -> None:
        ex = self.get(execution_id)
        if not ex:
            return
        ex.status = "cancelled"
        ex.cancel_event.set()
        ex.updated_at = _now()


# Singleton store
store = ExecutionStore()
