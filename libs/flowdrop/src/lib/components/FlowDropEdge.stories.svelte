<script module>
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import EdgeDecorator from "../../lib/stories/EdgeDecorator.svelte";
  import { createSampleNodeData } from "../../lib/stories/utils.js";
  import { EDGE_MARKER_SIZES } from "../../lib/config/constants.js";

  const { Story } = defineMeta({
    title: "Edges/FlowDropEdge",
    tags: ["autodocs"],
    parameters: {
      layout: "centered",
    },
  });

  const sourceNode = createSampleNodeData({
    label: "Text Input",
    metadata: {
      id: "text_input",
      name: "Text Input",
      description: "Simple text input",
      category: "inputs",
      version: "1.0.0",
      type: "simple",
      icon: "mdi:text",
      color: "#22c55e",
      inputs: [],
      outputs: [
        {
          id: "output",
          name: "Output",
          type: "output",
          dataType: "string",
          required: false,
        },
      ],
    },
  });

  const targetNode = createSampleNodeData({
    label: "Text Output",
    metadata: {
      id: "text_output",
      name: "Text Output",
      description: "Display text output",
      category: "outputs",
      version: "1.0.0",
      type: "simple",
      icon: "mdi:text-box",
      color: "#ef4444",
      inputs: [
        {
          id: "input",
          name: "Input",
          type: "input",
          dataType: "string",
          required: false,
        },
      ],
      outputs: [],
    },
  });

  const triggerSource = createSampleNodeData({
    label: "Trigger Source",
    metadata: {
      id: "trigger_source",
      name: "Trigger Source",
      description: "Emits a trigger signal",
      category: "processing",
      version: "1.0.0",
      type: "simple",
      icon: "mdi:play",
      color: "#3b82f6",
      inputs: [],
      outputs: [
        {
          id: "trigger",
          name: "Trigger",
          type: "output",
          dataType: "trigger",
          required: false,
        },
      ],
    },
  });

  const triggerTarget = createSampleNodeData({
    label: "Trigger Target",
    metadata: {
      id: "trigger_target",
      name: "Trigger Target",
      description: "Receives a trigger signal",
      category: "processing",
      version: "1.0.0",
      type: "simple",
      icon: "mdi:lightning-bolt",
      color: "#8b5cf6",
      inputs: [
        {
          id: "trigger",
          name: "Trigger",
          type: "input",
          dataType: "trigger",
          required: false,
        },
      ],
      outputs: [],
    },
  });

  const toolSource = createSampleNodeData({
    label: "Tool Provider",
    metadata: {
      id: "tool_provider",
      name: "Tool Provider",
      description: "Provides a tool",
      category: "processing",
      version: "1.0.0",
      type: "simple",
      icon: "mdi:wrench",
      color: "#f59e0b",
      inputs: [],
      outputs: [
        {
          id: "tool",
          name: "Tool",
          type: "output",
          dataType: "tool",
          required: false,
        },
      ],
    },
  });

  const toolTarget = createSampleNodeData({
    label: "Tool Consumer",
    metadata: {
      id: "tool_consumer",
      name: "Tool Consumer",
      description: "Consumes a tool",
      category: "processing",
      version: "1.0.0",
      type: "simple",
      icon: "mdi:cog",
      color: "#f59e0b",
      inputs: [
        {
          id: "tool",
          name: "Tool",
          type: "input",
          dataType: "tool",
          required: false,
        },
      ],
      outputs: [],
    },
  });
</script>

<Story name="Data Edge">
  <EdgeDecorator
    sourceData={sourceNode}
    targetData={targetNode}
    edgeStyle="stroke: var(--fd-edge-data, #64748b);"
    edgeClass="flowdrop--edge--data"
    edgeMarkerColor="#64748b"
    edgeMarkerSize={EDGE_MARKER_SIZES.data}
    sourceHandleId="output"
    targetHandleId="input"
  />
</Story>

<Story name="Trigger Edge">
  <EdgeDecorator
    sourceData={triggerSource}
    targetData={triggerTarget}
    edgeStyle="stroke: var(--fd-edge-trigger, #1e293b); stroke-width: 2px;"
    edgeClass="flowdrop--edge--trigger"
    edgeMarkerColor="#1e293b"
    edgeMarkerSize={EDGE_MARKER_SIZES.trigger}
    sourceHandleId="trigger"
    targetHandleId="trigger"
  />
</Story>

<Story name="Tool Edge">
  <EdgeDecorator
    sourceData={toolSource}
    targetData={toolTarget}
    edgeStyle="stroke: var(--fd-edge-tool, #f59e0b); stroke-dasharray: 5 3;"
    edgeClass="flowdrop--edge--tool"
    edgeMarkerColor="#f59e0b"
    edgeMarkerSize={EDGE_MARKER_SIZES.tool}
    sourceHandleId="tool"
    targetHandleId="tool"
  />
</Story>
