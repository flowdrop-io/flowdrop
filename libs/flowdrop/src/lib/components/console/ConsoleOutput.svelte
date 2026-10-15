<!--
  @component
  The scrolling output area of the Console. It draws the lines you typed, results, errors and formatted tables,
  with the command language highlighted, and stays scrolled to the newest line.

  **Use it for** showing command results inside `CommandConsole`.
-->

<script lang="ts">
  import { tick } from 'svelte';
  import { highlightConsoleEntry } from '../../utils/consoleHighlight.js';

  export interface ConsoleEntry {
    type: 'input' | 'success' | 'error' | 'formatted';
    text: string;
  }

  interface Props {
    /** Output entries to display */
    entries: ConsoleEntry[];
  }

  let { entries }: Props = $props();

  let outputElement: HTMLDivElement | undefined = $state();

  $effect(() => {
    // Track entries length to auto-scroll on new entries
    const _count = entries.length;
    tick().then(() => {
      if (outputElement) {
        outputElement.scrollTop = outputElement.scrollHeight;
      }
    });
  });
</script>

<div class="console-output" bind:this={outputElement} role="log" aria-live="polite">
  <!-- Append-only log without stable IDs — index is the identity -->
  <!-- Segments are presentation only: their text joins back to the entry text exactly. -->
  {#each entries as entry, i (i)}
    <div class="console-output__entry console-output__entry--{entry.type}">
      {#if entry.type === 'input'}
        <span class="console-output__prefix console-output__tok--prompt">&gt;</span>
        <span class="console-output__text">{@render tokens(entry)}</span>
      {:else if entry.type === 'formatted'}
        <pre class="console-output__pre">{@render tokens(entry)}</pre>
      {:else}
        <span class="console-output__text">{@render tokens(entry)}</span>
      {/if}
    </div>
  {/each}
</div>

{#snippet tokens(
  entry: ConsoleEntry
)}{#each highlightConsoleEntry(entry) as seg, j (j)}{#if seg.role}<span
        class="console-output__tok--{seg.role}">{seg.text}</span
      >{:else}{seg.text}{/if}{/each}{/snippet}

<style>
  /* The terminal surface: monospace on the ink panel, colours from --fd-console-* tokens. */
  .console-output {
    flex: 1;
    overflow-y: auto;
    padding: var(--fd-space-xs) var(--fd-space-md);
    font-family: var(--fd-font-mono);
    font-size: var(--fd-text-sm);
    line-height: 1.6;
    color: var(--fd-console-fg);

    scrollbar-width: thin;
    scrollbar-color: var(--fd-console-scroll-thumb) transparent;
  }

  .console-output::-webkit-scrollbar {
    width: 8px;
  }

  .console-output::-webkit-scrollbar-track {
    background: transparent;
  }

  .console-output::-webkit-scrollbar-thumb {
    background: var(--fd-console-scroll-thumb);
    border-radius: var(--fd-scrollbar-radius);
  }

  .console-output::-webkit-scrollbar-thumb:hover {
    background: var(--fd-console-scroll-thumb-hover);
  }

  .console-output ::selection {
    background: var(--fd-console-selection);
    color: inherit;
  }

  .console-output__entry {
    white-space: pre-wrap;
    word-break: break-word;
  }

  /* A command starts a new exchange: a little air before it, except at the top. */
  .console-output__entry--input:not(:first-child) {
    margin-top: var(--fd-console-entry-gap);
  }

  .console-output__entry--error {
    color: var(--fd-console-error);
  }

  .console-output__pre {
    margin: 0;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    white-space: pre;
    overflow-x: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--fd-console-scroll-thumb) transparent;
  }

  .console-output__prefix {
    margin-right: 0.5rem;
    user-select: none;
  }

  /* Roles. Colour only (plus the verb's weight): no role changes layout or text. */
  .console-output__tok--prompt {
    color: var(--fd-console-prompt);
  }

  .console-output__tok--verb {
    color: var(--fd-console-verb);
    font-weight: 600;
  }

  .console-output__tok--arg {
    color: var(--fd-console-arg);
  }

  .console-output__tok--id {
    color: var(--fd-console-id);
  }

  .console-output__tok--header {
    color: var(--fd-console-header);
  }

  .console-output__tok--rule {
    color: var(--fd-console-rule);
  }

  .console-output__tok--key {
    color: var(--fd-console-key);
  }

  .console-output__tok--eq {
    color: var(--fd-console-eq);
  }

  .console-output__tok--string {
    color: var(--fd-console-string);
  }

  .console-output__tok--number {
    color: var(--fd-console-number);
  }

  .console-output__tok--punct {
    color: var(--fd-console-punct);
  }

  .console-output__tok--error {
    color: var(--fd-console-error);
  }

  .console-output__tok--muted {
    color: var(--fd-console-muted);
  }
</style>
