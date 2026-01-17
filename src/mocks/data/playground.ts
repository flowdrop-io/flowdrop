/**
 * Mock data for Playground API endpoints
 *
 * Provides mock sessions and messages for testing the playground feature.
 */

import type {
	PlaygroundSession,
	PlaygroundMessage,
	PlaygroundSessionStatus,
	PlaygroundMessageRole,
	PlaygroundMessageLevel
} from '../../lib/types/playground.js';

/**
 * Mock sessions storage
 */
const mockSessions: Map<string, PlaygroundSession> = new Map();

/**
 * Mock messages storage (sessionId -> messages)
 */
const mockMessages: Map<string, PlaygroundMessage[]> = new Map();

/**
 * Session ID counter for generating unique IDs
 */
let sessionIdCounter = 1;

/**
 * Message ID counter for generating unique IDs
 */
let messageIdCounter = 1;

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
	return `sess-${sessionIdCounter++}-${Date.now().toString(36)}`;
}

/**
 * Generate a unique message ID
 */
function generateMessageId(): string {
	return `msg-${messageIdCounter++}-${Date.now().toString(36)}`;
}

/**
 * Get all sessions for a workflow
 *
 * @param workflowId - The workflow ID
 * @param limit - Maximum number of sessions to return
 * @param offset - Number of sessions to skip
 * @returns Array of sessions
 */
export function getSessionsForWorkflow(
	workflowId: string,
	limit: number = 20,
	offset: number = 0
): PlaygroundSession[] {
	const sessions = Array.from(mockSessions.values())
		.filter((s) => s.workflowId === workflowId)
		.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

	return sessions.slice(offset, offset + limit);
}

/**
 * Get a session by ID
 *
 * @param sessionId - The session ID
 * @returns The session or undefined
 */
export function getSessionById(sessionId: string): PlaygroundSession | undefined {
	return mockSessions.get(sessionId);
}

/**
 * Create a new session
 *
 * @param workflowId - The workflow ID
 * @param name - Optional session name
 * @param metadata - Optional session metadata
 * @returns The created session
 */
export function createSession(
	workflowId: string,
	name?: string,
	metadata?: Record<string, unknown>
): PlaygroundSession {
	const now = new Date().toISOString();
	const session: PlaygroundSession = {
		id: generateSessionId(),
		workflowId,
		name: name || `Session ${sessionIdCounter}`,
		status: 'idle',
		createdAt: now,
		updatedAt: now,
		metadata
	};

	mockSessions.set(session.id, session);
	mockMessages.set(session.id, []);

	return session;
}

/**
 * Update a session's status
 *
 * @param sessionId - The session ID
 * @param status - The new status
 * @returns The updated session or undefined
 */
export function updateSessionStatus(
	sessionId: string,
	status: PlaygroundSessionStatus
): PlaygroundSession | undefined {
	const session = mockSessions.get(sessionId);
	if (!session) {
		return undefined;
	}

	session.status = status;
	session.updatedAt = new Date().toISOString();
	mockSessions.set(sessionId, session);

	return session;
}

/**
 * Delete a session
 *
 * @param sessionId - The session ID
 * @returns True if deleted, false if not found
 */
export function deleteSession(sessionId: string): boolean {
	if (!mockSessions.has(sessionId)) {
		return false;
	}

	mockSessions.delete(sessionId);
	mockMessages.delete(sessionId);

	return true;
}

/**
 * Get messages for a session
 *
 * @param sessionId - The session ID
 * @param since - Optional timestamp to filter messages after this time
 * @param limit - Maximum number of messages to return
 * @returns Array of messages
 */
export function getSessionMessages(
	sessionId: string,
	since?: string,
	limit: number = 100
): PlaygroundMessage[] {
	const messages = mockMessages.get(sessionId) || [];

	let filtered = messages;
	if (since) {
		const sinceTime = new Date(since).getTime();
		filtered = messages.filter((m) => new Date(m.timestamp).getTime() > sinceTime);
	}

	return filtered.slice(-limit);
}

/**
 * Add a message to a session
 *
 * @param sessionId - The session ID
 * @param role - The message role
 * @param content - The message content
 * @param options - Additional message options
 * @returns The created message or undefined if session not found
 */
export function addMessage(
	sessionId: string,
	role: PlaygroundMessageRole,
	content: string,
	options?: {
		nodeId?: string;
		level?: PlaygroundMessageLevel;
		duration?: number;
		nodeLabel?: string;
	}
): PlaygroundMessage | undefined {
	if (!mockSessions.has(sessionId)) {
		return undefined;
	}

	const messages = mockMessages.get(sessionId) || [];

	const message: PlaygroundMessage = {
		id: generateMessageId(),
		sessionId,
		role,
		content,
		timestamp: new Date().toISOString(),
		nodeId: options?.nodeId,
		metadata: {
			level: options?.level,
			duration: options?.duration,
			nodeLabel: options?.nodeLabel
		}
	};

	messages.push(message);
	mockMessages.set(sessionId, messages);

	// Update session timestamp
	const session = mockSessions.get(sessionId);
	if (session) {
		session.updatedAt = message.timestamp;
		mockSessions.set(sessionId, session);
	}

	return message;
}

/**
 * Simulate execution responses for a session
 * This adds mock assistant/log messages after user input
 *
 * @param sessionId - The session ID
 * @param userMessage - The user's message
 */
export function simulateExecution(sessionId: string, userMessage: string): void {
	const session = mockSessions.get(sessionId);
	if (!session) {
		return;
	}

	// Update status to running
	updateSessionStatus(sessionId, 'running');

	// Simulate processing with delayed responses
	const steps = [
		{
			delay: 500,
			role: 'log' as const,
			content: 'Starting workflow execution...',
			level: 'info' as const,
			nodeId: 'node-start',
			nodeLabel: 'Start'
		},
		{
			delay: 1000,
			role: 'log' as const,
			content: `Processing input: "${userMessage.substring(0, 50)}..."`,
			level: 'info' as const,
			nodeId: 'node-processor',
			nodeLabel: 'Text Processor'
		},
		{
			delay: 1500,
			role: 'log' as const,
			content: 'Analyzing content with AI model...',
			level: 'info' as const,
			nodeId: 'node-ai',
			nodeLabel: 'AI Model'
		},
		{
			delay: 2500,
			role: 'assistant' as const,
			content: `I received your message: "${userMessage}"\n\nThis is a mock response from the playground. In a real implementation, this would be the output from your workflow execution.`,
			nodeId: 'node-output',
			nodeLabel: 'Output',
			duration: 2000
		},
		{
			delay: 3000,
			role: 'log' as const,
			content: 'Workflow execution completed successfully',
			level: 'info' as const,
			nodeId: 'node-end',
			nodeLabel: 'End'
		}
	];

	steps.forEach((step) => {
		setTimeout(() => {
			addMessage(sessionId, step.role, step.content, {
				nodeId: step.nodeId,
				level: step.level,
				duration: step.duration,
				nodeLabel: step.nodeLabel
			});

			// Complete the session after the last step
			if (step === steps[steps.length - 1]) {
				updateSessionStatus(sessionId, 'completed');
			}
		}, step.delay);
	});
}

/**
 * Reset all mock data (useful for testing)
 */
export function resetPlaygroundData(): void {
	mockSessions.clear();
	mockMessages.clear();
	sessionIdCounter = 1;
	messageIdCounter = 1;
}

/**
 * Initialize with some sample data
 */
export function initializeSamplePlaygroundData(workflowId: string): void {
	// Create a sample session with some messages
	const session = createSession(workflowId, 'Sample Session');

	addMessage(session.id, 'user', 'Hello, can you help me test this workflow?');
	addMessage(session.id, 'log', 'Starting workflow execution...', {
		level: 'info',
		nodeId: 'node-start',
		nodeLabel: 'Start'
	});
	addMessage(
		session.id,
		'assistant',
		"Hello! I'm ready to help you test the workflow. What would you like to do?",
		{
			nodeId: 'node-output',
			nodeLabel: 'Output',
			duration: 1500
		}
	);

	updateSessionStatus(session.id, 'completed');
}
