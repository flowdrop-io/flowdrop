/**
 * Unit Tests - Interrupt types and state machine
 *
 * Tests the interrupt state machine and type utility functions.
 */

import { describe, it, expect } from "vitest";
import {
	initialState,
	transition,
	isTerminalState,
	isSubmitting,
	hasError,
	canSubmit,
	getErrorMessage,
	getResolvedValue,
	toLegacyStatus
} from "$lib/types/interrupt.js";

describe("Interrupt State Machine", () => {
	describe("initialState", () => {
		it("should be an idle state", () => {
			expect(initialState.status).toBe("idle");
		});
	});

	describe("transition - SUBMIT", () => {
		it("should transition from idle to submitting", () => {
			const state = initialState;
			const result = transition(state, { type: "SUBMIT", value: true });
			expect(result.valid).toBe(true);
			if (result.valid) {
				expect(result.state.status).toBe("submitting");
			}
		});

		it("should not allow SUBMIT from resolved state", () => {
			const state = initialState;
			const submitted = transition(state, { type: "SUBMIT", value: true });
			if (!submitted.valid) return;

			const resolved = transition(submitted.state, { type: "SUCCESS" });
			if (!resolved.valid) return;

			const result = transition(resolved.state, { type: "SUBMIT", value: false });
			expect(result.valid).toBe(false);
		});
	});

	describe("transition - SUCCESS", () => {
		it("should transition from submitting to resolved", () => {
			const state = initialState;
			const submitted = transition(state, { type: "SUBMIT", value: true });
			if (!submitted.valid) return;

			const result = transition(submitted.state, { type: "SUCCESS" });
			expect(result.valid).toBe(true);
			if (result.valid) {
				expect(result.state.status).toBe("resolved");
			}
		});
	});

	describe("transition - FAILURE", () => {
		it("should transition from submitting to error", () => {
			const state = initialState;
			const submitted = transition(state, { type: "SUBMIT", value: true });
			if (!submitted.valid) return;

			const result = transition(submitted.state, { type: "FAILURE", error: "Network error" });
			expect(result.valid).toBe(true);
			if (result.valid) {
				expect(result.state.status).toBe("error");
			}
		});
	});

	describe("state helpers", () => {
		it("isTerminalState should return true for resolved", () => {
			const state = initialState;
			const submitted = transition(state, { type: "SUBMIT", value: true });
			if (!submitted.valid) return;
			const resolved = transition(submitted.state, { type: "SUCCESS" });
			if (!resolved.valid) return;

			expect(isTerminalState(resolved.state)).toBe(true);
		});

		it("isTerminalState should return false for idle", () => {
			expect(isTerminalState(initialState)).toBe(false);
		});

		it("isSubmitting should return true for submitting state", () => {
			const state = initialState;
			const submitted = transition(state, { type: "SUBMIT", value: true });
			if (!submitted.valid) return;
			expect(isSubmitting(submitted.state)).toBe(true);
		});

		it("canSubmit should return true for idle state", () => {
			expect(canSubmit(initialState)).toBe(true);
		});

		it("canSubmit should return false for submitting state", () => {
			const state = initialState;
			const submitted = transition(state, { type: "SUBMIT", value: true });
			if (!submitted.valid) return;
			expect(canSubmit(submitted.state)).toBe(false);
		});

		it("hasError should return true for error state", () => {
			const state = initialState;
			const submitted = transition(state, { type: "SUBMIT", value: true });
			if (!submitted.valid) return;
			const errored = transition(submitted.state, { type: "FAILURE", error: "Oops" });
			if (!errored.valid) return;
			expect(hasError(errored.state)).toBe(true);
		});

		it("getErrorMessage should return error text", () => {
			const state = initialState;
			const submitted = transition(state, { type: "SUBMIT", value: true });
			if (!submitted.valid) return;
			const errored = transition(submitted.state, { type: "FAILURE", error: "Something broke" });
			if (!errored.valid) return;
			expect(getErrorMessage(errored.state)).toBe("Something broke");
		});

		it("getResolvedValue should return the resolved value", () => {
			const state = initialState;
			const submitted = transition(state, { type: "SUBMIT", value: "answer" });
			if (!submitted.valid) return;
			const resolved = transition(submitted.state, { type: "SUCCESS" });
			if (!resolved.valid) return;
			expect(getResolvedValue(resolved.state)).toBe("answer");
		});
	});

	describe("toLegacyStatus", () => {
		it("should map idle to pending", () => {
			expect(toLegacyStatus(initialState)).toBe("pending");
		});

		it("should map submitting to pending", () => {
			const state = initialState;
			const submitted = transition(state, { type: "SUBMIT", value: true });
			if (!submitted.valid) return;
			expect(toLegacyStatus(submitted.state)).toBe("pending");
		});

		it("should map resolved to resolved", () => {
			const state = initialState;
			const submitted = transition(state, { type: "SUBMIT", value: true });
			if (!submitted.valid) return;
			const resolved = transition(submitted.state, { type: "SUCCESS" });
			if (!resolved.valid) return;
			expect(toLegacyStatus(resolved.state)).toBe("resolved");
		});
	});
});
