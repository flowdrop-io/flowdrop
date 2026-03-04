<script module>
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import CanvasBanner from "./CanvasBanner.svelte";
	import CanvasDecorator from "../stories/CanvasDecorator.svelte";

	const { Story } = defineMeta({
		title: "Display/CanvasBanner",
		tags: ["autodocs"],
		parameters: {
			layout: "centered",
		},
	});
</script>

<Story name="Default">
	<CanvasDecorator>
		<CanvasBanner title="Empty Canvas" description="Drag nodes from the sidebar to get started" iconName="heroicons:squares-plus" />
	</CanvasDecorator>
</Story>

<Story name="No Icon">
	<CanvasDecorator>
		<CanvasBanner title="No Workflows" description="Create your first workflow to begin" />
	</CanvasDecorator>
</Story>
