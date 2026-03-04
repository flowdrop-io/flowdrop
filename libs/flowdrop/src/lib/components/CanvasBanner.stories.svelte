<script module>
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import CanvasBanner from "./CanvasBanner.svelte";

	const { Story } = defineMeta({
		title: "Display/CanvasBanner",
		component: CanvasBanner,
		tags: ["autodocs", "alpha"],
		argTypes: {
			title: { control: "text" },
			description: { control: "text" },
			iconName: { control: "text" },
		},
		parameters: {
			layout: "padded",
		},
	});
</script>

<Story name="Default">
	<div style="position: relative; width: 500px; height: 300px; border: 1px solid var(--fd-border); border-radius: var(--fd-radius-lg); background: var(--fd-background);">
		<CanvasBanner title="Empty Canvas" description="Drag nodes from the sidebar to get started" iconName="heroicons:squares-plus" />
	</div>
</Story>

<Story name="No Icon">
	<div style="position: relative; width: 500px; height: 300px; border: 1px solid var(--fd-border); border-radius: var(--fd-radius-lg); background: var(--fd-background);">
		<CanvasBanner title="No Workflows" description="Create your first workflow to begin" />
	</div>
</Story>
