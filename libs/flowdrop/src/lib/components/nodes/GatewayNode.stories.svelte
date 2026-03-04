<script module>
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import GatewayNode from "./GatewayNode.svelte";
	import NodeDecorator from "../../stories/NodeDecorator.svelte";
	import { createSampleNodeData } from "../../stories/utils.js";

	const { Story } = defineMeta({
		title: "Nodes/GatewayNode",
		tags: ["autodocs"],
		parameters: {
			layout: "centered",
		},
	});
</script>

<Story name="Default">
	<NodeDecorator data={createSampleNodeData({
		label: "If/Else",
		config: {
			matchText: "",
			operator: "equals",
			caseSensitive: false,
			branches: [
				{ name: "True", value: "true" },
				{ name: "False", value: "false" },
			],
		},
		metadata: {
			id: "if_else",
			name: "If/Else",
			description: "Simple conditional logic with text input, match text, and operator",
			category: "logic",
			version: "1.0.0",
			type: "gateway",
			icon: "mdi:code-braces",
			inputs: [
				{ id: "data", name: "Input Data", type: "input", dataType: "mixed", required: false, description: "Optional input data (if not using textInput config)" },
				{ id: "trigger", name: "Trigger", type: "input", dataType: "trigger", required: false },
			],
			outputs: [],
		},
	})} />
</Story>

<Story name="Multiple Branches">
	<NodeDecorator data={createSampleNodeData({
		label: "Router",
		config: {
			branches: [
				{ name: "Route A", value: "route-a" },
				{ name: "Route B", value: "route-b" },
				{ name: "Route C", value: "route-c" },
			],
		},
		metadata: {
			id: "router",
			name: "Router",
			description: "Route to multiple outputs",
			category: "logic",
			version: "1.0.0",
			type: "gateway",
			icon: "mdi:call-split",
			inputs: [{ id: "input", name: "Input", type: "input", dataType: "any", required: true }],
			outputs: [],
		},
	})} />
</Story>
