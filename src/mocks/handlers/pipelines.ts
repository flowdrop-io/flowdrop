/**
 * MSW handlers for Pipeline execution API endpoints
 * Implements pipeline execution, status, and logging
 */

import { http, HttpResponse } from "msw";
import {
	getPipelinesForWorkflow,
	getPipelineById,
	getPipelineLogs,
	createPipeline,
	updatePipelineStatus
} from "../data/index.js";
import type { Pipeline, PipelineStatus, LogEntry } from "../data/pipelines.js";

/** Base API path for flowdrop endpoints */
const API_BASE = "/api/flowdrop";

/**
 * Response type for pipeline list
 */
interface PipelineListResponse {
	success: boolean;
	data?: Array<{
		id: string;
		workflow_id: string;
		status: PipelineStatus;
		created: string;
		updated: string;
	}>;
	error?: string;
	message?: string;
}

/**
 * Response type for pipeline details
 */
interface PipelineDetailResponse {
	success?: boolean;
	status: PipelineStatus;
	jobs: Pipeline["jobs"];
	node_statuses: Pipeline["node_statuses"];
	job_status_summary: Pipeline["job_status_summary"];
	error?: string;
}

/**
 * GET /api/flowdrop/workflow/:workflow_id/pipelines
 * List all pipeline executions for a workflow
 */
export const getWorkflowPipelinesHandler = http.get(
	`${API_BASE}/workflow/:workflow_id/pipelines`,
	({ params, request }) => {
		const { workflow_id } = params;
		const workflowId = Array.isArray(workflow_id) ? workflow_id[0] : workflow_id;
		const url = new URL(request.url);
		const statusFilter = url.searchParams.get("status") as PipelineStatus | null;

		let pipelines = getPipelinesForWorkflow(workflowId);

		// Filter by status if specified
		if (statusFilter) {
			const validStatuses: PipelineStatus[] = ["pending", "running", "completed", "failed", "cancelled"];
			if (validStatuses.includes(statusFilter)) {
				pipelines = pipelines.filter((p) => p.status === statusFilter);
			}
		}

		// Map to summary format
		const pipelineSummaries = pipelines.map((p) => ({
			id: p.id,
			workflow_id: p.workflow_id,
			status: p.status,
			created: p.created,
			updated: p.updated
		}));

		const response: PipelineListResponse = {
			success: true,
			data: pipelineSummaries,
			message: `Found ${pipelineSummaries.length} pipeline executions`
		};

		return HttpResponse.json(response);
	}
);

/**
 * GET /api/flowdrop/pipeline/:id
 * Get detailed pipeline execution information
 */
export const getPipelineHandler = http.get(`${API_BASE}/pipeline/:id`, ({ params }) => {
	const { id } = params;
	const pipelineId = Array.isArray(id) ? id[0] : id;

	const pipeline = getPipelineById(pipelineId);

	if (!pipeline) {
		return HttpResponse.json(
			{
				success: false,
				error: "Pipeline not found",
				code: "NOT_FOUND"
			},
			{ status: 404 }
		);
	}

	const response: PipelineDetailResponse = {
		status: pipeline.status,
		jobs: pipeline.jobs,
		node_statuses: pipeline.node_statuses,
		job_status_summary: pipeline.job_status_summary
	};

	return HttpResponse.json(response);
});

/**
 * POST /api/flowdrop/pipeline/:id/execute
 * Start pipeline execution
 */
export const executePipelineHandler = http.post(
	`${API_BASE}/pipeline/:id/execute`,
	async ({ params, request }) => {
		const { id } = params;
		const pipelineId = Array.isArray(id) ? id[0] : id;

		// Check if pipeline exists
		const pipeline = getPipelineById(pipelineId);

		if (!pipeline) {
			return HttpResponse.json(
				{
					success: false,
					error: "Pipeline not found",
					code: "NOT_FOUND"
				},
				{ status: 404 }
			);
		}

		// Parse optional execution options
		let inputs: Record<string, unknown> = {};
		let options: { timeout?: number; maxSteps?: number } = {};

		try {
			const body = await request.json() as { inputs?: Record<string, unknown>; options?: typeof options };
			inputs = body.inputs || {};
			options = body.options || {};
		} catch {
			// Body is optional, continue without it
		}

		// Update pipeline status to running
		const updated = updatePipelineStatus(pipelineId, "running");

		if (!updated) {
			return HttpResponse.json(
				{
					success: false,
					error: "Failed to start pipeline",
					code: "INTERNAL_ERROR"
				},
				{ status: 500 }
			);
		}

		return HttpResponse.json(
			{
				success: true,
				data: {
					pipeline_id: pipelineId,
					status: "running",
					message: "Pipeline execution started"
				},
				message: "Pipeline execution started"
			},
			{ status: 202 }
		);
	}
);

/**
 * POST /api/flowdrop/pipeline/:id/stop
 * Stop a running pipeline execution
 */
export const stopPipelineHandler = http.post(`${API_BASE}/pipeline/:id/stop`, ({ params }) => {
	const { id } = params;
	const pipelineId = Array.isArray(id) ? id[0] : id;

	const pipeline = getPipelineById(pipelineId);

	if (!pipeline) {
		return HttpResponse.json(
			{
				success: false,
				error: "Pipeline not found",
				code: "NOT_FOUND"
			},
			{ status: 404 }
		);
	}

	// Only running pipelines can be stopped
	if (pipeline.status !== "running" && pipeline.status !== "pending") {
		return HttpResponse.json(
			{
				success: false,
				error: `Pipeline cannot be stopped: current status is "${pipeline.status}"`,
				code: "CONFLICT"
			},
			{ status: 409 }
		);
	}

	// Update pipeline status to cancelled
	const updated = updatePipelineStatus(pipelineId, "cancelled");

	if (!updated) {
		return HttpResponse.json(
			{
				success: false,
				error: "Failed to stop pipeline",
				code: "INTERNAL_ERROR"
			},
			{ status: 500 }
		);
	}

	return HttpResponse.json({
		success: true,
		message: "Pipeline stopped successfully"
	});
});

/**
 * GET /api/flowdrop/pipeline/:id/logs
 * Get pipeline execution logs
 */
export const getPipelineLogsHandler = http.get(`${API_BASE}/pipeline/:id/logs`, ({ params, request }) => {
	const { id } = params;
	const pipelineId = Array.isArray(id) ? id[0] : id;
	const url = new URL(request.url);
	const level = url.searchParams.get("level") as "debug" | "info" | "warning" | "error" | null;

	const pipeline = getPipelineById(pipelineId);

	if (!pipeline) {
		return HttpResponse.json(
			{
				success: false,
				error: "Pipeline not found",
				code: "NOT_FOUND"
			},
			{ status: 404 }
		);
	}

	let logs: LogEntry[];
	if (level) {
		logs = getPipelineLogs(pipelineId, level);
	} else {
		logs = getPipelineLogs(pipelineId);
	}

	return HttpResponse.json({
		success: true,
		data: logs,
		message: `Retrieved ${logs.length} log entries`
	});
});

/**
 * POST /api/flowdrop/workflows/:id/execute
 * Execute a workflow (creates a new pipeline and starts execution)
 * This is an alternative endpoint that creates and executes in one call
 */
export const executeWorkflowHandler = http.post(`${API_BASE}/workflows/:id/execute`, async ({ params }) => {
	const { id } = params;
	const workflowId = Array.isArray(id) ? id[0] : id;

	// Create a new pipeline for this workflow
	const pipeline = createPipeline(workflowId);

	// Start execution
	updatePipelineStatus(pipeline.id, "running");

	return HttpResponse.json(
		{
			success: true,
			data: {
				execution_id: pipeline.id,
				status: "running",
				started_at: new Date().toISOString(),
				estimated_completion: new Date(Date.now() + 30000).toISOString()
			},
			message: "Workflow execution started"
		},
		{ status: 202 }
	);
});

/**
 * Export all pipeline handlers
 */
export const pipelineHandlers = [
	getWorkflowPipelinesHandler,
	getPipelineHandler,
	executePipelineHandler,
	stopPipelineHandler,
	getPipelineLogsHandler,
	executeWorkflowHandler
];

