<script module>
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import NotesNode from "./NotesNode.svelte";
	import NodeDecorator from "../../stories/NodeDecorator.svelte";

	const { Story } = defineMeta({
		title: "Nodes/NotesNode",
		component: NotesNode,
		tags: ["autodocs"],
		parameters: {
			layout: "centered",
		},
	});
</script>

<Story name="Default">
	<NodeDecorator>
		<NotesNode data={{
			label: "Notes",
			config: {},
			metadata: {
				id: "notes",
				name: "Notes",
				description: "Documentation node",
				category: "helpers",
				version: "1.0.0",
				type: "notes",
				inputs: [],
				outputs: [],
			},
		}} />
	</NodeDecorator>
</Story>

<Story name="With Content">
	<NodeDecorator>
		<NotesNode data={{
			label: "Notes",
			config: {
				content: "## Important\n\nThis workflow handles **user onboarding**.\n\n- Step 1: Validate email\n- Step 2: Create account\n- Step 3: Send welcome email",
				noteType: "info",
			},
			metadata: {
				id: "notes",
				name: "Notes",
				description: "Documentation node",
				category: "helpers",
				version: "1.0.0",
				type: "notes",
				inputs: [],
				outputs: [],
			},
		}} />
	</NodeDecorator>
</Story>

<Story name="Warning">
	<NodeDecorator>
		<NotesNode data={{
			label: "Warning",
			config: {
				content: "Rate limiting is applied to this API call. Max 100 requests/minute.",
				noteType: "warning",
			},
			metadata: {
				id: "notes",
				name: "Notes",
				description: "Documentation node",
				category: "helpers",
				version: "1.0.0",
				type: "notes",
				inputs: [],
				outputs: [],
			},
		}} />
	</NodeDecorator>
</Story>
