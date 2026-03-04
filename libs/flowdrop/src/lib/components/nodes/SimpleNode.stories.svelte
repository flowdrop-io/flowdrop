<script module>
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import NodeDecorator from "../../stories/NodeDecorator.svelte";
	import { createSampleNodeData } from "../../stories/utils.js";

	const { Story } = defineMeta({
		title: "Nodes/SimpleNode",
		tags: ["autodocs"],
		parameters: {
			layout: "centered",
		},
	});
</script>

<Story name="Default">
	<NodeDecorator data={createSampleNodeData({
		label: "Text Splitter",
		metadata: {
			id: "text-splitter",
			name: "Text Splitter",
			description: "Split text into chunks",
			category: "processing",
			version: "1.0.0",
			type: "simple",
			inputs: [{ id: "input", name: "Input", type: "input", dataType: "any", required: false }],
			outputs: [{ id: "output", name: "Output", type: "output", dataType: "any" }],
		},
	})} />
</Story>

<Story name="With Icon">
	<NodeDecorator data={createSampleNodeData({
		label: "HTTP Request",
		metadata: {
			id: "http-request",
			name: "HTTP Request",
			description: "Send HTTP requests to external APIs",
			category: "tools",
			version: "1.0.0",
			type: "simple",
			icon: "mdi:web",
			inputs: [{ id: "input", name: "Input", type: "input", dataType: "any", required: false }],
			outputs: [{ id: "output", name: "Output", type: "output", dataType: "any" }],
		},
	})} />
</Story>

<Story name="Selected">
	<NodeDecorator data={createSampleNodeData({
		label: "Selected Node",
		metadata: {
			id: "selected-node",
			name: "Selected Node",
			description: "A selected simple node",
			category: "processing",
			version: "1.0.0",
			type: "simple",
			inputs: [{ id: "input", name: "Input", type: "input", dataType: "any", required: false }],
			outputs: [{ id: "output", name: "Output", type: "output", dataType: "any" }],
		},
	})} selected={true} />
</Story>

<Story name="Multiple Ports">
	<NodeDecorator data={createSampleNodeData({
		label: "Data Merger",
		metadata: {
			id: "data-merger",
			name: "Data Merger",
			description: "Merge multiple data streams",
			category: "processing",
			version: "1.0.0",
			type: "simple",
			inputs: [
				{ id: "input-a", name: "Stream A", type: "input", dataType: "string", required: true },
				{ id: "input-b", name: "Stream B", type: "input", dataType: "string", required: false },
			],
			outputs: [
				{ id: "merged", name: "Merged", type: "output", dataType: "string" },
			],
		},
	})} />
</Story>
