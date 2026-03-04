<script module>
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import NodeStatusOverlay from "./NodeStatusOverlay.svelte";

	const { Story } = defineMeta({
		title: "Editor/NodeStatusOverlay",
		component: NodeStatusOverlay,
		tags: ["autodocs", "alpha"],
		parameters: {
			layout: "centered",
		},
	});
</script>

<Story name="Idle">
	<div style="position: relative; width: 200px; height: 100px; border: 1px solid var(--fd-border); border-radius: 8px; background: var(--fd-card, white);">
		<NodeStatusOverlay executionInfo={{ status: "idle" }} />
		<div style="padding: 1rem; text-align: center;">Node Content</div>
	</div>
</Story>

<Story name="Running">
	<div style="position: relative; width: 200px; height: 100px; border: 1px solid var(--fd-border); border-radius: 8px; background: var(--fd-card, white);">
		<NodeStatusOverlay executionInfo={{ status: "running", progress: 0.5 }} />
		<div style="padding: 1rem; text-align: center;">Processing...</div>
	</div>
</Story>

<Story name="Completed">
	<div style="position: relative; width: 200px; height: 100px; border: 1px solid var(--fd-border); border-radius: 8px; background: var(--fd-card, white);">
		<NodeStatusOverlay executionInfo={{ status: "completed" }} />
		<div style="padding: 1rem; text-align: center;">Done!</div>
	</div>
</Story>

<Story name="Failed">
	<div style="position: relative; width: 200px; height: 100px; border: 1px solid var(--fd-border); border-radius: 8px; background: var(--fd-card, white);">
		<NodeStatusOverlay executionInfo={{ status: "failed", error: "Connection timeout" }} />
		<div style="padding: 1rem; text-align: center;">Error</div>
	</div>
</Story>
