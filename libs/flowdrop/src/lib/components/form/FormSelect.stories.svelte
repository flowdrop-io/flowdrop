<script module>
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import FormSelect from "./FormSelect.svelte";
	import { fn } from "storybook/test";

	const { Story } = defineMeta({
		title: "Form/FormSelect",
		component: FormSelect,
		tags: ["autodocs"],
		argTypes: {
			value: { control: "text" },
			required: { control: "boolean" },
			disabled: { control: "boolean" },
		},
		args: {
			id: "demo-select",
			value: "",
			onChange: fn(),
		},
	});
</script>

<Story
	name="String Options"
	args={{
		options: ["Option A", "Option B", "Option C"],
		value: "Option A",
	}}
/>

<Story
	name="FieldOption Objects"
	args={{
		options: [
			{ value: "gpt-4", label: "GPT-4" },
			{ value: "gpt-3.5", label: "GPT-3.5 Turbo" },
			{ value: "claude-3", label: "Claude 3 Opus" },
		],
		value: "gpt-4",
	}}
/>

<Story
	name="Disabled"
	args={{
		options: ["Read", "Write", "Admin"],
		value: "Read",
		disabled: true,
	}}
/>
