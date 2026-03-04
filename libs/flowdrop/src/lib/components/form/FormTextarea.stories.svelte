<script module>
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import FormTextarea from "./FormTextarea.svelte";
	import { fn } from "storybook/test";

	const { Story } = defineMeta({
		title: "Form/FormTextarea",
		component: FormTextarea,
		tags: ["autodocs"],
		argTypes: {
			value: { control: "text" },
			placeholder: { control: "text" },
			rows: { control: { type: "number", min: 1, max: 20 } },
			required: { control: "boolean" },
			disabled: { control: "boolean" },
		},
		args: {
			id: "demo-textarea",
			value: "",
			onChange: fn(),
		},
	});
</script>

<Story name="Default" args={{ placeholder: "Enter your message..." }} />

<Story name="Custom Rows" args={{ rows: 8, placeholder: "Larger text area..." }} />

<Story name="With Value" args={{ value: "This is a multiline\ntext content\nwith several lines." }} />

<Story name="Disabled" args={{ value: "Read-only content", disabled: true }} />
