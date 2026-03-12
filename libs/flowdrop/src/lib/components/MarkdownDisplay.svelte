<!--
  MarkdownDisplay Component
  Reusable component for rendering markdown content with consistent styling
  Supports all standard markdown elements with proper typography
-->

<script lang="ts">
  import { marked } from "marked";
  import { sanitizeHtml } from "../utils/sanitize.js";

  interface Props {
    content: string;
    className?: string;
  }

  let props: Props = $props();

  // Parse markdown content and sanitize to prevent XSS
  let renderedContent = $derived(
    sanitizeHtml(marked.parse(props.content || "") as string),
  );

  // Default class name if none provided
  let displayClass = $derived(props.className || "markdown-display");
</script>

<div class={displayClass}>
  <!-- Content is sanitized with DOMPurify to prevent XSS -->
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html renderedContent}
</div>
