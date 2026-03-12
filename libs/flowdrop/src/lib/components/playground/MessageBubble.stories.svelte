<script module>
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import MessageBubble from "./MessageBubble.svelte";

  const { Story } = defineMeta({
    title: "Playground/MessageBubble",
    component: MessageBubble,
    tags: ["autodocs"],
    parameters: {
      layout: "padded",
    },
  });
</script>

<Story
  name="User Message"
  args={{
    message: {
      id: "msg-1",
      role: "user",
      content: "Can you process this workflow for me?",
      timestamp: new Date().toISOString(),
    },
  }}
/>

<Story
  name="Assistant Message"
  args={{
    message: {
      id: "msg-2",
      role: "assistant",
      content:
        "I've processed the workflow successfully. Here are the results:\n\n- **Step 1**: Data validated\n- **Step 2**: Transformation applied\n- **Step 3**: Output generated\n\nAll checks passed.",
      timestamp: new Date().toISOString(),
    },
  }}
/>

<Story
  name="System Message"
  args={{
    message: {
      id: "msg-3",
      role: "system",
      content: "Workflow execution started",
      timestamp: new Date().toISOString(),
    },
  }}
/>

<Story
  name="Log Message"
  args={{
    message: {
      id: "msg-4",
      role: "log",
      content: "[INFO] Processing node: data-transform-1",
      timestamp: new Date().toISOString(),
    },
  }}
/>
