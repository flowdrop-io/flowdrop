<!--
  @component
  MarkdownDisplay: renders a markdown string as formatted text.

  Headings, lists, tables, quotes, code blocks and links are all styled. The editor uses it for
  AI chat replies and for note nodes. `className` replaces the default class.

  **Use it for** text written by a person or a model that may contain markdown.
  **Not for** plain labels; print them as text.
-->

<script lang="ts">
  import { marked } from 'marked';
  import { sanitizeHtml } from '../utils/sanitize.js';

  interface Props {
    /** The markdown source. */
    content: string;
    /** Class on the wrapper. Defaults to `markdown-display`. */
    className?: string;
  }

  let props: Props = $props();

  // Parse markdown content and sanitize to prevent XSS
  let renderedContent = $derived(sanitizeHtml(marked.parse(props.content || '') as string));

  // Default class name if none provided
  let displayClass = $derived(props.className || 'markdown-display');
</script>

<div class="flowdrop-scope {displayClass}">
  <!-- Content is sanitized with DOMPurify to prevent XSS -->
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html renderedContent}
</div>
