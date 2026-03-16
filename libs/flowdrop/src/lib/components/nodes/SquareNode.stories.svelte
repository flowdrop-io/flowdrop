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
  <NodeDecorator
    data={createSampleNodeData({
      label: "Text Input",
      metadata: {
        id: "text_input",
        name: "Text Input",
        description: "Simple text input for user data",
        category: "inputs",
        version: "1.0.0",
        type: "square",
        supportedTypes: ["square"],
        icon: "mdi:text",
        color: "#22c55e",
        inputs: [],
        outputs: [
          {
            id: "text",
            name: "text",
            type: "output",
            dataType: "string",
            required: false,
            description: "The input text value",
          },
        ],
      },
    })}
  />
</Story>

<Story name="Selected">
  <NodeDecorator
    data={createSampleNodeData({
      label: "Text Output",
      metadata: {
        id: "text_output",
        name: "Text Output",
        description: "Simple text output for displaying data",
        category: "outputs",
        version: "1.0.0",
        type: "square",
        supportedTypes: ["square"],
        icon: "mdi:text-box",
        color: "#ef4444",
        inputs: [
          {
            id: "text",
            name: "Text Input",
            type: "input",
            dataType: "string",
            required: false,
            description: "The text to output",
          },
          {
            id: "trigger",
            name: "Trigger",
            type: "input",
            dataType: "trigger",
            required: false,
            description: "",
          },
        ],
        outputs: [],
      },
    })}
    selected={true}
  />
</Story>

<Story name="Dynamic Ports">
  <NodeDecorator
    data={createSampleNodeData({
      label: "Data Mapper",
      config: {
        dynamicInputs: [
          {
            name: "source",
            label: "Source Data",
            dataType: "json",
            required: true,
          },
        ],
        dynamicOutputs: [
          {
            name: "mapped",
            label: "Mapped Output",
            dataType: "json",
            required: false,
          },
          {
            name: "errors",
            label: "Errors",
            dataType: "string",
            required: false,
          },
        ],
      },
      metadata: {
        id: "data_mapper",
        name: "Data Mapper",
        description: "Map data between formats",
        category: "processing",
        version: "1.0.0",
        type: "square",
        supportedTypes: ["square"],
        icon: "mdi:swap-horizontal",
        color: "#0ea5e9",
        inputs: [],
        outputs: [],
      },
    })}
  />
</Story>
