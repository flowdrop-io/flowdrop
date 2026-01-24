/**
 * Interrupt Store
 *
 * Svelte stores for managing interrupt state including pending interrupts,
 * resolved interrupts, and their status.
 *
 * @module stores/interruptStore
 */

import { writable, derived, get } from "svelte/store";
import type { Interrupt, InterruptStatus } from "../types/interrupt.js";

// =========================================================================
// Core Stores
// =========================================================================

/**
 * Map of all interrupts by ID
 * Key: interrupt ID, Value: Interrupt object
 */
export const interrupts = writable<Map<string, Interrupt>>(new Map());

/**
 * Set of interrupt IDs currently being submitted
 * Used to show loading state on buttons
 */
export const submittingInterrupts = writable<Set<string>>(new Set());

/**
 * Error state for interrupt operations
 * Key: interrupt ID, Value: error message
 */
export const interruptErrors = writable<Map<string, string>>(new Map());

// =========================================================================
// Derived Stores
// =========================================================================

/**
 * Derived store for pending interrupt IDs
 */
export const pendingInterruptIds = derived(interrupts, ($interrupts): string[] => {
	const pending: string[] = [];
	$interrupts.forEach((interrupt, id) => {
		if (interrupt.status === "pending") {
			pending.push(id);
		}
	});
	return pending;
});

/**
 * Derived store for pending interrupts array
 */
export const pendingInterrupts = derived(interrupts, ($interrupts): Interrupt[] => {
	const pending: Interrupt[] = [];
	$interrupts.forEach((interrupt) => {
		if (interrupt.status === "pending") {
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
export const resolvedInterrupts = derived(interrupts, ($interrupts): Interrupt[] => {
	const resolved: Interrupt[] = [];
	$interrupts.forEach((interrupt) => {
		if (interrupt.status === "resolved") {
			resolved.push(interrupt);
		}
	});
	return resolved;
});

/**
 * Derived store to check if any interrupt is currently submitting
 */
export const isAnySubmitting = derived(
	submittingInterrupts,
	($submitting) => $submitting.size > 0
);

// =========================================================================
// Actions
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
			updated.set(interrupt.id, interrupt);
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
				updated.set(interrupt.id, interrupt);
			});
			return updated;
		});
	},

	/**
	 * Update an interrupt's status
	 *
	 * @param interruptId - The interrupt ID
	 * @param status - The new status
	 * @param responseValue - Optional response value (for resolved status)
	 */
	updateStatus: (
		interruptId: string,
		status: InterruptStatus,
		responseValue?: unknown
	): void => {
		interrupts.update(($interrupts) => {
			const interrupt = $interrupts.get(interruptId);
			if (!interrupt) return $interrupts;

			const updated = new Map($interrupts);
			updated.set(interruptId, {
				...interrupt,
				status,
				responseValue: responseValue ?? interrupt.responseValue,
				resolvedAt: status === "resolved" || status === "cancelled" 
					? new Date().toISOString() 
					: interrupt.resolvedAt
			});
			return updated;
		});
	},

	/**
	 * Mark an interrupt as resolved with the user's response
	 *
	 * @param interruptId - The interrupt ID
	 * @param value - The user's response value
	 */
	resolveInterrupt: (interruptId: string, value: unknown): void => {
		interruptActions.updateStatus(interruptId, "resolved", value);
		// Clear any error for this interrupt
		interruptErrors.update(($errors) => {
			const updated = new Map($errors);
			updated.delete(interruptId);
			return updated;
		});
	},

	/**
	 * Mark an interrupt as cancelled
	 *
	 * @param interruptId - The interrupt ID
	 */
	cancelInterrupt: (interruptId: string): void => {
		interruptActions.updateStatus(interruptId, "cancelled");
		// Clear any error for this interrupt
		interruptErrors.update(($errors) => {
			const updated = new Map($errors);
			updated.delete(interruptId);
			return updated;
		});
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
		// Also clear submitting and error state
		submittingInterrupts.update(($submitting) => {
			const updated = new Set($submitting);
			updated.delete(interruptId);
			return updated;
		});
		interruptErrors.update(($errors) => {
			const updated = new Map($errors);
			updated.delete(interruptId);
			return updated;
		});
	},

	/**
	 * Set submitting state for an interrupt
	 *
	 * @param interruptId - The interrupt ID
	 * @param isSubmitting - Whether the interrupt is being submitted
	 */
	setSubmitting: (interruptId: string, isSubmitting: boolean): void => {
		submittingInterrupts.update(($submitting) => {
			const updated = new Set($submitting);
			if (isSubmitting) {
				updated.add(interruptId);
			} else {
				updated.delete(interruptId);
			}
			return updated;
		});
	},

	/**
	 * Set error for an interrupt
	 *
	 * @param interruptId - The interrupt ID
	 * @param error - The error message, or null to clear
	 */
	setError: (interruptId: string, error: string | null): void => {
		interruptErrors.update(($errors) => {
			const updated = new Map($errors);
			if (error) {
				updated.set(interruptId, error);
			} else {
				updated.delete(interruptId);
			}
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
	 * Reset all interrupt state
	 */
	reset: (): void => {
		interrupts.set(new Map());
		submittingInterrupts.set(new Set());
		interruptErrors.set(new Map());
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
export function getInterrupt(interruptId: string): Interrupt | undefined {
	return get(interrupts).get(interruptId);
}

/**
 * Check if an interrupt is pending
 *
 * @param interruptId - The interrupt ID
 * @returns True if the interrupt exists and is pending
 */
export function isInterruptPending(interruptId: string): boolean {
	const interrupt = get(interrupts).get(interruptId);
	return interrupt?.status === "pending";
}

/**
 * Check if an interrupt is currently submitting
 *
 * @param interruptId - The interrupt ID
 * @returns True if the interrupt is being submitted
 */
export function isInterruptSubmitting(interruptId: string): boolean {
	return get(submittingInterrupts).has(interruptId);
}

/**
 * Get the error for an interrupt
 *
 * @param interruptId - The interrupt ID
 * @returns The error message or undefined
 */
export function getInterruptError(interruptId: string): string | undefined {
	return get(interruptErrors).get(interruptId);
}

/**
 * Get an interrupt by its associated message ID
 *
 * @param messageId - The message ID
 * @returns The interrupt or undefined
 */
export function getInterruptByMessageId(messageId: string): Interrupt | undefined {
	const interruptMap = get(interrupts);
	for (const interrupt of interruptMap.values()) {
		if (interrupt.messageId === messageId) {
			return interrupt;
		}
	}
	return undefined;
}
