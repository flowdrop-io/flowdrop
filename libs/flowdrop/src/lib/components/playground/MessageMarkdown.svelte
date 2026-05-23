<!--
  MessageMarkdown Component

  Renders message content. Wraps marked + sanitizeHtml and applies the
  shared markdown typography. Used by ChatBubble (assistant/system/user)
  and MessageCard so they share one set of typography rules.

  Consumers scope overrides via :global(.message-markdown ...) from their
  own component CSS — see ChatBubble's user-bubble rules.

  When `enableMarkdown` is false (or the role is 'log'), the content is
  rendered as plain text.
-->

<script lang="ts">
  import { marked } from 'marked';
  import { sanitizeHtml } from '../../utils/sanitize.js';

  interface Props {
    content: string;
    enableMarkdown?: boolean;
  }

  let { content, enableMarkdown = true }: Props = $props();

  const rendered = $derived(
    enableMarkdown ? sanitizeHtml(marked.parse(content || '') as string) : null
  );
</script>

<div class="message-markdown">
  {#if rendered !== null}
    <!-- Markdown sanitized via DOMPurify in sanitizeHtml. -->
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html rendered}
  {:else}
    {content}
  {/if}
</div>

<style>
  .message-markdown {
    line-height: var(--fd-leading-relaxed);
    word-break: break-word;
  }

  .message-markdown :global(p) {
    margin: 0 0 var(--fd-space-md) 0;
  }

  .message-markdown :global(p:last-child) {
    margin-bottom: 0;
  }

  .message-markdown :global(h1),
  .message-markdown :global(h2),
  .message-markdown :global(h3),
  .message-markdown :global(h4),
  .message-markdown :global(h5),
  .message-markdown :global(h6) {
    margin: var(--fd-space-xl) 0 var(--fd-space-xs) 0;
    font-weight: 600;
    line-height: 1.3;
  }

  .message-markdown :global(h1:first-child),
  .message-markdown :global(h2:first-child),
  .message-markdown :global(h3:first-child),
  .message-markdown :global(h4:first-child),
  .message-markdown :global(h5:first-child),
  .message-markdown :global(h6:first-child) {
    margin-top: 0;
  }

  .message-markdown :global(h1) { font-size: var(--fd-text-xl); }
  .message-markdown :global(h2) { font-size: var(--fd-text-lg); }
  .message-markdown :global(h3) { font-size: var(--fd-text-base); }

  .message-markdown :global(ul),
  .message-markdown :global(ol) {
    margin: var(--fd-space-xs) 0;
    padding-left: var(--fd-space-3xl);
  }

  .message-markdown :global(li) {
    margin: var(--fd-space-3xs) 0;
  }

  .message-markdown :global(code) {
    background-color: var(--fd-secondary);
    padding: 0.125rem var(--fd-space-3xs);
    border-radius: var(--fd-radius-sm);
    font-family: var(--fd-font-mono);
    font-size: 0.875em;
  }

  .message-markdown :global(pre) {
    background-color: var(--fd-foreground);
    color: var(--fd-background);
    padding: var(--fd-space-md) var(--fd-space-xl);
    border-radius: var(--fd-radius-lg);
    overflow-x: auto;
    margin: var(--fd-space-md) 0;
    font-size: var(--fd-text-sm);
    line-height: var(--fd-leading-normal);
  }

  .message-markdown :global(pre code) {
    background-color: transparent;
    padding: 0;
    border-radius: 0;
    color: inherit;
    font-size: inherit;
  }

  .message-markdown :global(blockquote) {
    border-left: 3px solid var(--fd-border-strong);
    padding-left: var(--fd-space-xl);
    margin: var(--fd-space-md) 0;
    color: var(--fd-muted-foreground);
    font-style: italic;
  }

  .message-markdown :global(a) {
    color: var(--fd-primary);
    text-decoration: none;
  }

  .message-markdown :global(a:hover) {
    text-decoration: underline;
  }

  .message-markdown :global(hr) {
    border: none;
    border-top: 1px solid var(--fd-border);
    margin: var(--fd-space-xl) 0;
  }

  .message-markdown :global(table) {
    border-collapse: collapse;
    width: 100%;
    margin: var(--fd-space-md) 0;
    font-size: var(--fd-text-sm);
  }

  .message-markdown :global(th),
  .message-markdown :global(td) {
    border: 1px solid var(--fd-border);
    padding: var(--fd-space-xs) var(--fd-space-md);
    text-align: left;
  }

  .message-markdown :global(th) {
    background-color: var(--fd-muted);
    font-weight: 600;
  }

  .message-markdown :global(strong) { font-weight: 600; }
  .message-markdown :global(em) { font-style: italic; }
</style>
