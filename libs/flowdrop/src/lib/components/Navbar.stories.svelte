<script module>
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import Navbar from "./Navbar.svelte";

  const { Story } = defineMeta({
    title: "Editor/Navbar",
    component: Navbar,
    tags: ["autodocs"],
    parameters: {
      layout: "fullscreen",
    },
  });
</script>

<Story
  name="Default"
  args={{
    title: "My Workflow",
    showStatus: true,
    showSettings: true,
  }}
/>

<Story
  name="With Actions"
  args={{
    title: "Workflow Editor",
    primaryActions: [
      {
        label: "Save",
        href: "#",
        icon: "mdi:content-save",
        variant: "primary",
      },
      { label: "Export", href: "#", icon: "mdi:download", variant: "outline" },
    ],
    showStatus: true,
  }}
/>

<Story
  name="With Breadcrumbs"
  args={{
    breadcrumbs: [
      { label: "Workflows", href: "#", icon: "mdi:folder" },
      { label: "My Workflow", href: "#" },
    ],
    showSettings: true,
  }}
/>

<Story
  name="Minimal"
  args={{
    showStatus: false,
    showSettings: false,
  }}
/>
