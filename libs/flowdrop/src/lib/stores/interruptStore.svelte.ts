/**
 * Interrupt Store (Svelte 5 Runes)
 *
 * Rune-based reactive state for managing interrupt state using a lightweight state machine.
 * Ensures valid state transitions and prevents deadlocks.
 *
 * The reactive state lives in the {@link InterruptStore} class — one per
 * FlowDrop instance, resolved in components via `getInstance().interrupts`. The
 * module-level functions and `interruptActions` at the bottom are
 * backward-compatible shims that delegate to the page-default instance.
 *
 * @module stores/interruptStore
 */

import { SvelteMap } from 'svelte/reactivity';
import type { Interrupt } from '../types/interrupt.js';
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
} from '../types/interruptState.js';
import { logger } from '../utils/logger.js';
import { getDefaultInstance } from './instanceContainer.svelte.js';

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

/**
 * Interrupt store actions for modifying state.
 */
export interface InterruptStoreActions {
  addInterrupt: (interrupt: Interrupt) => void;
  addInterrupts: (interruptList: Interrupt[]) => void;
  startSubmit: (interruptId: string, value: unknown) => TransitionResult;
  startCancel: (interruptId: string) => TransitionResult;
  submitSuccess: (interruptId: string) => TransitionResult;
  submitFailure: (interruptId: string, error: string) => TransitionResult;
  retry: (interruptId: string) => TransitionResult;
  resetInterrupt: (interruptId: string) => TransitionResult;
  resolveInterrupt: (interruptId: string, value: unknown) => void;
  cancelInterrupt: (interruptId: string) => void;
  removeInterrupt: (interruptId: string) => void;
  clearSessionInterrupts: (sessionId: string) => void;
  clearInterrupts: () => void;
  reset: () => void;
}

// =========================================================================
// InterruptStore (per-instance reactive state)
// =========================================================================

/**
 * Per-instance interrupt state, managed via a lightweight state machine.
 *
 * Reads go through getter methods backed by a {@link SvelteMap}, so reading
 * them inside a component template or `$derived` tracks reactively, exactly
 * like the legacy module-level functions did.
 */
export class InterruptStore {
  /**
   * Reactive map of all interrupts by ID.
   * Uses SvelteMap for deep reactivity with Svelte 5 runes.
   * Key: interrupt ID, Value: Interrupt object with state
   */
  readonly #interrupts: SvelteMap<string, InterruptWithState> = new SvelteMap<
    string,
    InterruptWithState
  >();

  /** Bound mutation facade — see {@link InterruptStoreActions}. */
  readonly actions: InterruptStoreActions;

  constructor() {
    this.actions = Object.freeze({
      addInterrupt: this.addInterrupt.bind(this),
      addInterrupts: this.addInterrupts.bind(this),
      startSubmit: this.startSubmit.bind(this),
      startCancel: this.startCancel.bind(this),
      submitSuccess: this.submitSuccess.bind(this),
      submitFailure: this.submitFailure.bind(this),
      retry: this.retry.bind(this),
      resetInterrupt: this.resetInterrupt.bind(this),
      resolveInterrupt: this.resolveInterrupt.bind(this),
      cancelInterrupt: this.cancelInterrupt.bind(this),
      removeInterrupt: this.removeInterrupt.bind(this),
      clearSessionInterrupts: this.clearSessionInterrupts.bind(this),
      clearInterrupts: this.clearInterrupts.bind(this),
      reset: this.reset.bind(this)
    });
  }

  // -----------------------------------------------------------------------
  // Reactive getters (replace derived stores)
  // -----------------------------------------------------------------------

  /**
   * Get the reactive interrupts map.
   * Use this in components within $derived() for reactivity.
   */
  getMap(): SvelteMap<string, InterruptWithState> {
    return this.#interrupts;
  }

  /**
   * Get pending interrupt IDs (interrupts not in a terminal state)
   */
  getPendingIds(): string[] {
    const pending: string[] = [];
    this.#interrupts.forEach((interrupt, id) => {
      if (!isTerminalState(interrupt.machineState)) {
        pending.push(id);
      }
    });
    return pending;
  }

  /**
   * Get pending interrupts array (interrupts not in a terminal state)
   */
  getPending(): InterruptWithState[] {
    const pending: InterruptWithState[] = [];
    this.#interrupts.forEach((interrupt) => {
      if (!isTerminalState(interrupt.machineState)) {
        pending.push(interrupt);
      }
    });
    return pending;
  }

  /**
   * Get count of pending interrupts
   */
  getPendingCount(): number {
    let count = 0;
    for (const interrupt of this.#interrupts.values()) {
      if (!isTerminalState(interrupt.machineState)) count++;
    }
    return count;
  }

  /**
   * Get resolved interrupts array
   */
  getResolved(): InterruptWithState[] {
    const resolved: InterruptWithState[] = [];
    this.#interrupts.forEach((interrupt) => {
      if (interrupt.machineState.status === 'resolved') {
        resolved.push(interrupt);
      }
    });
    return resolved;
  }

  /**
   * Check if any interrupt is currently submitting
   */
  getIsAnySubmitting(): boolean {
    for (const interrupt of this.#interrupts.values()) {
      if (checkIsSubmitting(interrupt.machineState)) {
        return true;
      }
    }
    return false;
  }

  // -----------------------------------------------------------------------
  // State machine internals
  // -----------------------------------------------------------------------

  /**
   * Apply a state machine action to an interrupt
   *
   * @param interruptId - The interrupt ID
   * @param action - The action to apply
   * @returns Transition result with validity and any errors
   */
  #applyAction(interruptId: string, action: InterruptAction): TransitionResult {
    const interrupt = this.#interrupts.get(interruptId);

    if (!interrupt) {
      return {
        state: initialState,
        valid: false,
        error: `Interrupt not found: ${interruptId}`
      };
    }

    const result = transition(interrupt.machineState, action);

    if (result.valid) {
      const current = this.#interrupts.get(interruptId);
      if (current) {
        // Update machine state and sync legacy fields
        const newInterrupt: InterruptWithState = {
          ...current,
          machineState: result.state,
          status: toLegacyStatus(result.state),
          responseValue: getResolvedValue(result.state) ?? current.responseValue,
          resolvedAt:
            result.state.status === 'resolved'
              ? (result.state as { resolvedAt: string }).resolvedAt
              : result.state.status === 'cancelled'
                ? (result.state as { cancelledAt: string }).cancelledAt
                : current.resolvedAt
        };
        this.#interrupts.set(interruptId, newInterrupt);
      }
    } else {
      logger.warn(`[InterruptStore] Invalid transition: ${result.error}`);
    }

    return result;
  }

  // -----------------------------------------------------------------------
  // Public actions
  // -----------------------------------------------------------------------

  /**
   * Add or update an interrupt in the store
   *
   * @param interrupt - The interrupt to add or update
   */
  addInterrupt(interrupt: Interrupt): void {
    const existing = this.#interrupts.get(interrupt.id);

    // Preserve existing machine state if interrupt already exists
    const machineState = existing?.machineState ?? initialState;

    const interruptWithState: InterruptWithState = {
      ...interrupt,
      machineState
    };

    this.#interrupts.set(interrupt.id, interruptWithState);
  }

  /**
   * Add multiple interrupts to the store
   *
   * @param interruptList - Array of interrupts to add
   */
  addInterrupts(interruptList: Interrupt[]): void {
    if (interruptList.length === 0) return;

    interruptList.forEach((interrupt) => {
      const existing = this.#interrupts.get(interrupt.id);
      const machineState = existing?.machineState ?? initialState;

      const interruptWithState: InterruptWithState = {
        ...interrupt,
        machineState
      };

      this.#interrupts.set(interrupt.id, interruptWithState);
    });
  }

  /**
   * Start submitting an interrupt (user clicked submit)
   *
   * @param interruptId - The interrupt ID
   * @param value - The value being submitted
   * @returns Transition result
   */
  startSubmit(interruptId: string, value: unknown): TransitionResult {
    return this.#applyAction(interruptId, { type: 'SUBMIT', value });
  }

  /**
   * Start cancelling an interrupt (user clicked cancel)
   *
   * @param interruptId - The interrupt ID
   * @returns Transition result
   */
  startCancel(interruptId: string): TransitionResult {
    return this.#applyAction(interruptId, { type: 'CANCEL' });
  }

  /**
   * Mark submission as successful
   *
   * @param interruptId - The interrupt ID
   * @returns Transition result
   */
  submitSuccess(interruptId: string): TransitionResult {
    return this.#applyAction(interruptId, { type: 'SUCCESS' });
  }

  /**
   * Mark submission as failed
   *
   * @param interruptId - The interrupt ID
   * @param error - Error message
   * @returns Transition result
   */
  submitFailure(interruptId: string, error: string): TransitionResult {
    return this.#applyAction(interruptId, { type: 'FAILURE', error });
  }

  /**
   * Retry a failed submission
   *
   * @param interruptId - The interrupt ID
   * @returns Transition result
   */
  retry(interruptId: string): TransitionResult {
    return this.#applyAction(interruptId, { type: 'RETRY' });
  }

  /**
   * Reset an interrupt to idle state
   *
   * @param interruptId - The interrupt ID
   * @returns Transition result
   */
  resetInterrupt(interruptId: string): TransitionResult {
    return this.#applyAction(interruptId, { type: 'RESET' });
  }

  /**
   * Mark an interrupt as resolved with the user's response
   *
   * @param interruptId - The interrupt ID
   * @param value - The resolved value
   */
  resolveInterrupt(interruptId: string, value: unknown): void {
    const submitResult = this.#applyAction(interruptId, { type: 'SUBMIT', value });
    if (submitResult.valid) {
      this.#applyAction(interruptId, { type: 'SUCCESS' });
    }
  }

  /**
   * Mark an interrupt as cancelled
   *
   * @param interruptId - The interrupt ID
   */
  cancelInterrupt(interruptId: string): void {
    const cancelResult = this.#applyAction(interruptId, { type: 'CANCEL' });
    if (cancelResult.valid) {
      this.#applyAction(interruptId, { type: 'SUCCESS' });
    }
  }

  /**
   * Remove an interrupt from the store
   *
   * @param interruptId - The interrupt ID to remove
   */
  removeInterrupt(interruptId: string): void {
    this.#interrupts.delete(interruptId);
  }

  /**
   * Clear all interrupts for a specific session
   *
   * @param sessionId - The session ID to clear interrupts for
   */
  clearSessionInterrupts(sessionId: string): void {
    const toDelete: string[] = [];
    this.#interrupts.forEach((interrupt, id) => {
      if (interrupt.sessionId === sessionId) {
        toDelete.push(id);
      }
    });
    toDelete.forEach((id) => this.#interrupts.delete(id));
  }

  /**
   * Alias for clearSessionInterrupts
   */
  clearInterrupts(): void {
    this.#interrupts.clear();
  }

  /**
   * Reset all interrupt state
   */
  reset(): void {
    this.#interrupts.clear();
  }

  // -----------------------------------------------------------------------
  // Utilities
  // -----------------------------------------------------------------------

  /**
   * Get an interrupt by ID
   *
   * @param interruptId - The interrupt ID
   * @returns The interrupt or undefined
   */
  getInterrupt(interruptId: string): InterruptWithState | undefined {
    return this.#interrupts.get(interruptId);
  }

  /**
   * Check if an interrupt is pending (not resolved or cancelled)
   *
   * @param interruptId - The interrupt ID
   * @returns True if the interrupt exists and is pending
   */
  isPending(interruptId: string): boolean {
    const interrupt = this.#interrupts.get(interruptId);
    return interrupt ? !isTerminalState(interrupt.machineState) : false;
  }

  /**
   * Check if an interrupt is currently submitting
   *
   * @param interruptId - The interrupt ID
   * @returns True if the interrupt is being submitted
   */
  isSubmitting(interruptId: string): boolean {
    const interrupt = this.#interrupts.get(interruptId);
    return interrupt ? checkIsSubmitting(interrupt.machineState) : false;
  }

  /**
   * Get the error for an interrupt
   *
   * @param interruptId - The interrupt ID
   * @returns The error message or undefined
   */
  getError(interruptId: string): string | undefined {
    const interrupt = this.#interrupts.get(interruptId);
    return interrupt ? getErrorMessage(interrupt.machineState) : undefined;
  }

  /**
   * Get an interrupt by its associated message ID
   *
   * @param messageId - The message ID
   * @returns The interrupt or undefined
   */
  getByMessageId(messageId: string): InterruptWithState | undefined {
    for (const interrupt of this.#interrupts.values()) {
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
  hasError(interruptId: string): boolean {
    const interrupt = this.#interrupts.get(interruptId);
    return interrupt ? checkHasError(interrupt.machineState) : false;
  }
}

// =========================================================================
// Backward-compatible module API (delegates to the page-default instance)
// =========================================================================

const def = (): InterruptStore => getDefaultInstance().interrupts;

/**
 * Get the reactive interrupts map.
 * Use this in components within $derived() for reactivity.
 */
export function getInterruptsMap(): SvelteMap<string, InterruptWithState> {
  return def().getMap();
}

/**
 * Get pending interrupt IDs (interrupts not in a terminal state)
 */
export function getPendingInterruptIds(): string[] {
  return def().getPendingIds();
}

/**
 * Get pending interrupts array (interrupts not in a terminal state)
 */
export function getPendingInterrupts(): InterruptWithState[] {
  return def().getPending();
}

/**
 * Get count of pending interrupts
 */
export function getPendingInterruptCount(): number {
  return def().getPendingCount();
}

/**
 * Get resolved interrupts array
 */
export function getResolvedInterrupts(): InterruptWithState[] {
  return def().getResolved();
}

/**
 * Check if any interrupt is currently submitting
 */
export function getIsAnySubmitting(): boolean {
  return def().getIsAnySubmitting();
}

/**
 * Interrupt store actions for modifying state (page-default instance).
 *
 * Explicit forwarding object (not a re-export) so the call shape — and
 * `vi.mock`ability — matches the pre-class API.
 */
export const interruptActions: InterruptStoreActions = {
  addInterrupt: (interrupt) => def().addInterrupt(interrupt),
  addInterrupts: (interruptList) => def().addInterrupts(interruptList),
  startSubmit: (interruptId, value) => def().startSubmit(interruptId, value),
  startCancel: (interruptId) => def().startCancel(interruptId),
  submitSuccess: (interruptId) => def().submitSuccess(interruptId),
  submitFailure: (interruptId, error) => def().submitFailure(interruptId, error),
  retry: (interruptId) => def().retry(interruptId),
  resetInterrupt: (interruptId) => def().resetInterrupt(interruptId),
  resolveInterrupt: (interruptId, value) => def().resolveInterrupt(interruptId, value),
  cancelInterrupt: (interruptId) => def().cancelInterrupt(interruptId),
  removeInterrupt: (interruptId) => def().removeInterrupt(interruptId),
  clearSessionInterrupts: (sessionId) => def().clearSessionInterrupts(sessionId),
  clearInterrupts: () => def().clearInterrupts(),
  reset: () => def().reset()
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
  return def().getInterrupt(interruptId);
}

/**
 * Check if an interrupt is pending (not resolved or cancelled)
 *
 * @param interruptId - The interrupt ID
 * @returns True if the interrupt exists and is pending
 */
export function isInterruptPending(interruptId: string): boolean {
  return def().isPending(interruptId);
}

/**
 * Check if an interrupt is currently submitting
 *
 * @param interruptId - The interrupt ID
 * @returns True if the interrupt is being submitted
 */
export function isInterruptSubmitting(interruptId: string): boolean {
  return def().isSubmitting(interruptId);
}

/**
 * Get the error for an interrupt
 *
 * @param interruptId - The interrupt ID
 * @returns The error message or undefined
 */
export function getInterruptError(interruptId: string): string | undefined {
  return def().getError(interruptId);
}

/**
 * Get an interrupt by its associated message ID
 *
 * @param messageId - The message ID
 * @returns The interrupt or undefined
 */
export function getInterruptByMessageId(messageId: string): InterruptWithState | undefined {
  return def().getByMessageId(messageId);
}

/**
 * Check if an interrupt has an error
 *
 * @param interruptId - The interrupt ID
 * @returns True if the interrupt has an error
 */
export function interruptHasError(interruptId: string): boolean {
  return def().hasError(interruptId);
}
