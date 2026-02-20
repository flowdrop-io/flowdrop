"""Execution endpoints — status, cancel, results."""

from fastapi import APIRouter, HTTPException

from ..engine.execution_store import store

router = APIRouter()


# ---------------------------------------------------------------------------
# GET /executions/{id}
# ---------------------------------------------------------------------------


@router.get("/executions/{execution_id}")
async def get_execution_status(execution_id: str):
    """Get execution status with per-node info.

    This is the endpoint polled by FlowDrop's AgentSpecExecutionService
    every 2 seconds during flow execution.
    """
    execution = store.get(execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    return execution.to_status_dict()


# ---------------------------------------------------------------------------
# POST /executions/{id}/cancel
# ---------------------------------------------------------------------------


@router.post("/executions/{execution_id}/cancel")
async def cancel_execution(execution_id: str):
    """Cancel a running execution."""
    execution = store.get(execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")

    if execution.status in ("completed", "failed"):
        raise HTTPException(
            status_code=409,
            detail=f"Cannot cancel execution in '{execution.status}' state",
        )

    store.set_cancelled(execution_id)
    return {"success": True, "message": "Execution cancelled successfully"}


# ---------------------------------------------------------------------------
# GET /executions/{id}/results
# ---------------------------------------------------------------------------


@router.get("/executions/{execution_id}/results")
async def get_execution_results(execution_id: str):
    """Get final results of a completed execution."""
    execution = store.get(execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")

    if execution.status != "completed":
        raise HTTPException(
            status_code=404,
            detail=f"Results not available — execution is '{execution.status}'",
        )

    results = execution.to_results_dict()
    if results is None:
        raise HTTPException(status_code=404, detail="No results available")

    return results
