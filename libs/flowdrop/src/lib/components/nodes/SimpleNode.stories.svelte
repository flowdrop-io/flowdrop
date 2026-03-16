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
  <NodeDecorator
    data={createSampleNodeData({
      label: "Text Input",
      metadata: {
        id: "text_input",
        name: "Text Input",
        description: "Simple text input for user data",
        category: "inputs",
        version: "1.0.0",
        type: "simple",
        supportedTypes: ["simple", "square", "default"],
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

<Story name="With Icon">
  <NodeDecorator
    data={createSampleNodeData({
      label: "Notification Template",
      metadata: {
        id: "notification_template",
        name: "Notification Template",
        description:
          "Create notification templates with API-driven variable suggestions",
        category: "outputs",
        version: "1.0.0",
        type: "simple",
        supportedTypes: ["simple", "default"],
        icon: "mdi:bell-ring",
        color: "#f59e0b",
        inputs: [
          {
            id: "event",
            name: "Event Data",
            type: "input",
            dataType: "json",
            required: false,
            description: "Event that triggered notification",
          },
          {
            id: "trigger",
            name: "Trigger",
            type: "input",
            dataType: "trigger",
            required: false,
            description: "Execution trigger",
          },
        ],
        outputs: [
          {
            id: "notification",
            name: "Notification",
            type: "output",
            dataType: "json",
            required: false,
            description: "Formatted notification object",
          },
        ],
      },
    })}
  />
</Story>

<Story name="Selected">
  <NodeDecorator
    data={createSampleNodeData({
      label: "Text Input",
      metadata: {
        id: "text_input",
        name: "Text Input",
        description: "Simple text input for user data",
        category: "inputs",
        version: "1.0.0",
        type: "simple",
        supportedTypes: ["simple", "square", "default"],
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
    selected={true}
  />
</Story>

<Story name="Multiple Ports">
  <NodeDecorator
    data={createSampleNodeData({
      label: "Text Output",
      metadata: {
        id: "text_output",
        name: "Text Output",
        description: "Simple text output for displaying data",
        category: "outputs",
        version: "1.0.0",
        type: "simple",
        supportedTypes: ["square", "simple", "default"],
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
  />
</Story>

<Story name="Dynamic Ports">
  <NodeDecorator
    data={createSampleNodeData({
      label: "Custom Function",
      config: {
        dynamicInputs: [
          { name: "param_a", label: "Parameter A", description: "First parameter", dataType: "string", required: true },
          { name: "param_b", label: "Parameter B", description: "Second parameter", dataType: "number", required: false },
        ],
        dynamicOutputs: [
          { name: "result", label: "Result", description: "Function result", dataType: "json", required: false },
        ],
      },
      metadata: {
        id: "custom_function",
        name: "Custom Function",
        description: "A node with dynamic input and output ports",
        category: "processing",
        version: "1.0.0",
        type: "simple",
        supportedTypes: ["simple", "square", "default"],
        icon: "mdi:function-variant",
        color: "#8b5cf6",
        inputs: [
          { id: "trigger", name: "Trigger", type: "input", dataType: "trigger", required: false },
        ],
        outputs: [
          { id: "done", name: "Done", type: "output", dataType: "trigger", required: false },
        ],
      },
    })}
  />
</Story>
