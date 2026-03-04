<script module>
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import ChoicePrompt from "./ChoicePrompt.svelte";
	import { fn } from "storybook/test";
	import { createChoiceConfig } from "../../stories/utils.js";

	const { Story } = defineMeta({
		title: "Interrupt/ChoicePrompt",
		component: ChoicePrompt,
		tags: ["autodocs"],
		args: {
			config: createChoiceConfig(),
			isResolved: false,
			isSubmitting: false,
			onSubmit: fn(),
		},
	});
</script>

<Story name="Single Select" />

<Story name="Multi Select" args={{
	config: createChoiceConfig({
		message: "Select the features to enable:",
		multiple: true,
		options: [
			{ value: "auth", label: "Authentication", description: "User login and signup" },
			{ value: "analytics", label: "Analytics", description: "Usage tracking and metrics" },
			{ value: "notifications", label: "Notifications", description: "Email and push alerts" },
			{ value: "export", label: "Data Export", description: "CSV and JSON export" },
		],
	}),
}} />

<Story name="Resolved" args={{
	isResolved: true,
	resolvedValue: "high",
	resolvedByUserName: "Bob",
}} />

<Story name="Submitting" args={{
	isSubmitting: true,
}} />
