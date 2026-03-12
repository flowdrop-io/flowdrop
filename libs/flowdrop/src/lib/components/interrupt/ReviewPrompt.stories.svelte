<script module>
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import ReviewPrompt from "./ReviewPrompt.svelte";
  import { fn } from "storybook/test";
  import { createReviewConfig } from "../../stories/utils.js";

  const { Story } = defineMeta({
    title: "Interrupt/ReviewPrompt",
    component: ReviewPrompt,
    tags: ["autodocs"],
    args: {
      config: createReviewConfig(),
      isResolved: false,
      isSubmitting: false,
      onSubmit: fn(),
    },
  });
</script>

<Story name="Default" />

<Story
  name="Many Changes"
  args={{
    config: createReviewConfig({
      message: "Review the content updates:",
      changes: [
        {
          field: "title",
          label: "Title",
          original: "Getting Started",
          proposed: "Quick Start Guide",
        },
        {
          field: "slug",
          label: "URL Slug",
          original: "/getting-started",
          proposed: "/quick-start-guide",
        },
        {
          field: "description",
          label: "Meta Description",
          original: "Learn how to get started",
          proposed: "A quick start guide for new users",
        },
        {
          field: "author",
          label: "Author",
          original: "admin",
          proposed: "editor",
        },
        {
          field: "status",
          label: "Status",
          original: "draft",
          proposed: "published",
        },
      ],
    }),
  }}
/>

<Story
  name="Resolved"
  args={{
    isResolved: true,
    resolvedValue: {
      decisions: {
        title: { accepted: true, value: "New Title" },
        description: { accepted: false, value: "Old description text" },
        status: { accepted: true, value: "published" },
      },
      summary: { accepted: 2, rejected: 1, total: 3 },
    },
    resolvedByUserName: "Diana",
  }}
/>
