<script module>
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import ThemeToggle from "./ThemeToggle.svelte";

  const { Story } = defineMeta({
    title: "Display/ThemeToggle",
    component: ThemeToggle,
    tags: ["autodocs"],
    argTypes: {
      size: {
        control: { type: "select" },
        options: ["sm", "md", "lg"],
      },
      showLabel: { control: "boolean" },
    },
  });
</script>

<Story name="Default" />

<Story name="Small" args={{ size: "sm" }} />

<Story name="Large" args={{ size: "lg" }} />

<Story name="With Label" args={{ showLabel: true }} />
