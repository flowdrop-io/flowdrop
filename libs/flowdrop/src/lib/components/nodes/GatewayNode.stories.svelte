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
	<NodeDecorator>
		<GatewayNode data={createSampleNodeData({
			label: "Condition",
			metadata: {
				id: "condition",
				name: "Condition",
				description: "Branch workflow based on a condition",
				category: "logic",
				version: "1.0.0",
				type: "gateway",
				icon: "mdi:source-branch",
				inputs: [{ id: "input", name: "Input", type: "input", dataType: "any", required: true }],
				outputs: [
					{ id: "true", name: "True", type: "output", dataType: "any" },
					{ id: "false", name: "False", type: "output", dataType: "any" },
				],
			},
		})} />
	</NodeDecorator>
</Story>

<Story name="Multiple Branches">
	<NodeDecorator>
		<GatewayNode data={createSampleNodeData({
			label: "Router",
			metadata: {
				id: "router",
				name: "Router",
				description: "Route to multiple outputs",
				category: "logic",
				version: "1.0.0",
				type: "gateway",
				icon: "mdi:call-split",
				inputs: [{ id: "input", name: "Input", type: "input", dataType: "any", required: true }],
				outputs: [
					{ id: "route-a", name: "Route A", type: "output", dataType: "any" },
					{ id: "route-b", name: "Route B", type: "output", dataType: "any" },
					{ id: "route-c", name: "Route C", type: "output", dataType: "any" },
				],
			},
		})} />
	</NodeDecorator>
</Story>
