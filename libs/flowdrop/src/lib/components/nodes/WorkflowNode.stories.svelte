<script module>
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import NodeDecorator from "../../stories/NodeDecorator.svelte";
  import { createSampleNodeData } from "../../stories/utils.js";

  const { Story } = defineMeta({
    title: "Nodes/WorkflowNode",
    tags: ["autodocs"],
    parameters: {
      layout: "centered",
    },
  });
</script>

<Story name="Default">
  <NodeDecorator
    data={createSampleNodeData({
      label: "Sub Workflow",
      metadata: {
        id: "sub-workflow",
        name: "Sub Workflow",
        description: "Execute a nested workflow",
        category: "bundles",
        version: "1.0.0",
        type: "workflow",
        icon: "mdi:sitemap",
        inputs: [
          {
            id: "input",
            name: "Input",
            type: "input",
            dataType: "any",
            required: false,
          },
        ],
        outputs: [
          { id: "output", name: "Output", type: "output", dataType: "any" },
        ],
      },
    })}
  />
</Story>

<Story name="Selected">
  <NodeDecorator
    data={createSampleNodeData({
      label: "Data Pipeline",
      metadata: {
        id: "data-pipeline",
        name: "Data Pipeline",
        description: "Process data through a pipeline workflow",
        category: "bundles",
        version: "1.0.0",
        type: "workflow",
        icon: "mdi:pipe",
        inputs: [
          {
            id: "data",
            name: "Data",
            type: "input",
            dataType: "any",
            required: true,
          },
          {
            id: "config",
            name: "Config",
            type: "input",
            dataType: "object",
            required: false,
          },
        ],
        outputs: [
          { id: "result", name: "Result", type: "output", dataType: "any" },
        ],
      },
    })}
    selected={true}
  />
</Story>
