<script module>
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import SimpleNode from "./SimpleNode.svelte";
	import NodeDecorator from "../../stories/NodeDecorator.svelte";
	import { createSampleNodeData } from "../../stories/utils.js";

	const { Story } = defineMeta({
		title: "Nodes/SimpleNode",
		component: SimpleNode,
		tags: ["autodocs"],
		parameters: {
			layout: "centered",
		},
	});
</script>

<Story name="Default">
	<NodeDecorator>
		<SimpleNode data={createSampleNodeData({ label: "Text Splitter" })} />
	</NodeDecorator>
</Story>

<Story name="With Icon">
	<NodeDecorator>
		<SimpleNode data={createSampleNodeData({
			label: "HTTP Request",
			metadata: {
				id: "http-request",
				name: "HTTP Request",
				description: "Send HTTP requests to external APIs",
				category: "tools",
				version: "1.0.0",
				type: "default",
				icon: "mdi:web",
				inputs: [{ id: "input", name: "Input", type: "input", dataType: "any", required: false }],
				outputs: [{ id: "output", name: "Output", type: "output", dataType: "any" }],
			},
		})} />
	</NodeDecorator>
</Story>

<Story name="Selected">
	<NodeDecorator>
		<SimpleNode data={createSampleNodeData({ label: "Selected Node" })} selected={true} />
	</NodeDecorator>
</Story>

<Story name="Multiple Ports">
	<NodeDecorator>
		<SimpleNode data={createSampleNodeData({
			label: "Data Merger",
			metadata: {
				id: "data-merger",
				name: "Data Merger",
				description: "Merge multiple data streams",
				category: "processing",
				version: "1.0.0",
				type: "default",
				inputs: [
					{ id: "input-a", name: "Stream A", type: "input", dataType: "string", required: true },
					{ id: "input-b", name: "Stream B", type: "input", dataType: "string", required: false },
				],
				outputs: [
					{ id: "merged", name: "Merged", type: "output", dataType: "string" },
				],
			},
		})} />
	</NodeDecorator>
</Story>
