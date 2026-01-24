/**
 * Interrupt Store
 *
 * Svelte stores for managing interrupt state using a lightweight state machine.
 * Ensures valid state transitions and prevents deadlocks.
 *
 * @module stores/interruptStore
 */

import { writable, derived, get } from "svelte/store";
import type { Interrupt, InterruptStatus } from "../types/interrupt.js";
import {
	type InterruptState,
	type InterruptAction,
	type TransitionResult,
	initialState,
	transition,
	isTerminalState,
	isSubmitting as checkIsSubmitting,
	hasError as checkHasError,
	getErrorMessage,
	getResolvedValue,
	toLegacyStatus
} from "../types/interruptState.js";

// =========================================================================
// Types
// =========================================================================

/**
 * Extended interrupt with state machine
 */
export interface InterruptWithState extends Interrupt {
	/** State machine state for UI interaction tracking */
	machineState: InterruptState;
}

// =========================================================================
// Core Stores
// =========================================================================

/**
 * Map of all interrupts by ID
 * Key: interrupt ID, Value: Interrupt object with state
 */
export const interrupts = writable<Map<string, InterruptWithState>>(new Map());

// =========================================================================
// Derived Stores
// =========================================================================

/**
 * Derived store for pending interrupt IDs
 */
export const pendingInterruptIds = derived(interrupts, ($interrupts): string[] => {
	const pending: string[] = [];
	$interrupts.forEach((interrupt, id) => {
		if (!isTerminalState(interrupt.machineState)) {
			pending.push(id);
		}
	});
	return pending;
});

/**
 * Derived store for pending interrupts array
 */
export const pendingInterrupts = derived(interrupts, ($interrupts): InterruptWithState[] => {
	const pending: InterruptWithState[] = [];
	$interrupts.forEach((interrupt) => {
		if (!isTerminalState(interrupt.machineState)) {
			pending.push(interrupt);
		}
	});
	return pending;
});

/**
 * Derived store for count of pending interrupts
 */
export const pendingInterruptCount = derived(
	pendingInterruptIds,
	($pendingIds) => $pendingIds.length
);

/**
 * Derived store for resolved interrupts
 */
export const resolvedInterrupts = derived(interrupts, ($interrupts): InterruptWithState[] => {
	const resolved: InterruptWithState[] = [];
	$interrupts.forEach((interrupt) => {
		if (interrupt.machineState.status === "resolved") {
			resolved.push(interrupt);
		}
	});
	return resolved;
});

/**
 * Derived store to check if any interrupt is currently submitting
 */
export const isAnySubmitting = derived(interrupts, ($interrupts): boolean => {
	for (const interrupt of $interrupts.values()) {
		if (checkIsSubmitting(interrupt.machineState)) {
			return true;
		}
	}
	return false;
});

/**
 * Legacy derived store for submitting interrupt IDs
 * @deprecated Use interrupt.machineState.status === "submitting" instead
 */
export const submittingInterrupts = derived(interrupts, ($interrupts): Set<string> => {
	const submitting = new Set<string>();
	$interrupts.forEach((interrupt, id) => {
		if (checkIsSubmitting(interrupt.machineState)) {
			submitting.add(id);
		}
	});
	return submitting;
});

/**
 * Legacy derived store for interrupt errors
 * @deprecated Use interrupt.machineState.error instead
 */
export const interruptErrors = derived(interrupts, ($interrupts): Map<string, string> => {
	const errors = new Map<string, string>();
	$interrupts.forEach((interrupt, id) => {
		const errorMsg = getErrorMessage(interrupt.machineState);
		if (errorMsg) {
			errors.set(id, errorMsg);
		}
	});
	return errors;
});

// =========================================================================
// State Machine Actions
// =========================================================================

/**
 * Apply a state machine action to an interrupt
 *
 * @param interruptId - The interrupt ID
 * @param action - The action to apply
 * @returns Transition result with validity and any errors
 */
function applyAction(interruptId: string, action: InterruptAction): TransitionResult {
	const currentInterrupts = get(interrupts);
	const interrupt = currentInterrupts.get(interruptId);

	if (!interrupt) {
		return {
			state: initialState,
			valid: false,
			error: `Interrupt not found: ${interruptId}`
		};
	}

	const result = transition(interrupt.machineState, action);

	if (result.valid) {
		interrupts.update(($interrupts) => {
			const updated = new Map($interrupts);
			const current = updated.get(interruptId);
			if (current) {
				// Update machine state and sync legacy fields
				const newInterrupt: InterruptWithState = {
					...current,
					machineState: result.state,
					status: toLegacyStatus(result.state),
					responseValue: getResolvedValue(result.state) ?? current.responseValue,
					resolvedAt: result.state.status === "resolved"
						? (result.state as { resolvedAt: string }).resolvedAt
						: result.state.status === "cancelled"
							? (result.state as { cancelledAt: string }).cancelledAt
							: current.resolvedAt
				};
				updated.set(interruptId, newInterrupt);
			}
			return updated;
		});
	} else {
		console.warn(`[InterruptStore] Invalid transition: ${result.error}`);
	}

	return result;
}

// =========================================================================
// Public Actions
// =========================================================================

/**
 * Interrupt store actions for modifying state
 */
export const interruptActions = {
	/**
	 * Add or update an interrupt in the store
	 *
	 * @param interrupt - The interrupt to add or update
	 */
	addInterrupt: (interrupt: Interrupt): void => {
		interrupts.update(($interrupts) => {
			const updated = new Map($interrupts);
			const existing = updated.get(interrupt.id);

			// Preserve existing machine state if interrupt already exists
			const machineState = existing?.machineState ?? initialState;

			const interruptWithState: InterruptWithState = {
				...interrupt,
				machineState
			};

			updated.set(interrupt.id, interruptWithState);
			return updated;
		});
	},

	/**
	 * Add multiple interrupts to the store
	 *
	 * @param interruptList - Array of interrupts to add
	 */
	addInterrupts: (interruptList: Interrupt[]): void => {
		if (interruptList.length === 0) return;

		interrupts.update(($interrupts) => {
			const updated = new Map($interrupts);
			interruptList.forEach((interrupt) => {
				const existing = updated.get(interrupt.id);
				const machineState = existing?.machineState ?? initialState;

				const interruptWithState: InterruptWithState = {
					...interrupt,
					machineState
				};

				updated.set(interrupt.id, interruptWithState);
			});
			return updated;
		});
	},

	/**
	 * Start submitting an interrupt (user clicked submit)
	 *
	 * @param interruptId - The interrupt ID
	 * @param value - The value being submitted
	 * @returns Transition result
	 */
	startSubmit: (interruptId: string, value: unknown): TransitionResult => {
		return applyAction(interruptId, { type: "SUBMIT", value });
	},

	/**
	 * Start cancelling an interrupt (user clicked cancel)
	 *
	 * @param interruptId - The interrupt ID
	 * @returns Transition result
	 */
	startCancel: (interruptId: string): TransitionResult => {
		return applyAction(interruptId, { type: "CANCEL" });
	},

	/**
	 * Mark submission as successful
	 *
	 * @param interruptId - The interrupt ID
	 * @returns Transition result
	 */
	submitSuccess: (interruptId: string): TransitionResult => {
		return applyAction(interruptId, { type: "SUCCESS" });
	},

	/**
	 * Mark submission as failed
	 *
	 * @param interruptId - The interrupt ID
	 * @param error - Error message
	 * @returns Transition result
	 */
	submitFailure: (interruptId: string, error: string): TransitionResult => {
		return applyAction(interruptId, { type: "FAILURE", error });
	},

	/**
	 * Retry a failed submission
	 *
	 * @param interruptId - The interrupt ID
	 * @returns Transition result
	 */
	retry: (interruptId: string): TransitionResult => {
		return applyAction(interruptId, { type: "RETRY" });
	},

	/**
	 * Reset an interrupt to idle state
	 *
	 * @param interruptId - The interrupt ID
	 * @returns Transition result
	 */
	resetInterrupt: (interruptId: string): TransitionResult => {
		return applyAction(interruptId, { type: "RESET" });
	},

	// =========================================================================
	// Legacy Actions (for backward compatibility)
	// =========================================================================

	/**
	 * Update an interrupt's status (legacy)
	 * @deprecated Use startSubmit/submitSuccess/submitFailure instead
	 */
	updateStatus: (
		interruptId: string,
		status: InterruptStatus,
		responseValue?: unknown
	): void => {
		// Map legacy status to state machine actions
		if (status === "resolved" && responseValue !== undefined) {
			const submitResult = applyAction(interruptId, { type: "SUBMIT", value: responseValue });
			if (submitResult.valid) {
				applyAction(interruptId, { type: "SUCCESS" });
			}
		} else if (status === "cancelled") {
			const cancelResult = applyAction(interruptId, { type: "CANCEL" });
			if (cancelResult.valid) {
				applyAction(interruptId, { type: "SUCCESS" });
			}
		}
	},

	/**
	 * Mark an interrupt as resolved with the user's response (legacy)
	 * @deprecated Use startSubmit + submitSuccess instead
	 */
	resolveInterrupt: (interruptId: string, value: unknown): void => {
		// For backward compatibility, immediately resolve
		// (assumes sync operation or already completed API call)
		const submitResult = applyAction(interruptId, { type: "SUBMIT", value });
		if (submitResult.valid) {
			applyAction(interruptId, { type: "SUCCESS" });
		}
	},

	/**
	 * Mark an interrupt as cancelled (legacy)
	 * @deprecated Use startCancel + submitSuccess instead
	 */
	cancelInterrupt: (interruptId: string): void => {
		const cancelResult = applyAction(interruptId, { type: "CANCEL" });
		if (cancelResult.valid) {
			applyAction(interruptId, { type: "SUCCESS" });
		}
	},

	/**
	 * Set submitting state for an interrupt (legacy)
	 * @deprecated State is automatically managed by startSubmit/submitSuccess
	 */
	setSubmitting: (interruptId: string, isSubmitting: boolean): void => {
		// This is now a no-op - state is managed by the state machine
		// Kept for backward compatibility
		if (isSubmitting) {
			console.warn("[InterruptStore] setSubmitting(true) is deprecated. Use startSubmit() instead.");
		}
	},

	/**
	 * Set error for an interrupt (legacy)
	 * @deprecated Use submitFailure() instead
	 */
	setError: (interruptId: string, error: string | null): void => {
		if (error) {
			applyAction(interruptId, { type: "FAILURE", error });
		}
		// Clearing error is not directly supported - use retry or reset
	},

	/**
	 * Remove an interrupt from the store
	 *
	 * @param interruptId - The interrupt ID to remove
	 */
	removeInterrupt: (interruptId: string): void => {
		interrupts.update(($interrupts) => {
			const updated = new Map($interrupts);
			updated.delete(interruptId);
			return updated;
		});
	},

	/**
	 * Clear all interrupts for a specific session
	 *
	 * @param sessionId - The session ID to clear interrupts for
	 */
	clearSessionInterrupts: (sessionId: string): void => {
		interrupts.update(($interrupts) => {
			const updated = new Map($interrupts);
			$interrupts.forEach((interrupt, id) => {
				if (interrupt.sessionId === sessionId) {
					updated.delete(id);
				}
			});
			return updated;
		});
	},

	/**
	 * Alias for clearSessionInterrupts
	 */
	clearInterrupts: (): void => {
		interrupts.set(new Map());
	},

	/**
	 * Reset all interrupt state
	 */
	reset: (): void => {
		interrupts.set(new Map());
	}
};

// =========================================================================
// Utilities
// =========================================================================

/**
 * Get an interrupt by ID
 *
 * @param interruptId - The interrupt ID
 * @returns The interrupt or undefined
 */
export function getInterrupt(interruptId: string): InterruptWithState | undefined {
	return get(interrupts).get(interruptId);
}

/**
 * Check if an interrupt is pending (not resolved or cancelled)
 *
 * @param interruptId - The interrupt ID
 * @returns True if the interrupt exists and is pending
 */
export function isInterruptPending(interruptId: string): boolean {
	const interrupt = get(interrupts).get(interruptId);
	return interrupt ? !isTerminalState(interrupt.machineState) : false;
}

/**
 * Check if an interrupt is currently submitting
 *
 * @param interruptId - The interrupt ID
 * @returns True if the interrupt is being submitted
 */
export function isInterruptSubmitting(interruptId: string): boolean {
	const interrupt = get(interrupts).get(interruptId);
	return interrupt ? checkIsSubmitting(interrupt.machineState) : false;
}

/**
 * Get the error for an interrupt
 *
 * @param interruptId - The interrupt ID
 * @returns The error message or undefined
 */
export function getInterruptError(interruptId: string): string | undefined {
	const interrupt = get(interrupts).get(interruptId);
	return interrupt ? getErrorMessage(interrupt.machineState) : undefined;
}

/**
 * Get an interrupt by its associated message ID
 *
 * @param messageId - The message ID
 * @returns The interrupt or undefined
 */
export function getInterruptByMessageId(messageId: string): InterruptWithState | undefined {
	const interruptMap = get(interrupts);
	for (const interrupt of interruptMap.values()) {
		if (interrupt.messageId === messageId) {
			return interrupt;
		}
	}
	return undefined;
}

/**
 * Check if an interrupt has an error
 *
 * @param interruptId - The interrupt ID
 * @returns True if the interrupt has an error
 */
export function interruptHasError(interruptId: string): boolean {
	const interrupt = get(interrupts).get(interruptId);
	return interrupt ? checkHasError(interrupt.machineState) : false;
}
