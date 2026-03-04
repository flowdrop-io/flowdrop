<script module>
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import ToolNode from "./ToolNode.svelte";
	import NodeDecorator from "../../stories/NodeDecorator.svelte";
	import { createSampleNodeData } from "../../stories/utils.js";

	const { Story } = defineMeta({
		title: "Nodes/ToolNode",
		component: ToolNode,
		tags: ["autodocs"],
		parameters: {
			layout: "centered",
		},
	});
</script>

<Story name="Default">
	<NodeDecorator>
		<ToolNode data={createSampleNodeData({
			label: "OpenAI Chat",
			metadata: {
				id: "openai-chat",
				name: "OpenAI Chat",
				description: "Chat completion using OpenAI API",
				category: "ai",
				version: "1.0.0",
				type: "tool",
				icon: "mdi:robot",
				inputs: [{ id: "prompt", name: "Prompt", type: "input", dataType: "string", required: true }],
				outputs: [{ id: "response", name: "Response", type: "output", dataType: "string" }],
			},
		})} />
	</NodeDecorator>
</Story>

<Story name="Multiple Parameters">
	<NodeDecorator>
		<ToolNode data={createSampleNodeData({
			label: "Email Sender",
			metadata: {
				id: "email-sender",
				name: "Email Sender",
				description: "Send emails via SMTP",
				category: "tools",
				version: "1.0.0",
				type: "tool",
				icon: "mdi:email-send",
				inputs: [
					{ id: "to", name: "To", type: "input", dataType: "string", required: true },
					{ id: "subject", name: "Subject", type: "input", dataType: "string", required: true },
					{ id: "body", name: "Body", type: "input", dataType: "string", required: true },
				],
				outputs: [
					{ id: "status", name: "Status", type: "output", dataType: "string" },
					{ id: "messageId", name: "Message ID", type: "output", dataType: "string" },
				],
			},
		})} />
	</NodeDecorator>
</Story>
