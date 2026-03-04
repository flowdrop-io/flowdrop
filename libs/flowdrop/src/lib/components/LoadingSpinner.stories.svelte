<script module>
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import LoadingSpinner from "./LoadingSpinner.svelte";

	const { Story } = defineMeta({
		title: "Display/LoadingSpinner",
		component: LoadingSpinner,
		tags: ["autodocs"],
		argTypes: {
			size: {
				control: { type: "select" },
				options: ["xs", "sm", "md", "lg"],
			},
			text: { control: "text" },
			showText: { control: "boolean" },
		},
	});
</script>

<Story name="Default" />

<Story name="Extra Small" args={{ size: "xs" }} />

<Story name="Small" args={{ size: "sm" }} />

<Story name="Large" args={{ size: "lg" }} />

<Story name="Custom Text" args={{ text: "Processing..." }} />

<Story name="No Text" args={{ showText: false }} />
