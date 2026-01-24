/**
 * Interrupt Types for Human-in-the-Loop (HITL) Support
 *
 * TypeScript types for workflow interrupts that pause execution
 * and request user input before continuing.
 *
 * @module types/interrupt
 */

import type { ConfigSchema } from "./index.js";

// Re-export state machine types for convenience
export type {
	InterruptState,
	IdleState,
	SubmittingState,
	ResolvedState,
	CancelledState,
	ErrorState,
	InterruptAction,
	SubmitAction,
	CancelAction,
	SuccessAction,
	FailureAction,
	RetryAction,
	ResetAction,
	TransitionResult
} from "./interruptState.js";

export {
	initialState,
	transition,
	isTerminalState,
	isSubmitting,
	hasError,
	canSubmit,
	getErrorMessage,
	getResolvedValue,
	toLegacyStatus
} from "./interruptState.js";

/**
 * Types of interrupts supported by the system
 *
 * - `confirmation`: Simple Yes/No prompt
 * - `choice`: Single or multiple option selection
 * - `text`: Free-form text input
 * - `form`: JSON Schema-based form
 */
export type InterruptType = "confirmation" | "choice" | "text" | "form";

/**
 * Status of an interrupt request
 *
 * - `pending`: Awaiting user response
 * - `resolved`: User has provided a response
 * - `cancelled`: User or system cancelled the interrupt
 * - `expired`: Interrupt timed out without response
 */
export type InterruptStatus = "pending" | "resolved" | "cancelled" | "expired";

/**
 * Choice option for choice-type interrupts
 *
 * @example
 * ```typescript
 * const option: InterruptChoice = {
 *   value: "high",
 *   label: "High Priority",
 *   description: "Process immediately"
 * };
 * ```
 */
export interface InterruptChoice {
	/** Unique value identifier for this option */
	value: string;
	/** Display label for the option */
	label: string;
	/** Optional description providing more context */
	description?: string;
}

/**
 * Configuration for confirmation-type interrupts
 */
export interface ConfirmationConfig {
	/** The confirmation message/question to display */
	message: string;
	/** Label for the confirm/yes button */
	confirmLabel?: string;
	/** Label for the cancel/no button */
	cancelLabel?: string;
}

/**
 * Configuration for choice-type interrupts
 */
export interface ChoiceConfig {
	/** The prompt message to display */
	message: string;
	/** Available options to choose from */
	options: InterruptChoice[];
	/** Whether multiple selections are allowed */
	multiple?: boolean;
	/** Minimum number of selections required (for multiple mode) */
	minSelections?: number;
	/** Maximum number of selections allowed (for multiple mode) */
	maxSelections?: number;
}

/**
 * Configuration for text-type interrupts
 */
export interface TextConfig {
	/** The prompt message to display */
	message: string;
	/** Placeholder text for the input field */
	placeholder?: string;
	/** Whether to show a multiline text area */
	multiline?: boolean;
	/** Minimum text length required */
	minLength?: number;
	/** Maximum text length allowed */
	maxLength?: number;
	/** Default value to pre-fill */
	defaultValue?: string;
}

/**
 * Configuration for form-type interrupts
 */
export interface FormConfig {
	/** The prompt message to display */
	message: string;
	/** JSON Schema defining the form fields */
	schema: ConfigSchema;
	/** Default values for form fields */
	defaultValues?: Record<string, unknown>;
}

/**
 * Union type for interrupt-specific configuration
 */
export type InterruptConfig = ConfirmationConfig | ChoiceConfig | TextConfig | FormConfig;

/**
 * Core interrupt data structure
 *
 * Represents a pending or resolved interrupt request from the workflow.
 * Includes a state machine for tracking the interaction state.
 *
 * @example
 * ```typescript
 * const interrupt: Interrupt = {
 *   id: "int-123",
 *   type: "confirmation",
 *   status: "pending",
 *   message: "Send email to John?",
 *   nodeId: "node-456",
 *   executionId: "exec-789",
 *   sessionId: "sess-abc",
 *   createdAt: "2024-01-20T10:00:00Z",
 *   allowCancel: true,
 *   config: {
 *     message: "Send email to John?",
 *     confirmLabel: "Send",
 *     cancelLabel: "Don't Send"
 *   },
 *   state: { status: "idle" }
 * };
 * ```
 */
export interface Interrupt {
	/** Unique identifier for the interrupt */
	id: string;
	/** Type of interrupt (confirmation, choice, text, form) */
	type: InterruptType;
	/**
	 * Current status of the interrupt (legacy field)
	 * @deprecated Use `state` for more detailed status tracking
	 */
	status: InterruptStatus;
	/** Primary message/prompt to display */
	message: string;
	/** ID of the node that triggered the interrupt */
	nodeId?: string;
	/** ID of the workflow execution */
	executionId?: string;
	/** ID of the playground session (if applicable) */
	sessionId?: string;
	/** ID of the pipeline (if applicable) */
	pipelineId?: string;
	/** ID of the associated message in the chat flow */
	messageId?: string;
	/** Timestamp when the interrupt was created (ISO 8601) */
	createdAt: string;
	/** Timestamp when the interrupt was resolved (ISO 8601) */
	resolvedAt?: string;
	/** Timestamp when the interrupt expires (ISO 8601) */
	expiresAt?: string;
	/** Whether the user can cancel/dismiss this interrupt */
	allowCancel: boolean;
	/** Type-specific configuration */
	config: InterruptConfig;
	/** The user's response value (when resolved) */
	responseValue?: unknown;
	/** Additional metadata from the backend */
	metadata?: Record<string, unknown>;
}

/**
 * Payload for resolving an interrupt
 *
 * @example
 * ```typescript
 * // Confirmation response
 * const resolution: InterruptResolution = {
 *   value: true // or false
 * };
 *
 * // Choice response (single)
 * const resolution: InterruptResolution = {
 *   value: "option_a"
 * };
 *
 * // Choice response (multiple)
 * const resolution: InterruptResolution = {
 *   value: ["option_a", "option_b"]
 * };
 *
 * // Text response
 * const resolution: InterruptResolution = {
 *   value: "User entered text"
 * };
 *
 * // Form response
 * const resolution: InterruptResolution = {
 *   value: { name: "John", email: "john@example.com" }
 * };
 * ```
 */
export interface InterruptResolution {
	/** The user's response value */
	value: unknown;
}

/**
 * API response for interrupt operations
 */
export interface InterruptApiResponse<T = Interrupt> {
	/** Whether the request was successful */
	success: boolean;
	/** Response data */
	data?: T;
	/** Error message if unsuccessful */
	error?: string;
	/** Human-readable message */
	message?: string;
}

/**
 * Response type for listing interrupts
 */
export type InterruptListResponse = InterruptApiResponse<Interrupt[]>;

/**
 * Response type for single interrupt operations
 */
export type InterruptResponse = InterruptApiResponse<Interrupt>;

/**
 * Message metadata structure for interrupt detection
 *
 * When a message contains this metadata type, it indicates
 * an interrupt request that should be rendered inline.
 */
export interface InterruptMessageMetadata {
	/** Indicates this is an interrupt request */
	type: "interrupt_request";
	/** The interrupt ID */
	interrupt_id: string;
	/** Type of interrupt */
	interrupt_type: InterruptType;
	/** JSON Schema for form-type interrupts */
	schema?: ConfigSchema;
	/** Options for choice-type interrupts */
	options?: InterruptChoice[];
	/** Default value for pre-filling */
	default_value?: unknown;
	/** Node ID that triggered the interrupt */
	node_id?: string;
	/** Execution ID */
	execution_id?: string;
	/** Whether cancel is allowed */
	allow_cancel?: boolean;
	/** Labels for confirmation type */
	confirm_label?: string;
	cancel_label?: string;
	/** Text input configuration */
	placeholder?: string;
	multiline?: boolean;
	min_length?: number;
	max_length?: number;
	/** Choice configuration */
	multiple?: boolean;
	min_selections?: number;
	max_selections?: number;
}

/**
 * Type guard to check if message metadata indicates an interrupt
 *
 * @param metadata - Message metadata to check
 * @returns True if the metadata indicates an interrupt request
 */
export function isInterruptMetadata(
	metadata: Record<string, unknown> | undefined
): boolean {
	return (
		metadata !== undefined &&
		metadata.type === "interrupt_request" &&
		typeof metadata.interrupt_id === "string"
	);
}

/**
 * Safely extract interrupt metadata from a generic record
 *
 * @param metadata - The metadata record to extract from
 * @returns The interrupt metadata if valid, or null
 */
export function extractInterruptMetadata(
	metadata: Record<string, unknown> | undefined
): InterruptMessageMetadata | null {
	if (!isInterruptMetadata(metadata)) {
		return null;
	}

	// Manually construct the typed object from the validated metadata
	return {
		type: "interrupt_request",
		interrupt_id: metadata.interrupt_id as string,
		interrupt_type: metadata.interrupt_type as InterruptType,
		schema: metadata.schema as ConfigSchema | undefined,
		options: metadata.options as InterruptChoice[] | undefined,
		default_value: metadata.default_value,
		node_id: metadata.node_id as string | undefined,
		execution_id: metadata.execution_id as string | undefined,
		allow_cancel: metadata.allow_cancel as boolean | undefined,
		confirm_label: metadata.confirm_label as string | undefined,
		cancel_label: metadata.cancel_label as string | undefined,
		placeholder: metadata.placeholder as string | undefined,
		multiline: metadata.multiline as boolean | undefined,
		min_length: metadata.min_length as number | undefined,
		max_length: metadata.max_length as number | undefined,
		multiple: metadata.multiple as boolean | undefined,
		min_selections: metadata.min_selections as number | undefined,
		max_selections: metadata.max_selections as number | undefined
	};
}

/**
 * Convert interrupt message metadata to a full Interrupt object
 *
 * @param metadata - The interrupt message metadata
 * @param messageId - The ID of the message containing the interrupt
 * @param content - The message content (used as the interrupt message)
 * @returns A fully populated Interrupt object
 */
export function metadataToInterrupt(
	metadata: InterruptMessageMetadata,
	messageId: string,
	content: string
): Interrupt {
	const baseInterrupt: Interrupt = {
		id: metadata.interrupt_id,
		type: metadata.interrupt_type,
		status: "pending",
		message: content,
		nodeId: metadata.node_id,
		executionId: metadata.execution_id,
		messageId,
		createdAt: new Date().toISOString(),
		allowCancel: metadata.allow_cancel ?? true,
		config: buildInterruptConfig(metadata, content)
	};

	return baseInterrupt;
}

/**
 * Build the type-specific config from message metadata
 *
 * @param metadata - The interrupt message metadata
 * @param message - The interrupt message content
 * @returns Type-specific interrupt configuration
 */
function buildInterruptConfig(
	metadata: InterruptMessageMetadata,
	message: string
): InterruptConfig {
	switch (metadata.interrupt_type) {
		case "confirmation":
			return {
				message,
				confirmLabel: metadata.confirm_label ?? "Yes",
				cancelLabel: metadata.cancel_label ?? "No"
			} as ConfirmationConfig;

		case "choice":
			return {
				message,
				options: metadata.options ?? [],
				multiple: metadata.multiple ?? false,
				minSelections: metadata.min_selections,
				maxSelections: metadata.max_selections
			} as ChoiceConfig;

		case "text":
			return {
				message,
				placeholder: metadata.placeholder,
				multiline: metadata.multiline ?? false,
				minLength: metadata.min_length,
				maxLength: metadata.max_length,
				defaultValue: metadata.default_value as string | undefined
			} as TextConfig;

		case "form":
			return {
				message,
				schema: metadata.schema ?? { type: "object", properties: {} },
				defaultValues: metadata.default_value as Record<string, unknown> | undefined
			} as FormConfig;

		default:
			return { message } as ConfirmationConfig;
	}
}

/**
 * Configuration options for interrupt polling
 */
export interface InterruptPollingConfig {
	/** Whether to enable dedicated interrupt polling */
	enabled: boolean;
	/** Polling interval in milliseconds */
	interval?: number;
	/** Maximum polling backoff interval in milliseconds */
	maxBackoff?: number;
}

/**
 * Default interrupt polling configuration
 */
export const defaultInterruptPollingConfig: InterruptPollingConfig = {
	enabled: false,
	interval: 2000,
	maxBackoff: 10000
};
