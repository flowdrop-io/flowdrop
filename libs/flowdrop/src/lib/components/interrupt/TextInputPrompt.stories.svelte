<script module>
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import TextInputPrompt from "./TextInputPrompt.svelte";
  import { fn } from "storybook/test";
  import { createTextConfig } from "../../stories/utils.js";

  const { Story } = defineMeta({
    title: "Interrupt/TextInputPrompt",
    component: TextInputPrompt,
    tags: ["autodocs"],
    args: {
      config: createTextConfig(),
      isResolved: false,
      isSubmitting: false,
      onSubmit: fn(),
    },
  });
</script>

<Story name="Default" />

<Story
  name="Multiline"
  args={{
    config: createTextConfig({
      message: "Describe the issue in detail:",
      multiline: true,
      placeholder: "Type your description...",
    }),
  }}
/>

<Story
  name="With Constraints"
  args={{
    config: createTextConfig({
      message: "Enter a short summary:",
      minLength: 10,
      maxLength: 100,
    }),
  }}
/>

<Story
  name="Resolved"
  args={{
    isResolved: true,
    resolvedValue:
      "The workflow completed successfully with all checks passed.",
    resolvedByUserName: "Charlie",
  }}
/>
