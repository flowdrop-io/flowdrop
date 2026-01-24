/**
 * MSW handlers for Playground API endpoints
 *
 * Implements mock handlers for session management, messaging, and execution control.
 */

import { http, HttpResponse } from 'msw';
import {
	getSessionsForWorkflow,
	getSessionById,
	createSession,
	deleteSession,
	getSessionMessages,
	addMessage,
	updateSessionStatus,
	simulateExecution
} from '../data/playground.js';

/** Base API path for flowdrop endpoints */
const API_BASE = '/api/flowdrop';

/**
 * GET /api/flowdrop/workflows/:id/playground/sessions
 * List all playground sessions for a workflow
 */
export const listSessionsHandler = http.get(
	`${API_BASE}/workflows/:id/playground/sessions`,
	({ params, request }) => {
		console.log('[MSW] listSessionsHandler called');
		const { id } = params;
		const workflowId = Array.isArray(id) ? id[0] : id;
		console.log('[MSW] workflowId:', workflowId);

		const url = new URL(request.url);
		const limit = parseInt(url.searchParams.get('limit') || '20', 10);
		const offset = parseInt(url.searchParams.get('offset') || '0', 10);

		console.log(
			'[MSW] Fetching sessions for workflow:',
			workflowId,
			'limit:',
			limit,
			'offset:',
			offset
		);
		const sessions = getSessionsForWorkflow(workflowId, limit, offset);
		console.log('[MSW] Found sessions:', sessions.length);

		const response = {
			success: true,
			data: sessions,
			message: `Found ${sessions.length} sessions`
		};
		console.log('[MSW] Returning response:', response);

		return HttpResponse.json(response);
	}
);

/**
 * POST /api/flowdrop/workflows/:id/playground/sessions
 * Create a new playground session
 */
export const createSessionHandler = http.post(
	`${API_BASE}/workflows/:id/playground/sessions`,
	async ({ params, request }) => {
		const { id } = params;
		const workflowId = Array.isArray(id) ? id[0] : id;

		let name: string | undefined;
		let metadata: Record<string, unknown> | undefined;

		try {
			const body = (await request.json()) as {
				name?: string;
				metadata?: Record<string, unknown>;
			};
			name = body.name;
			metadata = body.metadata;
		} catch {
			// Body is optional
		}

		const session = createSession(workflowId, name, metadata);

		return HttpResponse.json(
			{
				success: true,
				data: session,
				message: 'Session created successfully'
			},
			{ status: 201 }
		);
	}
);

/**
 * GET /api/flowdrop/playground/sessions/:sessionId
 * Get session details
 */
export const getSessionHandler = http.get(
	`${API_BASE}/playground/sessions/:sessionId`,
	({ params }) => {
		const { sessionId } = params;
		const id = Array.isArray(sessionId) ? sessionId[0] : sessionId;

		const session = getSessionById(id);

		if (!session) {
			return HttpResponse.json(
				{
					success: false,
					error: 'Session not found',
					code: 'NOT_FOUND'
				},
				{ status: 404 }
			);
		}

		return HttpResponse.json({
			success: true,
			data: session
		});
	}
);

/**
 * DELETE /api/flowdrop/playground/sessions/:sessionId
 * Delete a session
 */
export const deleteSessionHandler = http.delete(
	`${API_BASE}/playground/sessions/:sessionId`,
	({ params }) => {
		const { sessionId } = params;
		const id = Array.isArray(sessionId) ? sessionId[0] : sessionId;

		const deleted = deleteSession(id);

		if (!deleted) {
			return HttpResponse.json(
				{
					success: false,
					error: 'Session not found',
					code: 'NOT_FOUND'
				},
				{ status: 404 }
			);
		}

		return HttpResponse.json({
			success: true,
			message: 'Session deleted successfully'
		});
	}
);

/**
 * GET /api/flowdrop/playground/sessions/:sessionId/messages
 * Get messages from a session with optional polling support
 */
export const getMessagesHandler = http.get(
	`${API_BASE}/playground/sessions/:sessionId/messages`,
	({ params, request }) => {
		const { sessionId } = params;
		const id = Array.isArray(sessionId) ? sessionId[0] : sessionId;
		const url = new URL(request.url);
		const since = url.searchParams.get('since') || undefined;
		const limit = parseInt(url.searchParams.get('limit') || '100', 10);

		const session = getSessionById(id);

		if (!session) {
			return HttpResponse.json(
				{
					success: false,
					error: 'Session not found',
					code: 'NOT_FOUND'
				},
				{ status: 404 }
			);
		}

		const messages = getSessionMessages(id, since, limit);

		return HttpResponse.json({
			success: true,
			data: messages,
			hasMore: false,
			sessionStatus: session.status
		});
	}
);

/**
 * POST /api/flowdrop/playground/sessions/:sessionId/messages
 * Send a message to a session and trigger execution
 */
export const sendMessageHandler = http.post(
	`${API_BASE}/playground/sessions/:sessionId/messages`,
	async ({ params, request }) => {
		const { sessionId } = params;
		const id = Array.isArray(sessionId) ? sessionId[0] : sessionId;

		const session = getSessionById(id);

		if (!session) {
			return HttpResponse.json(
				{
					success: false,
					error: 'Session not found',
					code: 'NOT_FOUND'
				},
				{ status: 404 }
			);
		}

		// Check if already executing
		if (session.status === 'running') {
			return HttpResponse.json(
				{
					success: false,
					error: 'Session is already executing',
					code: 'CONFLICT'
				},
				{ status: 409 }
			);
		}

		let content: string;
		let inputs: Record<string, unknown> | undefined;

		try {
			const body = (await request.json()) as {
				content: string;
				inputs?: Record<string, unknown>;
			};
			content = body.content;
			inputs = body.inputs;
		} catch {
			return HttpResponse.json(
				{
					success: false,
					error: 'Invalid request body',
					code: 'BAD_REQUEST'
				},
				{ status: 400 }
			);
		}

		if (!content || typeof content !== 'string') {
			return HttpResponse.json(
				{
					success: false,
					error: 'Content is required',
					code: 'BAD_REQUEST'
				},
				{ status: 400 }
			);
		}

		// Add the user message
		const message = addMessage(id, 'user', content);

		if (!message) {
			return HttpResponse.json(
				{
					success: false,
					error: 'Failed to add message',
					code: 'INTERNAL_ERROR'
				},
				{ status: 500 }
			);
		}

		// Simulate execution (adds assistant responses asynchronously)
		// Pass the user message ID as parentMessageId for proper message ordering
		simulateExecution(id, content, message.id);

		return HttpResponse.json({
			success: true,
			data: message,
			message: 'Message sent and execution started'
		});
	}
);

/**
 * POST /api/flowdrop/playground/sessions/:sessionId/stop
 * Stop execution in a session
 */
export const stopExecutionHandler = http.post(
	`${API_BASE}/playground/sessions/:sessionId/stop`,
	({ params }) => {
		const { sessionId } = params;
		const id = Array.isArray(sessionId) ? sessionId[0] : sessionId;

		const session = getSessionById(id);

		if (!session) {
			return HttpResponse.json(
				{
					success: false,
					error: 'Session not found',
					code: 'NOT_FOUND'
				},
				{ status: 404 }
			);
		}

		// Only running sessions can be stopped
		if (session.status !== 'running') {
			return HttpResponse.json(
				{
					success: false,
					error: 'No execution is running',
					code: 'CONFLICT'
				},
				{ status: 409 }
			);
		}

		// Update status to idle
		updateSessionStatus(id, 'idle');

		// Add a system message about the stop
		addMessage(id, 'system', 'Execution stopped by user', {
			level: 'warning'
		});

		return HttpResponse.json({
			success: true,
			message: 'Execution stopped'
		});
	}
);

/**
 * Export all playground handlers
 */
export const playgroundHandlers = [
	listSessionsHandler,
	createSessionHandler,
	getSessionHandler,
	deleteSessionHandler,
	getMessagesHandler,
	sendMessageHandler,
	stopExecutionHandler
];
