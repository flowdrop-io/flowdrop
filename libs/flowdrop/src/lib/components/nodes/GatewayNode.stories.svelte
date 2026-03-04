<script module>
	import { defineMeta } from "@storybook/addon-svelte-csf";
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
			textInput: "",
			matchText: "",
			operator: "equals",
			caseSensitive: false,
			branches: [
				{ name: "True", value: true },
				{ name: "False", value: false },
			],
		},
		metadata: {
			id: "if_else",
			name: "If/Else",
			description: "Simple conditional logic with text input, match text, and operator",
			category: "logic",
			version: "1.0.0",
			type: "gateway",
			supportedTypes: ["gateway"],
			icon: "mdi:code-braces",
			color: "#8b5cf6",
			inputs: [
				{ id: "data", name: "Input Data", type: "input", dataType: "mixed", required: false, description: "Optional input data (if not using textInput config)" },
				{ id: "trigger", name: "Trigger", type: "input", dataType: "trigger", required: false, description: "" },
			],
			outputs: [],
		},
	})} />
</Story>

<Story name="Multiple Branches">
	<NodeDecorator data={createSampleNodeData({
		label: "Switch",
		config: {
			defaultBranch: "default",
			caseSensitive: false,
			branches: [
				{ name: "case_1", label: "Case 1", value: "option1" },
				{ name: "case_2", label: "Case 2", value: "option2" },
				{ name: "default", label: "Default", value: "" },
			],
		},
		metadata: {
			id: "switch",
			name: "Switch",
			description: "Multi-branch routing based on configurable case values",
			category: "logic",
			version: "1.0.0",
			type: "gateway",
			supportedTypes: ["gateway"],
			icon: "mdi:source-branch-sync",
			color: "#8b5cf6",
			inputs: [
				{ id: "value", name: "Value", type: "input", dataType: "string", required: true, description: "The value to match against branch cases" },
				{ id: "trigger", name: "Trigger", type: "input", dataType: "trigger", required: false, description: "" },
			],
			outputs: [],
		},
	})} />
</Story>
