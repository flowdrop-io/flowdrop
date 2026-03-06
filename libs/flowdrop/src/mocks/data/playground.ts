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
	PlaygroundMessageLevel,
	PlaygroundMessageStatus,
	PlaygroundMessageMetadata
} from '../../lib/types/playground.js';
import { ENABLE_RUN_METADATA_KEY } from '../../lib/types/playground.js';
import {
	createConfirmationInterrupt,
	createChoiceInterrupt,
	createTextInterrupt,
	createFormInterrupt,
	createReviewInterrupt,
	sampleInterruptConfigs
} from './interrupts.js';

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
 * Sequence counter per session for all messages (incrementing)
 */
const sessionSequenceCounters: Map<string, number> = new Map();

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
	sessionSequenceCounters.set(session.id, 0);

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
		parentMessageId?: string;
		status?: PlaygroundMessageStatus;
		metadata?: PlaygroundMessageMetadata;
	}
): PlaygroundMessage | undefined {
	if (!mockSessions.has(sessionId)) {
		return undefined;
	}

	const messages = mockMessages.get(sessionId) || [];

	// All messages get incrementing sequence numbers (1, 2, 3, ...)
	const currentSeq = sessionSequenceCounters.get(sessionId) || 0;
	const sequenceNumber = currentSeq + 1;
	sessionSequenceCounters.set(sessionId, sequenceNumber);

	const message: PlaygroundMessage = {
		id: generateMessageId(),
		sessionId,
		role,
		content,
		timestamp: new Date().toISOString(),
		status: options?.status || 'completed',
		sequenceNumber,
		parentMessageId: options?.parentMessageId,
		nodeId: options?.nodeId,
		metadata: options?.metadata || {
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
 * Detect which type of interrupt to trigger based on user message keywords
 */
function detectInterruptType(
	userMessage: string
): 'confirmation' | 'choice' | 'text' | 'form' | 'review' | null {
	const lowerMessage = userMessage.toLowerCase();

	if (
		lowerMessage.includes('confirm') ||
		lowerMessage.includes('approve') ||
		lowerMessage.includes('delete')
	) {
		return 'confirmation';
	}
	if (
		lowerMessage.includes('choose') ||
		lowerMessage.includes('select') ||
		lowerMessage.includes('pick')
	) {
		return 'choice';
	}
	if (
		lowerMessage.includes('input') ||
		lowerMessage.includes('enter') ||
		lowerMessage.includes('provide text')
	) {
		return 'text';
	}
	if (
		lowerMessage.includes('form') ||
		lowerMessage.includes('fill') ||
		lowerMessage.includes('details')
	) {
		return 'form';
	}
	if (
		lowerMessage.includes('review') ||
		lowerMessage.includes('diff') ||
		lowerMessage.includes('changes')
	) {
		return 'review';
	}

	return null;
}

/**
 * Check if the message is a "run workflow" trigger (for testing Run button mode)
 * These are typically predefined messages sent when chat input is hidden.
 */
function isRunWorkflowTrigger(userMessage: string): boolean {
	const lowerMessage = userMessage.toLowerCase();
	return (
		lowerMessage === 'run workflow' ||
		lowerMessage === 'execute pipeline' ||
		lowerMessage === 'start automation' ||
		lowerMessage.startsWith('run ')
	);
}

/**
 * Simulate execution responses for a session
 * This adds mock assistant/log messages after user input
 *
 * Keywords to trigger different interrupt types:
 * - "confirm", "approve", "delete" -> Confirmation interrupt
 * - "choose", "select", "pick" -> Choice interrupt
 * - "input", "enter", "provide text" -> Text interrupt
 * - "form", "fill", "details" -> Form interrupt
 *
 * @param sessionId - The session ID
 * @param userMessage - The user's message
 * @param parentMessageId - The ID of the user message that triggered this execution
 */
export function simulateExecution(
	sessionId: string,
	userMessage: string,
	parentMessageId?: string
): void {
	const session = mockSessions.get(sessionId);
	if (!session) {
		return;
	}

	// Update status to running
	updateSessionStatus(sessionId, 'running');

	// Check if we should trigger an interrupt
	const interruptType = detectInterruptType(userMessage);

	if (interruptType) {
		// Simulate interrupt flow
		simulateInterruptExecution(sessionId, userMessage, interruptType, parentMessageId);
	} else {
		// Normal execution flow
		simulateNormalExecution(sessionId, userMessage, parentMessageId);
	}
}

/**
 * Simulate normal (non-interrupt) execution
 */
function simulateNormalExecution(
	sessionId: string,
	userMessage: string,
	parentMessageId?: string
): void {
	const isRunTrigger = isRunWorkflowTrigger(userMessage);

	// Different response for "Run workflow" triggers vs normal chat messages
	const responseContent = isRunTrigger
		? `Workflow executed successfully!\n\nThis is a mock execution triggered by the "Run" button. The workflow processed your predefined inputs and completed all steps.\n\n**Test tip:** The Run button should now be re-enabled. Click it again to run another execution.`
		: `I received your message: "${userMessage}"\n\nThis is a mock response from the playground. In a real implementation, this would be the output from your workflow execution.\n\n**Tip:** Try messages with keywords like "confirm", "choose", "input", or "form" to test interrupt prompts!`;

	const steps = [
		{
			delay: 500,
			role: 'log' as const,
			content: isRunTrigger
				? 'Run button triggered - starting workflow...'
				: 'Starting workflow execution...',
			level: 'info' as const,
			nodeId: 'node-start',
			nodeLabel: 'Start'
		},
		{
			delay: 1000,
			role: 'log' as const,
			content: isRunTrigger
				? 'Processing workflow inputs...'
				: `Processing input: "${userMessage.substring(0, 50)}..."`,
			level: 'info' as const,
			nodeId: 'node-processor',
			nodeLabel: 'Text Processor'
		},
		{
			delay: 1500,
			role: 'log' as const,
			content: isRunTrigger ? 'Executing workflow nodes...' : 'Analyzing content with AI model...',
			level: 'info' as const,
			nodeId: 'node-ai',
			nodeLabel: 'AI Model'
		},
		{
			delay: 2500,
			role: 'assistant' as const,
			content: responseContent,
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
				nodeLabel: step.nodeLabel,
				parentMessageId
			});

			// Complete the session after the last step
			if (step === steps[steps.length - 1]) {
				updateSessionStatus(sessionId, 'completed');

				// Add a system message with enableRun: true to re-enable the Run button
				// This simulates the backend signaling that the workflow is ready for another run
				setTimeout(() => {
					addMessage(sessionId, 'system', 'Ready for next execution.', {
						metadata: {
							[ENABLE_RUN_METADATA_KEY]: true
						}
					});
				}, 500);
			}
		}, step.delay);
	});
}

/**
 * Simulate execution with an interrupt
 */
function simulateInterruptExecution(
	sessionId: string,
	userMessage: string,
	interruptType: 'confirmation' | 'choice' | 'text' | 'form' | 'review',
	parentMessageId?: string
): void {
	const executionId = `exec-${Date.now().toString(36)}`;

	// First step: log the start
	setTimeout(() => {
		addMessage(sessionId, 'log', 'Starting workflow execution...', {
			level: 'info',
			nodeId: 'node-start',
			nodeLabel: 'Start',
			parentMessageId
		});
	}, 500);

	// Second step: trigger the interrupt
	setTimeout(() => {
		addMessage(sessionId, 'log', `Processing requires ${interruptType} input...`, {
			level: 'info',
			nodeId: 'node-hitl',
			nodeLabel: 'Human Input',
			parentMessageId
		});

		// Create the interrupt message after a short delay
		setTimeout(() => {
			createInterruptMessage(sessionId, interruptType, executionId, parentMessageId);
		}, 500);
	}, 1500);
}

/**
 * Create an interrupt message with the appropriate metadata
 */
function createInterruptMessage(
	sessionId: string,
	interruptType: 'confirmation' | 'choice' | 'text' | 'form' | 'review',
	executionId: string,
	parentMessageId?: string
): void {
	const nodeId = 'node-hitl';

	// Create the message first to get its ID
	const messageId = generateMessageId();

	let interrupt;
	let content: string;
	let metadata: PlaygroundMessageMetadata;

	switch (interruptType) {
		case 'confirmation': {
			const config = sampleInterruptConfigs.confirmation;
			interrupt = createConfirmationInterrupt(
				sessionId,
				messageId,
				nodeId,
				executionId,
				config,
				true
			);
			content = config.message;
			metadata = {
				type: 'interrupt_request',
				interrupt_id: interrupt.id,
				interrupt_type: 'confirmation',
				node_id: nodeId,
				execution_id: executionId,
				confirm_label: config.confirmLabel,
				cancel_label: config.cancelLabel,
				allow_cancel: true
			};
			break;
		}
		case 'choice': {
			const config = sampleInterruptConfigs.choice;
			interrupt = createChoiceInterrupt(sessionId, messageId, nodeId, executionId, config, true);
			content = config.message;
			metadata = {
				type: 'interrupt_request',
				interrupt_id: interrupt.id,
				interrupt_type: 'choice',
				node_id: nodeId,
				execution_id: executionId,
				options: config.options,
				multiple: config.multiple,
				allow_cancel: true
			};
			break;
		}
		case 'text': {
			const config = sampleInterruptConfigs.text;
			interrupt = createTextInterrupt(sessionId, messageId, nodeId, executionId, config, true);
			content = config.message;
			metadata = {
				type: 'interrupt_request',
				interrupt_id: interrupt.id,
				interrupt_type: 'text',
				node_id: nodeId,
				execution_id: executionId,
				placeholder: config.placeholder,
				multiline: config.multiline,
				min_length: config.minLength,
				max_length: config.maxLength,
				allow_cancel: true
			};
			break;
		}
		case 'form': {
			const config = sampleInterruptConfigs.form;
			interrupt = createFormInterrupt(sessionId, messageId, nodeId, executionId, config, true);
			content = config.message;
			metadata = {
				type: 'interrupt_request',
				interrupt_id: interrupt.id,
				interrupt_type: 'form',
				node_id: nodeId,
				execution_id: executionId,
				schema: config.schema,
				default_value: config.defaultValues,
				allow_cancel: true
			};
			break;
		}
		case 'review': {
			const config = sampleInterruptConfigs.review;
			interrupt = createReviewInterrupt(sessionId, messageId, nodeId, executionId, config, true);
			content = config.message;
			metadata = {
				type: 'interrupt_request',
				interrupt_id: interrupt.id,
				interrupt_type: 'review',
				node_id: nodeId,
				execution_id: executionId,
				changes: config.changes,
				accept_all_label: config.acceptAllLabel,
				reject_all_label: config.rejectAllLabel,
				submit_label: config.submitLabel,
				allow_cancel: true
			};
			break;
		}
	}

	// Add the interrupt message with metadata - manually create to use specific messageId
	const messages = mockMessages.get(sessionId) || [];
	const currentSeq = sessionSequenceCounters.get(sessionId) || 0;
	const sequenceNumber = currentSeq + 1;
	sessionSequenceCounters.set(sessionId, sequenceNumber);

	const message: PlaygroundMessage = {
		id: messageId,
		sessionId,
		role: 'assistant',
		content,
		timestamp: new Date().toISOString(),
		// Use 'pending' status for interrupt messages - they should only be 'completed'
		// after the user has responded. The ChatPanel effect checks message.status
		// and auto-resolves interrupts with 'completed' status.
		status: 'pending',
		sequenceNumber,
		parentMessageId,
		nodeId,
		metadata
	};

	messages.push(message);
	mockMessages.set(sessionId, messages);

	// Update session timestamp and set status to idle (waiting for user input)
	const session = mockSessions.get(sessionId);
	if (session) {
		session.updatedAt = message.timestamp;
		session.status = 'idle';
		mockSessions.set(sessionId, session);
	}
}

/**
 * Reset all mock data (useful for testing)
 */
export function resetPlaygroundData(): void {
	mockSessions.clear();
	mockMessages.clear();
	sessionSequenceCounters.clear();
	sessionIdCounter = 1;
	messageIdCounter = 1;
}

/**
 * Initialize with some sample data
 */
export function initializeSamplePlaygroundData(workflowId: string): void {
	// Create a sample session with some messages
	const session = createSession(workflowId, 'Sample Session');

	// Add user message (will get sequenceNumber 1)
	const userMessage = addMessage(session.id, 'user', 'Hello, can you help me test this workflow?');

	// Add responses with parentMessageId linking to user message
	addMessage(session.id, 'log', 'Starting workflow execution...', {
		level: 'info',
		nodeId: 'node-start',
		nodeLabel: 'Start',
		parentMessageId: userMessage?.id
	});
	addMessage(
		session.id,
		'assistant',
		"Hello! I'm ready to help you test the workflow. What would you like to do?",
		{
			nodeId: 'node-output',
			nodeLabel: 'Output',
			duration: 1500,
			parentMessageId: userMessage?.id
		}
	);

	updateSessionStatus(session.id, 'completed');
}
