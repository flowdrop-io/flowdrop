/**
 * Shared story utilities
 * Reusable mock data factories for Storybook stories
 */

import type {
	ConfirmationConfig,
	ChoiceConfig,
	TextConfig,
	ReviewConfig,
	ReviewChange
} from "$lib/types/interrupt.js";

export function createSampleNodeData(overrides?: Record<string, unknown>) {
	return {
		label: "Sample Node",
		config: {},
		metadata: {
			id: "sample-node",
			name: "Sample Node",
			description: "A sample node for stories",
			category: "processing",
			version: "1.0.0",
			type: "default",
			inputs: [{ id: "input", name: "Input", type: "input", dataType: "any", required: false }],
			outputs: [{ id: "output", name: "Output", type: "output", dataType: "any" }]
		},
		...overrides
	};
}

export function createTerminalNodeData(variant: "start" | "end" | "exit" = "start") {
	const configs = {
		start: {
			label: "Start",
			config: {},
			metadata: {
				id: "start",
				name: "Start",
				description: "Workflow start point",
				category: "terminal",
				version: "1.0.0",
				type: "terminal",
				inputs: [],
				outputs: [{ id: "output", name: "Output", type: "output", dataType: "any" }]
			}
		},
		end: {
			label: "End",
			config: {},
			metadata: {
				id: "end",
				name: "End",
				description: "Workflow end point",
				category: "terminal",
				version: "1.0.0",
				type: "terminal",
				inputs: [{ id: "input", name: "Input", type: "input", dataType: "any", required: false }],
				outputs: []
			}
		},
		exit: {
			label: "Exit",
			config: {},
			metadata: {
				id: "exit",
				name: "Exit",
				description: "Early exit point",
				category: "terminal",
				version: "1.0.0",
				type: "terminal",
				subType: "exit",
				inputs: [{ id: "input", name: "Input", type: "input", dataType: "any", required: false }],
				outputs: []
			}
		}
	};
	return configs[variant];
}

export function createConfirmationConfig(
	overrides?: Partial<ConfirmationConfig>
): ConfirmationConfig {
	return {
		message: "Are you sure you want to proceed with this action?",
		confirmLabel: "Yes, proceed",
		cancelLabel: "Cancel",
		...overrides
	};
}

export function createChoiceConfig(overrides?: Partial<ChoiceConfig>): ChoiceConfig {
	return {
		message: "Select a priority level for this task:",
		options: [
			{ value: "low", label: "Low", description: "Non-urgent task" },
			{ value: "medium", label: "Medium", description: "Normal priority" },
			{ value: "high", label: "High", description: "Urgent task" }
		],
		multiple: false,
		...overrides
	};
}

export function createTextConfig(overrides?: Partial<TextConfig>): TextConfig {
	return {
		message: "Please provide additional details:",
		placeholder: "Enter your response here...",
		multiline: false,
		...overrides
	};
}

export function createReviewConfig(overrides?: Partial<ReviewConfig>): ReviewConfig {
	return {
		message: "Review the following changes before submitting:",
		changes: [
			{ field: "title", label: "Title", original: "Old Title", proposed: "New Title" },
			{
				field: "description",
				label: "Description",
				original: "Old description text",
				proposed: "Updated description text"
			},
			{ field: "status", label: "Status", original: "draft", proposed: "published" }
		],
		...overrides
	};
}

export function createReviewChange(overrides?: Partial<ReviewChange>): ReviewChange {
	return {
		field: "title",
		label: "Title",
		original: "Original value",
		proposed: "Proposed value",
		...overrides
	};
}
