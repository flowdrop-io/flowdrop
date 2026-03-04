<script module>
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import FormFieldWrapper from "./FormFieldWrapper.svelte";

	const { Story } = defineMeta({
		title: "Form/FormFieldWrapper",
		component: FormFieldWrapper,
		tags: ["autodocs"],
		argTypes: {
			label: { control: "text" },
			required: { control: "boolean" },
			description: { control: "text" },
		},
		args: {
			id: "demo-wrapper",
			label: "Field Label",
		},
	});
</script>

<Story name="Default" args={{ label: "Username" }}>
	<input type="text" id="demo-wrapper" placeholder="Enter username" style="width: 100%; padding: 0.625rem 0.875rem; border: 1px solid var(--fd-border); border-radius: var(--fd-radius-lg); font-size: var(--fd-text-sm);" />
</Story>

<Story name="With Description" args={{ label: "Email", description: "We'll never share your email with anyone.", required: true }}>
	<input type="email" id="demo-wrapper" placeholder="email@example.com" style="width: 100%; padding: 0.625rem 0.875rem; border: 1px solid var(--fd-border); border-radius: var(--fd-radius-lg); font-size: var(--fd-text-sm);" />
</Story>

<Story name="Required" args={{ label: "Password", required: true }}>
	<input type="password" id="demo-wrapper" placeholder="Enter password" style="width: 100%; padding: 0.625rem 0.875rem; border: 1px solid var(--fd-border); border-radius: var(--fd-radius-lg); font-size: var(--fd-text-sm);" />
</Story>
