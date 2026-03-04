<script module>
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import TerminalNode from "./TerminalNode.svelte";
	import NodeDecorator from "../../stories/NodeDecorator.svelte";
	import { createTerminalNodeData } from "../../stories/utils.js";

	const { Story } = defineMeta({
		title: "Nodes/TerminalNode",
		component: TerminalNode,
		tags: ["autodocs"],
		parameters: {
			layout: "centered",
		},
	});
</script>

<Story name="Start">
	<NodeDecorator>
		<TerminalNode data={createTerminalNodeData("start")} />
	</NodeDecorator>
</Story>

<Story name="End">
	<NodeDecorator>
		<TerminalNode data={createTerminalNodeData("end")} />
	</NodeDecorator>
</Story>

<Story name="Exit">
	<NodeDecorator>
		<TerminalNode data={createTerminalNodeData("exit")} />
	</NodeDecorator>
</Story>
