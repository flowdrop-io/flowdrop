<script module>
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import NodeDecorator from "../../stories/NodeDecorator.svelte";

	const { Story } = defineMeta({
		title: "Nodes/NotesNode",
		tags: ["autodocs"],
		parameters: {
			layout: "centered",
		},
	});
</script>

<Story name="Default">
	<NodeDecorator data={{
		label: "Notes",
		config: {},
		metadata: {
			id: "notes",
			name: "Notes",
			description: "Documentation node",
			category: "helpers",
			version: "1.0.0",
			type: "note",
			inputs: [],
			outputs: [],
		},
	}} />
</Story>

<Story name="With Content">
	<NodeDecorator data={{
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
			type: "note",
			inputs: [],
			outputs: [],
		},
	}} />
</Story>

<Story name="Warning">
	<NodeDecorator data={{
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
			type: "note",
			inputs: [],
			outputs: [],
		},
	}} />
</Story>
