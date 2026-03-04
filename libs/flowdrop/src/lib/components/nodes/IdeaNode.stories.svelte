<script module>
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import IdeaNode from "./IdeaNode.svelte";
	import NodeDecorator from "../../stories/NodeDecorator.svelte";

	const { Story } = defineMeta({
		title: "Nodes/IdeaNode",
		component: IdeaNode,
		tags: ["autodocs"],
		parameters: {
			layout: "centered",
		},
	});
</script>

<Story name="Default">
	<NodeDecorator>
		<IdeaNode data={{
			label: "Idea",
			config: {},
			metadata: {
				id: "idea",
				name: "Idea",
				description: "Planning node",
				category: "helpers",
				version: "1.0.0",
				type: "idea",
				inputs: [],
				outputs: [],
			},
		}} />
	</NodeDecorator>
</Story>

<Story name="With Content">
	<NodeDecorator>
		<IdeaNode data={{
			label: "Feature Idea",
			config: {
				content: "Add batch processing support to handle multiple items in parallel.",
			},
			metadata: {
				id: "idea",
				name: "Idea",
				description: "Planning node",
				category: "helpers",
				version: "1.0.0",
				type: "idea",
				inputs: [],
				outputs: [],
			},
		}} />
	</NodeDecorator>
</Story>
