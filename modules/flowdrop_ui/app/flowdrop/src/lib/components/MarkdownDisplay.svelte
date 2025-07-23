<!--
  MarkdownDisplay Component
  Reusable component for rendering markdown content with consistent styling
  Supports all standard markdown elements with proper typography
-->

<script lang="ts">
  import { marked } from "marked";

  interface Props {
    content: string;
    className?: string;
    sanitize?: boolean;
  }

  let props: Props = $props();

  // Parse markdown content
  let renderedContent = $derived(marked.parse(props.content || ""));

  // Default class name if none provided
  let displayClass = $derived(props.className || "markdown-display");
</script>

<div class="{displayClass}">
  {@html renderedContent}
</div> 