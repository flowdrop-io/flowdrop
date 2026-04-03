<!--
  ConsoleAutocomplete Component
  Dropdown suggestion list for command verbs and node type IDs
  Positioned above the input, max 8 visible items, scrollable
  Styled with BEM syntax matching console component pattern
-->

<script lang="ts">
  import { tick } from "svelte";

  export interface Suggestion {
    /** The text to insert into the input */
    value: string;
    /** Display label shown in the dropdown */
    label: string;
    /** Optional secondary text (e.g., category) */
    detail?: string;
  }

  interface Props {
    /** List of suggestions to display */
    suggestions: Suggestion[];
    /** Whether the dropdown is visible */
    visible: boolean;
    /** Currently highlighted index */
    selectedIndex: number;
    /** Called when a suggestion is accepted */
    onAccept: (suggestion: Suggestion) => void;
  }

  let { suggestions, visible, selectedIndex, onAccept }: Props = $props();

  let listElement: HTMLDivElement | undefined = $state();

  // Scroll selected item into view
  $effect(() => {
    if (!visible || !listElement || selectedIndex < 0) return;
    const items = listElement.children;
    if (items[selectedIndex]) {
      items[selectedIndex].scrollIntoView({ block: "nearest" });
    }
  });
</script>

{#if visible && suggestions.length > 0}
  <div
    class="console-autocomplete"
    role="listbox"
    id="console-autocomplete-listbox"
    bind:this={listElement}
  >
    {#each suggestions as suggestion, i}
      <div
        class="console-autocomplete__item"
        class:console-autocomplete__item--selected={i === selectedIndex}
        role="option"
        id="console-autocomplete-option-{i}"
        tabindex="-1"
        aria-selected={i === selectedIndex}
        onmousedown={(e: MouseEvent) => { e.preventDefault(); onAccept(suggestion); }}
      >
        <span class="console-autocomplete__label">{suggestion.label}</span>
        {#if suggestion.detail}
          <span class="console-autocomplete__detail">{suggestion.detail}</span>
        {/if}
      </div>
    {/each}
  </div>
{/if}

<style>
  .console-autocomplete {
    position: absolute;
    bottom: 100%;
    left: 0;
    right: 0;
    max-height: calc(8 * 2rem);
    overflow-y: auto;
    background-color: var(--fd-card);
    border: 1px solid var(--fd-border);
    border-bottom: none;
    border-radius: var(--fd-radius-sm) var(--fd-radius-sm) 0 0;
    z-index: 10;

    scrollbar-width: thin;
    scrollbar-color: var(--fd-scrollbar-thumb) var(--fd-scrollbar-track);
  }

  .console-autocomplete::-webkit-scrollbar {
    width: 6px;
  }

  .console-autocomplete::-webkit-scrollbar-track {
    background: var(--fd-scrollbar-track);
  }

  .console-autocomplete::-webkit-scrollbar-thumb {
    background: var(--fd-scrollbar-thumb);
    border-radius: 3px;
  }

  .console-autocomplete__item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.25rem 1rem;
    height: 2rem;
    cursor: pointer;
    font-family: monospace;
    font-size: 0.875rem;
    color: var(--fd-foreground);
  }

  .console-autocomplete__item:hover {
    background-color: var(--fd-accent);
  }

  .console-autocomplete__item--selected {
    background-color: var(--fd-primary-muted);
  }

  .console-autocomplete__item--selected:hover {
    background-color: var(--fd-primary-muted);
  }

  .console-autocomplete__label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .console-autocomplete__detail {
    color: var(--fd-muted-foreground);
    font-size: 0.75rem;
    margin-left: 1rem;
    white-space: nowrap;
    flex-shrink: 0;
  }
</style>
