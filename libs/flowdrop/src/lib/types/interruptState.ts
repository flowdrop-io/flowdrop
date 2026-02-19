/**
 * Interrupt State Machine
 *
 * Lightweight state machine pattern for interrupt handling.
 * Ensures valid state transitions and prevents deadlocks.
 *
 * State Diagram:
 * ```
 *                    ┌─────────────┐
 *                    │    idle     │
 *                    └──────┬──────┘
 *                           │
 *            ┌──────────────┼──────────────┐
 *            │ submit       │ cancel       │
 *            ▼              │              ▼
 *     ┌─────────────┐       │       ┌─────────────┐
 *     │ submitting  │       │       │  cancelled  │
 *     └──────┬──────┘       │       └─────────────┘
 *            │              │
 *     ┌──────┴──────┐       │
 *     │             │       │
 *     ▼ success     ▼ fail  │
 * ┌─────────┐  ┌─────────┐  │
 * │resolved │  │  error  │──┘ cancel
 * └─────────┘  └────┬────┘
 *                   │ retry
 *                   ▼
 *              ┌─────────────┐
 *              │ submitting  │
 *              └─────────────┘
 * ```
 *
 * @module types/interruptState
 */

// =========================================================================
// State Types (Discriminated Union)
// =========================================================================

/**
 * Idle state - waiting for user action
 */
export interface IdleState {
	readonly status: 'idle';
}

/**
 * Submitting state - API call in progress
 */
export interface SubmittingState {
	readonly status: 'submitting';
	/** The value being submitted */
	readonly pendingValue: unknown;
	/** Whether this is a cancel operation */
	readonly isCancelAction: boolean;
}

/**
 * Resolved state - successfully completed
 */
export interface ResolvedState {
	readonly status: 'resolved';
	/** The submitted value */
	readonly value: unknown;
	/** Timestamp when resolved */
	readonly resolvedAt: string;
}

/**
 * Cancelled state - user cancelled
 */
export interface CancelledState {
	readonly status: 'cancelled';
	/** Timestamp when cancelled */
	readonly cancelledAt: string;
}

/**
 * Error state - submission failed, can retry
 */
export interface ErrorState {
	readonly status: 'error';
	/** The error message */
	readonly error: string;
	/** The value that failed to submit (for retry) */
	readonly failedValue?: unknown;
	/** Whether the failed action was a cancel */
	readonly wasCancelAction: boolean;
}

/**
 * Union of all possible interrupt states
 */
export type InterruptState =
	| IdleState
	| SubmittingState
	| ResolvedState
	| CancelledState
	| ErrorState;

// =========================================================================
// Action Types
// =========================================================================

/**
 * Submit action - user submits a value
 */
export interface SubmitAction {
	readonly type: 'SUBMIT';
	readonly value: unknown;
}

/**
 * Cancel action - user cancels the interrupt
 */
export interface CancelAction {
	readonly type: 'CANCEL';
}

/**
 * Success action - API call succeeded
 */
export interface SuccessAction {
	readonly type: 'SUCCESS';
}

/**
 * Failure action - API call failed
 */
export interface FailureAction {
	readonly type: 'FAILURE';
	readonly error: string;
}

/**
 * Retry action - retry after error
 */
export interface RetryAction {
	readonly type: 'RETRY';
}

/**
 * Reset action - reset to idle state
 */
export interface ResetAction {
	readonly type: 'RESET';
}

/**
 * Union of all possible actions
 */
export type InterruptAction =
	| SubmitAction
	| CancelAction
	| SuccessAction
	| FailureAction
	| RetryAction
	| ResetAction;

// =========================================================================
// State Machine
// =========================================================================

/**
 * Result of a state transition
 */
export interface TransitionResult {
	/** The new state after transition */
	state: InterruptState;
	/** Whether the transition was valid */
	valid: boolean;
	/** Error message if transition was invalid */
	error?: string;
}

/**
 * Initial idle state
 */
export const initialState: IdleState = { status: 'idle' };

/**
 * Transition function for the interrupt state machine
 *
 * @param state - Current state
 * @param action - Action to apply
 * @returns New state after transition
 *
 * @example
 * ```typescript
 * let state = initialState;
 *
 * // User submits
 * const result1 = transition(state, { type: "SUBMIT", value: true });
 * if (result1.valid) state = result1.state;
 *
 * // API succeeds
 * const result2 = transition(state, { type: "SUCCESS" });
 * if (result2.valid) state = result2.state;
 * ```
 */
export function transition(state: InterruptState, action: InterruptAction): TransitionResult {
	switch (state.status) {
		case 'idle':
			return transitionFromIdle(state, action);

		case 'submitting':
			return transitionFromSubmitting(state, action);

		case 'error':
			return transitionFromError(state, action);

		case 'resolved':
			return transitionFromResolved(state, action);

		case 'cancelled':
			return transitionFromCancelled(state, action);

		default:
			return {
				state,
				valid: false,
				error: `Unknown state: ${(state as InterruptState).status}`
			};
	}
}

/**
 * Transitions from idle state
 */
function transitionFromIdle(_state: IdleState, action: InterruptAction): TransitionResult {
	switch (action.type) {
		case 'SUBMIT':
			return {
				state: {
					status: 'submitting',
					pendingValue: action.value,
					isCancelAction: false
				},
				valid: true
			};

		case 'CANCEL':
			return {
				state: {
					status: 'submitting',
					pendingValue: undefined,
					isCancelAction: true
				},
				valid: true
			};

		case 'RESET':
			return { state: initialState, valid: true };

		default:
			return {
				state: _state,
				valid: false,
				error: `Cannot ${action.type} from idle state`
			};
	}
}

/**
 * Transitions from submitting state
 */
function transitionFromSubmitting(
	state: SubmittingState,
	action: InterruptAction
): TransitionResult {
	switch (action.type) {
		case 'SUCCESS':
			if (state.isCancelAction) {
				return {
					state: {
						status: 'cancelled',
						cancelledAt: new Date().toISOString()
					},
					valid: true
				};
			}
			return {
				state: {
					status: 'resolved',
					value: state.pendingValue,
					resolvedAt: new Date().toISOString()
				},
				valid: true
			};

		case 'FAILURE':
			return {
				state: {
					status: 'error',
					error: action.error,
					failedValue: state.pendingValue,
					wasCancelAction: state.isCancelAction
				},
				valid: true
			};

		case 'RESET':
			return { state: initialState, valid: true };

		// Prevent double-submit
		case 'SUBMIT':
		case 'CANCEL':
			return {
				state,
				valid: false,
				error: 'Cannot submit/cancel while already submitting'
			};

		default:
			return {
				state,
				valid: false,
				error: `Cannot ${action.type} from submitting state`
			};
	}
}

/**
 * Transitions from error state
 */
function transitionFromError(state: ErrorState, action: InterruptAction): TransitionResult {
	switch (action.type) {
		case 'RETRY':
			return {
				state: {
					status: 'submitting',
					pendingValue: state.failedValue,
					isCancelAction: state.wasCancelAction
				},
				valid: true
			};

		case 'SUBMIT':
			// Allow resubmitting with new value
			return {
				state: {
					status: 'submitting',
					pendingValue: action.value,
					isCancelAction: false
				},
				valid: true
			};

		case 'CANCEL':
			return {
				state: {
					status: 'submitting',
					pendingValue: undefined,
					isCancelAction: true
				},
				valid: true
			};

		case 'RESET':
			return { state: initialState, valid: true };

		default:
			return {
				state,
				valid: false,
				error: `Cannot ${action.type} from error state`
			};
	}
}

/**
 * Transitions from resolved state (terminal - only reset allowed)
 */
function transitionFromResolved(state: ResolvedState, action: InterruptAction): TransitionResult {
	if (action.type === 'RESET') {
		return { state: initialState, valid: true };
	}

	return {
		state,
		valid: false,
		error: `Cannot ${action.type} from resolved state - interrupt already completed`
	};
}

/**
 * Transitions from cancelled state (terminal - only reset allowed)
 */
function transitionFromCancelled(state: CancelledState, action: InterruptAction): TransitionResult {
	if (action.type === 'RESET') {
		return { state: initialState, valid: true };
	}

	return {
		state,
		valid: false,
		error: `Cannot ${action.type} from cancelled state - interrupt already cancelled`
	};
}

// =========================================================================
// Helper Functions
// =========================================================================

/**
 * Check if the interrupt is in a terminal state (resolved or cancelled)
 *
 * @param state - The interrupt state
 * @returns True if the interrupt is finished
 */
export function isTerminalState(state: InterruptState): boolean {
	return state.status === 'resolved' || state.status === 'cancelled';
}

/**
 * Check if the interrupt is currently submitting
 *
 * @param state - The interrupt state
 * @returns True if submitting
 */
export function isSubmitting(state: InterruptState): boolean {
	return state.status === 'submitting';
}

/**
 * Check if the interrupt has an error
 *
 * @param state - The interrupt state
 * @returns True if in error state
 */
export function hasError(state: InterruptState): boolean {
	return state.status === 'error';
}

/**
 * Check if the interrupt can accept user input
 *
 * @param state - The interrupt state
 * @returns True if idle or error (can submit)
 */
export function canSubmit(state: InterruptState): boolean {
	return state.status === 'idle' || state.status === 'error';
}

/**
 * Get the error message if in error state
 *
 * @param state - The interrupt state
 * @returns Error message or undefined
 */
export function getErrorMessage(state: InterruptState): string | undefined {
	return state.status === 'error' ? state.error : undefined;
}

/**
 * Get the resolved value if in resolved state
 *
 * @param state - The interrupt state
 * @returns Resolved value or undefined
 */
export function getResolvedValue(state: InterruptState): unknown {
	return state.status === 'resolved' ? state.value : undefined;
}

/**
 * Map InterruptState status to legacy InterruptStatus for backward compatibility
 *
 * @param state - The interrupt state
 * @returns Legacy status string
 */
export function toLegacyStatus(
	state: InterruptState
): 'pending' | 'resolved' | 'cancelled' | 'expired' {
	switch (state.status) {
		case 'idle':
		case 'submitting':
		case 'error':
			return 'pending';
		case 'resolved':
			return 'resolved';
		case 'cancelled':
			return 'cancelled';
		default:
			return 'pending';
	}
}
