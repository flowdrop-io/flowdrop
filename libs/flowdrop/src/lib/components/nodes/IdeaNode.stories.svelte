<script module>
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import NodeDecorator from "../../stories/NodeDecorator.svelte";

  const { Story } = defineMeta({
    title: "Nodes/IdeaNode",
    tags: ["autodocs"],
    parameters: {
      layout: "centered",
    },
  });
</script>

<Story name="Default">
  <NodeDecorator
    data={{
      label: "Idea",
      config: {},
      metadata: {
        id: "idea",
        name: "Idea",
        description: "Planning node",
        category: "helpers",
        version: "1.0.0",
        type: "idea",
        inputs: [],
        outputs: [],
      },
    }}
  />
</Story>

<Story name="With Content">
  <NodeDecorator
    data={{
      label: "Feature Idea",
      config: {
        content:
          "Add batch processing support to handle multiple items in parallel.",
      },
      metadata: {
        id: "idea",
        name: "Idea",
        description: "Planning node",
        category: "helpers",
        version: "1.0.0",
        type: "idea",
        inputs: [],
        outputs: [],
      },
    }}
  />
</Story>
