<script module>
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import FormToggle from "./FormToggle.svelte";
	import { fn } from "storybook/test";

	const { Story } = defineMeta({
		title: "Form/FormToggle",
		component: FormToggle,
		tags: ["autodocs"],
		argTypes: {
			value: { control: "boolean" },
			onLabel: { control: "text" },
			offLabel: { control: "text" },
			disabled: { control: "boolean" },
		},
		args: {
			id: "demo-toggle",
			value: false,
			onChange: fn(),
		},
	});
</script>

<Story name="Off" args={{ value: false }} />

<Story name="On" args={{ value: true }} />

<Story name="Custom Labels" args={{ value: true, onLabel: "Yes", offLabel: "No" }} />

<Story name="Disabled" args={{ value: true, disabled: true }} />
