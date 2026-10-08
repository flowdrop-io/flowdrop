<!--
  ReadOnlyDetails Component
  Displays readonly information with an ID (with copy button), title, description, and label-value pairs
  Compact inline layout with BEM syntax
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

  <div class="readonly-details__grid">
    <!-- ID row -->
    <span class="readonly-details__label">ID</span>
    <div class="readonly-details__id-row">
      <code class="readonly-details__id">{id}</code>
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

    <!-- Dynamic label-value pairs -->
    {#each details as detail (detail.label)}
      <span class="readonly-details__label">{detail.label}</span>
      <span class="readonly-details__value">{detail.value}</span>
    {/each}
  </div>

  <!-- Description (if provided) -->
  {#if description}
    <p class="readonly-details__description">{description}</p>
  {/if}
</div>

<style>
  .readonly-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .readonly-details__title {
    margin: 0;
    font-size: var(--fd-text-xs);
    font-weight: 600;
    color: var(--fd-muted-foreground);
  }

  .readonly-details__grid {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.25rem 0.75rem;
    align-items: center;
  }

  .readonly-details__label {
    font-size: var(--fd-text-xs);
    font-weight: 500;
    color: var(--fd-muted-foreground);
  }

  .readonly-details__value {
    font-size: var(--fd-inspector-meta-size);
    color: var(--fd-foreground);
    font-weight: 500;
  }

  .readonly-details__id-row {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    min-width: 0;
  }

  .readonly-details__id {
    font-size: var(--fd-text-xs);
    font-family: var(--fd-font-mono);
    color: var(--fd-muted-foreground);
    background-color: var(--fd-id-chip-bg);
    padding: var(--fd-id-chip-padding);
    border-radius: var(--fd-radius-sm);
    word-break: break-all;
  }

  .readonly-details__id-row :global(.readonly-details__copy-btn) {
    flex: none;
  }

  .readonly-details__description {
    margin: 0;
    font-size: 0.8125rem;
    color: var(--fd-muted-foreground);
    line-height: 1.5;
  }
</style>
