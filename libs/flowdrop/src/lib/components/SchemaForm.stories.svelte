<script module>
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import SchemaForm from "./SchemaForm.svelte";
  import { fn } from "storybook/test";

  const { Story } = defineMeta({
    title: "Form/SchemaForm",
    component: SchemaForm,
    tags: ["autodocs"],
    args: {
      onChange: fn(),
      onSave: fn(),
      onCancel: fn(),
    },
  });
</script>

<Story
  name="Simple Form"
  args={{
    schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          title: "Name",
          description: "Enter your full name",
        },
        age: { type: "number", title: "Age", minimum: 0, maximum: 120 },
        active: { type: "boolean", title: "Active", default: true },
      },
      required: ["name"],
    },
    values: { name: "Alice", age: 30, active: true },
  }}
/>

<Story
  name="Select Fields"
  args={{
    schema: {
      type: "object",
      properties: {
        model: {
          type: "string",
          title: "AI Model",
          oneOf: [
            { const: "gpt-4", title: "GPT-4" },
            { const: "gpt-3.5", title: "GPT-3.5 Turbo" },
            { const: "claude-3", title: "Claude 3" },
          ],
        },
        temperature: {
          type: "number",
          title: "Temperature",
          format: "range",
          minimum: 0,
          maximum: 2,
          step: 0.1,
          default: 0.7,
        },
        prompt: {
          type: "string",
          title: "System Prompt",
          format: "multiline",
          description: "The system prompt for the AI model",
        },
      },
    },
    values: {
      model: "gpt-4",
      temperature: 0.7,
      prompt: "You are a helpful assistant.",
    },
  }}
/>

<Story
  name="With Actions"
  args={{
    schema: {
      type: "object",
      properties: {
        email: { type: "string", title: "Email" },
        notifications: { type: "boolean", title: "Enable Notifications" },
      },
      required: ["email"],
    },
    values: { email: "", notifications: true },
    showActions: true,
    saveLabel: "Save Settings",
    cancelLabel: "Reset",
  }}
/>

<Story
  name="Loading"
  args={{
    schema: {
      type: "object",
      properties: {
        name: { type: "string", title: "Name" },
      },
    },
    values: { name: "Test" },
    showActions: true,
    loading: true,
  }}
/>

<Story
  name="Disabled"
  args={{
    schema: {
      type: "object",
      properties: {
        name: { type: "string", title: "Name" },
        role: { type: "string", title: "Role" },
      },
    },
    values: { name: "Admin", role: "Super User" },
    disabled: true,
  }}
/>
