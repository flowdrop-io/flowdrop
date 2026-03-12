<script module>
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import ConfigPanel from "./ConfigPanel.svelte";
  import { fn } from "storybook/test";

  const { Story } = defineMeta({
    title: "Editor/ConfigPanel",
    component: ConfigPanel,
    tags: ["autodocs"],
    parameters: {
      layout: "padded",
    },
    args: {
      onClose: fn(),
    },
  });
</script>

<Story
  name="Default"
  args={{
    title: "HTTP Request",
    id: "node-abc-123",
    description: "Send HTTP requests to external APIs",
    configTitle: "Configuration",
  }}
/>

<Story
  name="With Details"
  args={{
    title: "OpenAI Chat",
    id: "node-def-456",
    description: "Chat completion using OpenAI models",
    details: [
      { label: "Category", value: "AI" },
      { label: "Version", value: "1.2.0" },
    ],
  }}
/>

<Story
  name="Minimal"
  args={{
    title: "Start Node",
  }}
/>
