<script module>
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import FormTextField from "./FormTextField.svelte";
	import { fn } from "storybook/test";

	const { Story } = defineMeta({
		title: "Form/FormTextField",
		component: FormTextField,
		tags: ["autodocs"],
		argTypes: {
			value: { control: "text" },
			placeholder: { control: "text" },
			required: { control: "boolean" },
			disabled: { control: "boolean" },
		},
		args: {
			id: "demo-text-field",
			value: "",
			onChange: fn(),
		},
	});
</script>

<Story name="Default" args={{ placeholder: "Enter text..." }} />

<Story name="With Value" args={{ value: "Hello World", placeholder: "Enter text..." }} />

<Story name="Required" args={{ required: true, placeholder: "Required field" }} />

<Story name="Disabled" args={{ value: "Cannot edit this", disabled: true }} />
