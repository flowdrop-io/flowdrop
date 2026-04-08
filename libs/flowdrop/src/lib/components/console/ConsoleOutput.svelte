<!--
  ConsoleOutput Component
  Scrollable output area for displaying command results in the console
  Styled with BEM syntax matching CommandConsole pattern
-->

<script lang="ts">
  import { tick } from 'svelte';

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
  {#each entries as entry}
    <div class="console-output__entry console-output__entry--{entry.type}">
      {#if entry.type === 'input'}
        <span class="console-output__prefix">&gt;</span>
        <span class="console-output__text">{entry.text}</span>
      {:else if entry.type === 'formatted'}
        <pre class="console-output__pre">{entry.text}</pre>
      {:else}
        <span class="console-output__text">{entry.text}</span>
      {/if}
    </div>
  {/each}
</div>

<style>
  .console-output {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem 1rem;
    font-family: monospace;
    font-size: 0.875rem;
    line-height: 1.6;

    /* Custom scrollbar styling matching MainLayout pattern */
    scrollbar-width: thin;
    scrollbar-color: var(--fd-scrollbar-thumb) var(--fd-scrollbar-track);
  }

  .console-output::-webkit-scrollbar {
    width: 8px;
  }

  .console-output::-webkit-scrollbar-track {
    background: var(--fd-scrollbar-track);
    border-radius: 4px;
  }

  .console-output::-webkit-scrollbar-thumb {
    background: var(--fd-scrollbar-thumb);
    border-radius: 4px;
  }

  .console-output::-webkit-scrollbar-thumb:hover {
    background: var(--fd-scrollbar-thumb-hover);
  }

  .console-output__entry {
    white-space: pre-wrap;
    word-break: break-word;
  }

  .console-output__entry--input {
    color: var(--fd-muted-foreground);
  }

  .console-output__entry--success {
    color: var(--fd-success);
  }

  .console-output__entry--error {
    color: var(--fd-error);
  }

  .console-output__entry--formatted {
    color: var(--fd-foreground);
  }

  .console-output__pre {
    margin: 0;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    white-space: pre;
    overflow-x: auto;
  }

  .console-output__prefix {
    margin-right: 0.5rem;
    user-select: none;
  }
</style>
