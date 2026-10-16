<!--
  ReadOnlyDetails Component
  The meta of an inspected thing: one muted 12px line, "Category · id ⧉" (the id
  truncates with a tooltip, the copy button sits at its end), then the
  description in 13px muted. No key/value table: a "Type" detail is dropped (for
  most nodes it only ever said "default"); a "Category" detail shows as its bare
  value and any other detail as "<value> <label>" ("3 nodes").
-->

<script lang="ts">
  import Icon from '@iconify/svelte';
  import IconButton from './primitives/IconButton.svelte';
  import { m } from '$lib/messages/index.js';

  /**
   * A single detail item with label and value
   */
  interface DetailItem {
    /** The label to display */
    label: string;
    /** The value to display */
    value: string;
  }

  /**
   * Props interface for ReadOnlyDetails component
   */
  interface Props {
    /** The unique identifier to display with a copy button */
    id: string;
    /** Optional section title */
    title?: string;
    /** Optional description text */
    description?: string;
    /** Array of label-value pairs to display */
    details: DetailItem[];
  }

  const { id, title, description, details }: Props = $props();

  /** The details that read as a phrase in the meta line. */
  const facts = $derived(
    details
      .filter((d) => d.label.toLowerCase() !== 'type' && d.value !== '')
      .map((d) =>
        d.label.toLowerCase() === 'category' ? d.value : `${d.value} ${d.label.toLowerCase()}`
      )
  );

  /**
   * Copy the ID to clipboard
   */
  function copyId(): void {
    navigator.clipboard.writeText(id);
  }
</script>

<div class="readonly-details">
  {#if title}
    <h3 class="readonly-details__title">{title}</h3>
  {/if}

  <div class="readonly-details__meta">
    {#each facts as fact (fact)}
      <span class="readonly-details__fact">{fact}</span>
      <span class="readonly-details__sep" aria-hidden="true">·</span>
    {/each}
    <code class="readonly-details__id" {id} title={id}>{id}</code>
    <IconButton
      size="sm"
      class="readonly-details__copy-btn"
      title={m().navigation.copyId}
      ariaLabel={m().navigation.copyId}
      onclick={copyId}
    >
      <Icon icon="heroicons:clipboard-document" />
    </IconButton>
  </div>

  {#if description}
    <p class="readonly-details__description">{description}</p>
  {/if}
</div>

<style>
  .readonly-details {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-xs);
    min-width: 0;
  }

  .readonly-details__title {
    margin: 0;
    font-size: var(--fd-text-sm);
    font-weight: 600;
    color: var(--fd-foreground);
  }

  .readonly-details__meta {
    display: flex;
    align-items: center;
    gap: var(--fd-space-2xs);
    min-width: 0;
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
  }

  .readonly-details__fact,
  .readonly-details__sep {
    flex: none;
  }

  .readonly-details__id {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--fd-font-mono);
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
  }

  .readonly-details__meta :global(.readonly-details__copy-btn) {
    flex: none;
    margin-left: calc(-1 * var(--fd-space-3xs));
  }

  .readonly-details__description {
    margin: 0;
    font-size: var(--fd-text-sm);
    color: var(--fd-muted-foreground);
    line-height: 1.5;
  }
</style>
