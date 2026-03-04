<script module>
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import FormNumberField from "./FormNumberField.svelte";
	import { fn } from "storybook/test";

	const { Story } = defineMeta({
		title: "Form/FormNumberField",
		component: FormNumberField,
		tags: ["autodocs"],
		argTypes: {
			value: { control: "number" },
			placeholder: { control: "text" },
			min: { control: "number" },
			max: { control: "number" },
			step: { control: "number" },
			required: { control: "boolean" },
			disabled: { control: "boolean" },
		},
		args: {
			id: "demo-number-field",
			value: "",
			onChange: fn(),
		},
	});
</script>

<Story name="Default" args={{ placeholder: "Enter a number..." }} />

<Story name="With Value" args={{ value: 42 }} />

<Story name="With Constraints" args={{ value: 50, min: 0, max: 100, step: 5, placeholder: "0-100, step 5" }} />

<Story name="Disabled" args={{ value: 10, disabled: true }} />
