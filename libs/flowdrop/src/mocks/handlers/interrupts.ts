/**
 * MSW handlers for Interrupt API endpoints
 *
 * Implements mock handlers for Human-in-the-Loop interrupt management.
 */

import { http, HttpResponse } from 'msw';
import {
	getInterruptById,
	resolveInterrupt,
	cancelInterrupt,
	getSessionInterrupts,
	getPipelineInterrupts
} from '../data/interrupts.js';
import { addMessage, updateSessionStatus } from '../data/playground.js';

/** Base API path for flowdrop endpoints */
const API_BASE = '/api/flowdrop';

/**
 * GET /api/flowdrop/interrupts/:interruptId
 * Get interrupt details
 */
export const getInterruptHandler = http.get(`${API_BASE}/interrupts/:interruptId`, ({ params }) => {
	const { interruptId } = params;
	const id = Array.isArray(interruptId) ? interruptId[0] : interruptId;

	console.log('[MSW] getInterruptHandler called for:', id);

	const interrupt = getInterruptById(id);

	if (!interrupt) {
		return HttpResponse.json(
			{
				success: false,
				error: 'Interrupt not found',
				code: 'NOT_FOUND'
			},
			{ status: 404 }
		);
	}

	return HttpResponse.json({
		success: true,
		data: interrupt
	});
});

/**
 * POST /api/flowdrop/interrupts/:interruptId
 * Resolve an interrupt with user response
 */
export const resolveInterruptHandler = http.post(
	`${API_BASE}/interrupts/:interruptId`,
	async ({ params, request }) => {
		const { interruptId } = params;
		const id = Array.isArray(interruptId) ? interruptId[0] : interruptId;

		console.log('[MSW] resolveInterruptHandler called for:', id);

		const interrupt = getInterruptById(id);

		if (!interrupt) {
			return HttpResponse.json(
				{
					success: false,
					error: 'Interrupt not found',
					code: 'NOT_FOUND'
				},
				{ status: 404 }
			);
		}

		if (interrupt.status !== 'pending') {
			return HttpResponse.json(
				{
					success: false,
					error: `Interrupt is already ${interrupt.status}`,
					code: 'CONFLICT'
				},
				{ status: 409 }
			);
		}

		let value: unknown;

		try {
			const body = (await request.json()) as { value: unknown };
			value = body.value;
		} catch {
			return HttpResponse.json(
				{
					success: false,
					error: 'Invalid request body - value is required',
					code: 'BAD_REQUEST'
				},
				{ status: 400 }
			);
		}

		if (value === undefined) {
			return HttpResponse.json(
				{
					success: false,
					error: 'Value is required',
					code: 'BAD_REQUEST'
				},
				{ status: 400 }
			);
		}

		const resolved = resolveInterrupt(id, value);

		if (!resolved) {
			return HttpResponse.json(
				{
					success: false,
					error: 'Failed to resolve interrupt',
					code: 'INTERNAL_ERROR'
				},
				{ status: 500 }
			);
		}

		console.log('[MSW] Interrupt resolved:', id, 'with value:', value);

		// Add workflow continuation messages synchronously
		// (async delays cause issues because frontend stops polling when session is idle)
		if (interrupt.sessionId) {
			const sessionId = interrupt.sessionId;

			// Add messages showing the workflow continuation
			addMessage(sessionId, 'log', `User response received: ${formatValue(value)}`, {
				level: 'info',
				nodeId: 'node-hitl',
				nodeLabel: 'Human Input'
			});

			addMessage(sessionId, 'log', 'Continuing workflow execution...', {
				level: 'info',
				nodeId: 'node-processor',
				nodeLabel: 'Processor'
			});

			const formatted = formatValue(value);
			const isCodeBlock = formatted.startsWith('```');
			const responseText = isCodeBlock
				? `Thank you for your response! The workflow has processed your input and completed successfully.\n\nYour response:\n\n${formatted}`
				: `Thank you for your response! The workflow has processed your input and completed successfully.\n\nYour response: **${formatted}**`;

			addMessage(sessionId, 'assistant', responseText, {
				nodeId: 'node-output',
				nodeLabel: 'Output',
				duration: 500
			});

			addMessage(sessionId, 'log', 'Workflow execution completed', {
				level: 'info',
				nodeId: 'node-end',
				nodeLabel: 'End'
			});

			updateSessionStatus(sessionId, 'completed');
		}

		return HttpResponse.json({
			success: true,
			data: resolved,
			message: 'Interrupt resolved successfully'
		});
	}
);

/**
 * Format a value for display in messages
 */
function formatValue(value: unknown): string {
	if (typeof value === 'boolean') {
		return value ? 'Yes / Confirmed' : 'No / Declined';
	}
	if (Array.isArray(value)) {
		return value.join(', ');
	}
	if (typeof value === 'object' && value !== null) {
		return '```json\n' + JSON.stringify(value, null, 2) + '\n```';
	}
	return String(value);
}

/**
 * POST /api/flowdrop/interrupts/:interruptId/cancel
 * Cancel a pending interrupt
 */
export const cancelInterruptHandler = http.post(
	`${API_BASE}/interrupts/:interruptId/cancel`,
	({ params }) => {
		const { interruptId } = params;
		const id = Array.isArray(interruptId) ? interruptId[0] : interruptId;

		console.log('[MSW] cancelInterruptHandler called for:', id);

		const interrupt = getInterruptById(id);

		if (!interrupt) {
			return HttpResponse.json(
				{
					success: false,
					error: 'Interrupt not found',
					code: 'NOT_FOUND'
				},
				{ status: 404 }
			);
		}

		if (interrupt.status !== 'pending') {
			return HttpResponse.json(
				{
					success: false,
					error: `Interrupt is already ${interrupt.status}`,
					code: 'CONFLICT'
				},
				{ status: 409 }
			);
		}

		if (!interrupt.allowCancel) {
			return HttpResponse.json(
				{
					success: false,
					error: 'This interrupt cannot be cancelled',
					code: 'BAD_REQUEST'
				},
				{ status: 400 }
			);
		}

		const cancelled = cancelInterrupt(id);

		if (!cancelled) {
			return HttpResponse.json(
				{
					success: false,
					error: 'Failed to cancel interrupt',
					code: 'INTERNAL_ERROR'
				},
				{ status: 500 }
			);
		}

		console.log('[MSW] Interrupt cancelled:', id);

		// Add workflow cancellation messages synchronously
		if (interrupt.sessionId) {
			const sessionId = interrupt.sessionId;

			addMessage(sessionId, 'log', 'User cancelled the input request', {
				level: 'warning',
				nodeId: 'node-hitl',
				nodeLabel: 'Human Input'
			});

			addMessage(
				sessionId,
				'assistant',
				'The workflow was cancelled at your request. You can start a new conversation to try again.',
				{
					nodeId: 'node-output',
					nodeLabel: 'Output'
				}
			);

			updateSessionStatus(sessionId, 'completed');
		}

		return HttpResponse.json({
			success: true,
			message: 'Interrupt cancelled'
		});
	}
);

/**
 * GET /api/flowdrop/playground/sessions/:sessionId/interrupts
 * List interrupts for a session
 */
export const listSessionInterruptsHandler = http.get(
	`${API_BASE}/playground/sessions/:sessionId/interrupts`,
	({ params, request }) => {
		const { sessionId } = params;
		const id = Array.isArray(sessionId) ? sessionId[0] : sessionId;

		console.log('[MSW] listSessionInterruptsHandler called for session:', id);

		const url = new URL(request.url);
		const status = url.searchParams.get('status') as 'pending' | 'resolved' | 'cancelled' | null;
		const limit = parseInt(url.searchParams.get('limit') || '50', 10);
		const offset = parseInt(url.searchParams.get('offset') || '0', 10);

		const interrupts = getSessionInterrupts(id, status || undefined, limit, offset);

		console.log('[MSW] Found interrupts for session:', interrupts.length);

		return HttpResponse.json({
			success: true,
			data: interrupts,
			message: `Found ${interrupts.length} interrupts`
		});
	}
);

/**
 * GET /api/flowdrop/pipelines/:pipelineId/interrupts
 * List interrupts for a pipeline
 */
export const listPipelineInterruptsHandler = http.get(
	`${API_BASE}/pipelines/:pipelineId/interrupts`,
	({ params, request }) => {
		const { pipelineId } = params;
		const id = Array.isArray(pipelineId) ? pipelineId[0] : pipelineId;

		console.log('[MSW] listPipelineInterruptsHandler called for pipeline:', id);

		const url = new URL(request.url);
		const status = url.searchParams.get('status') as 'pending' | 'resolved' | 'cancelled' | null;
		const limit = parseInt(url.searchParams.get('limit') || '50', 10);
		const offset = parseInt(url.searchParams.get('offset') || '0', 10);

		const interrupts = getPipelineInterrupts(id, status || undefined, limit, offset);

		console.log('[MSW] Found interrupts for pipeline:', interrupts.length);

		return HttpResponse.json({
			success: true,
			data: interrupts,
			message: `Found ${interrupts.length} interrupts`
		});
	}
);

/**
 * Export all interrupt handlers
 */
export const interruptHandlers = [
	getInterruptHandler,
	resolveInterruptHandler,
	cancelInterruptHandler,
	listSessionInterruptsHandler,
	listPipelineInterruptsHandler
];
