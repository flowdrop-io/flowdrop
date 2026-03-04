<script module>
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import NodeDecorator from "../../stories/NodeDecorator.svelte";
	import { createSampleNodeData } from "../../stories/utils.js";

	const { Story } = defineMeta({
		title: "Nodes/SquareNode",
		tags: ["autodocs"],
		parameters: {
			layout: "centered",
		},
	});
</script>

<Story name="Default">
	<NodeDecorator data={createSampleNodeData({
		label: "Calculator",
		metadata: {
			id: "calculator",
			name: "Calculator",
			description: "Perform mathematical operations",
			category: "tools",
			version: "1.0.0",
			type: "square",
			icon: "mdi:calculator",
			inputs: [{ id: "input", name: "Input", type: "input", dataType: "number", required: true }],
			outputs: [{ id: "result", name: "Result", type: "output", dataType: "number" }],
		},
	})} />
</Story>

<Story name="Selected">
	<NodeDecorator data={createSampleNodeData({
		label: "Timer",
		metadata: {
			id: "timer",
			name: "Timer",
			description: "Wait for a specified duration",
			category: "helpers",
			version: "1.0.0",
			type: "square",
			icon: "mdi:timer",
			inputs: [{ id: "trigger", name: "Trigger", type: "input", dataType: "any", required: true }],
			outputs: [{ id: "done", name: "Done", type: "output", dataType: "any" }],
		},
	})} selected={true} />
</Story>
