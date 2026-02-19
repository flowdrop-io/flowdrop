/**
 * Mock data for Interrupt API endpoints
 *
 * Provides mock interrupts for testing Human-in-the-Loop functionality.
 */

import type {
	Interrupt,
	ConfirmationConfig,
	ChoiceConfig,
	TextConfig,
	FormConfig
} from '../../lib/types/interrupt.js';

/**
 * Mock interrupts storage (interruptId -> interrupt)
 */
const mockInterrupts: Map<string, Interrupt> = new Map();

/**
 * Session to interrupts mapping
 */
const sessionInterrupts: Map<string, string[]> = new Map();

/**
 * Pipeline to interrupts mapping
 */
const pipelineInterrupts: Map<string, string[]> = new Map();

/**
 * Interrupt ID counter
 */
let interruptIdCounter = 1;

/**
 * Generate a unique interrupt ID
 */
function generateInterruptId(): string {
	return `int-${interruptIdCounter++}-${Date.now().toString(36)}`;
}

/**
 * Create a confirmation interrupt
 */
export function createConfirmationInterrupt(
	sessionId: string,
	messageId: string,
	nodeId: string,
	executionId: string,
	config: ConfirmationConfig,
	allowCancel: boolean = true
): Interrupt {
	const interrupt: Interrupt = {
		id: generateInterruptId(),
		messageId,
		type: 'confirmation',
		config,
		nodeId,
		executionId,
		sessionId,
		status: 'pending',
		allowCancel,
		createdAt: new Date().toISOString(),
		message: config.message
	};

	mockInterrupts.set(interrupt.id, interrupt);
	addInterruptToSession(sessionId, interrupt.id);

	return interrupt;
}

/**
 * Create a choice interrupt
 */
export function createChoiceInterrupt(
	sessionId: string,
	messageId: string,
	nodeId: string,
	executionId: string,
	config: ChoiceConfig,
	allowCancel: boolean = true
): Interrupt {
	const interrupt: Interrupt = {
		id: generateInterruptId(),
		messageId,
		type: 'choice',
		config,
		nodeId,
		executionId,
		sessionId,
		status: 'pending',
		allowCancel,
		createdAt: new Date().toISOString(),
		message: config.message
	};

	mockInterrupts.set(interrupt.id, interrupt);
	addInterruptToSession(sessionId, interrupt.id);

	return interrupt;
}

/**
 * Create a text input interrupt
 */
export function createTextInterrupt(
	sessionId: string,
	messageId: string,
	nodeId: string,
	executionId: string,
	config: TextConfig,
	allowCancel: boolean = true
): Interrupt {
	const interrupt: Interrupt = {
		id: generateInterruptId(),
		messageId,
		type: 'text',
		config,
		nodeId,
		executionId,
		sessionId,
		status: 'pending',
		allowCancel,
		createdAt: new Date().toISOString(),
		message: config.message
	};

	mockInterrupts.set(interrupt.id, interrupt);
	addInterruptToSession(sessionId, interrupt.id);

	return interrupt;
}

/**
 * Create a form interrupt
 */
export function createFormInterrupt(
	sessionId: string,
	messageId: string,
	nodeId: string,
	executionId: string,
	config: FormConfig,
	allowCancel: boolean = true
): Interrupt {
	const interrupt: Interrupt = {
		id: generateInterruptId(),
		messageId,
		type: 'form',
		config,
		nodeId,
		executionId,
		sessionId,
		status: 'pending',
		allowCancel,
		createdAt: new Date().toISOString(),
		message: config.message
	};

	mockInterrupts.set(interrupt.id, interrupt);
	addInterruptToSession(sessionId, interrupt.id);

	return interrupt;
}

/**
 * Add an interrupt to a session's list
 */
function addInterruptToSession(sessionId: string, interruptId: string): void {
	const interrupts = sessionInterrupts.get(sessionId) || [];
	interrupts.push(interruptId);
	sessionInterrupts.set(sessionId, interrupts);
}

/**
 * Add an interrupt to a pipeline's list
 */
export function addInterruptToPipeline(pipelineId: string, interruptId: string): void {
	const interrupts = pipelineInterrupts.get(pipelineId) || [];
	interrupts.push(interruptId);
	pipelineInterrupts.set(pipelineId, interrupts);
}

/**
 * Get an interrupt by ID
 */
export function getInterruptById(interruptId: string): Interrupt | undefined {
	return mockInterrupts.get(interruptId);
}

/**
 * Resolve an interrupt
 */
export function resolveInterrupt(interruptId: string, value: unknown): Interrupt | undefined {
	const interrupt = mockInterrupts.get(interruptId);
	if (!interrupt) {
		return undefined;
	}

	if (interrupt.status !== 'pending') {
		return undefined;
	}

	interrupt.status = 'resolved';
	interrupt.responseValue = value;
	interrupt.resolvedAt = new Date().toISOString();

	mockInterrupts.set(interruptId, interrupt);
	return interrupt;
}

/**
 * Cancel an interrupt
 */
export function cancelInterrupt(interruptId: string): boolean {
	const interrupt = mockInterrupts.get(interruptId);
	if (!interrupt) {
		return false;
	}

	if (interrupt.status !== 'pending') {
		return false;
	}

	if (!interrupt.allowCancel) {
		return false;
	}

	interrupt.status = 'cancelled';
	interrupt.resolvedAt = new Date().toISOString();

	mockInterrupts.set(interruptId, interrupt);
	return true;
}

/**
 * Get interrupts for a session
 */
export function getSessionInterrupts(
	sessionId: string,
	status?: 'pending' | 'resolved' | 'cancelled',
	limit: number = 50,
	offset: number = 0
): Interrupt[] {
	const interruptIds = sessionInterrupts.get(sessionId) || [];
	let interrupts = interruptIds
		.map((id) => mockInterrupts.get(id))
		.filter((i): i is Interrupt => i !== undefined);

	if (status) {
		interrupts = interrupts.filter((i) => i.status === status);
	}

	return interrupts.slice(offset, offset + limit);
}

/**
 * Get interrupts for a pipeline
 */
export function getPipelineInterrupts(
	pipelineId: string,
	status?: 'pending' | 'resolved' | 'cancelled',
	limit: number = 50,
	offset: number = 0
): Interrupt[] {
	const interruptIds = pipelineInterrupts.get(pipelineId) || [];
	let interrupts = interruptIds
		.map((id) => mockInterrupts.get(id))
		.filter((i): i is Interrupt => i !== undefined);

	if (status) {
		interrupts = interrupts.filter((i) => i.status === status);
	}

	return interrupts.slice(offset, offset + limit);
}

/**
 * Reset all mock interrupt data
 */
export function resetInterruptData(): void {
	mockInterrupts.clear();
	sessionInterrupts.clear();
	pipelineInterrupts.clear();
	interruptIdCounter = 1;
}

/**
 * Sample interrupt configurations for testing
 */
export const sampleInterruptConfigs = {
	confirmation: {
		message: 'Do you approve sending this email to 150 recipients?',
		confirmLabel: 'Yes, send email',
		cancelLabel: 'No, cancel'
	} as ConfirmationConfig,

	choice: {
		message: 'Select the output format for the generated report:',
		options: [
			{ value: 'pdf', label: 'PDF Document', description: 'Best for printing and sharing' },
			{ value: 'xlsx', label: 'Excel Spreadsheet', description: 'Best for data analysis' },
			{ value: 'csv', label: 'CSV File', description: 'Best for importing into other tools' },
			{ value: 'json', label: 'JSON', description: 'Best for programmatic access' }
		],
		multiple: false
	} as ChoiceConfig,

	multipleChoice: {
		message: 'Select which notifications to enable:',
		options: [
			{ value: 'email', label: 'Email', description: 'Receive email notifications' },
			{ value: 'sms', label: 'SMS', description: 'Receive text messages' },
			{ value: 'push', label: 'Push Notifications', description: 'Receive browser notifications' },
			{ value: 'slack', label: 'Slack', description: 'Receive Slack messages' }
		],
		multiple: true,
		minSelections: 1,
		maxSelections: 3
	} as ChoiceConfig,

	text: {
		message: 'Please provide additional context for the AI to consider:',
		placeholder: 'Enter any relevant details...',
		multiline: true,
		minLength: 10,
		maxLength: 500
	} as TextConfig,

	form: {
		message: 'Please provide the required information to proceed:',
		schema: {
			type: 'object' as const,
			properties: {
				name: {
					type: 'string' as const,
					title: 'Full Name',
					description: 'Enter your full name'
				},
				email: {
					type: 'string' as const,
					title: 'Email Address',
					format: 'email' as const
				},
				priority: {
					type: 'string' as const,
					title: 'Priority Level',
					enum: ['low', 'medium', 'high', 'critical']
				},
				notes: {
					type: 'string' as const,
					title: 'Additional Notes',
					format: 'multiline' as const
				}
			},
			required: ['name', 'email', 'priority']
		},
		defaultValues: {
			priority: 'medium'
		}
	} as FormConfig
};
