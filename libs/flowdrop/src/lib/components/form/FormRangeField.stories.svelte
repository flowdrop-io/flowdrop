<script module>
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import FormRangeField from "./FormRangeField.svelte";
  import { fn } from "storybook/test";

  const { Story } = defineMeta({
    title: "Form/FormRangeField",
    component: FormRangeField,
    tags: ["autodocs"],
    argTypes: {
      value: { control: { type: "number" } },
      min: { control: "number" },
      max: { control: "number" },
      step: { control: "number" },
      disabled: { control: "boolean" },
    },
    args: {
      id: "demo-range-field",
      value: 50,
      onChange: fn(),
    },
  });
</script>

<Story name="Default" args={{ min: 0, max: 100, step: 1 }} />

<Story name="Temperature" args={{ value: 0.7, min: 0, max: 2, step: 0.05 }} />

<Story name="Small Range" args={{ value: 3, min: 1, max: 10, step: 1 }} />

<Story name="Disabled" args={{ value: 75, min: 0, max: 100, disabled: true }} />
