<!--
  ExternalLinkRow — one quiet row naming the workflow (or portal) a node
  delegates its configuration to: "Runs Calculator ↗". A link, not a card.
-->

<script lang="ts">
  import Icon from '@iconify/svelte';
  import Button from './primitives/Button.svelte';

  interface Props {
    /** Visible text, e.g. "Runs Calculator" */
    label: string;
    /** Tooltip */
    title?: string;
    onopen: () => void;
  }

  let { label, title, onopen }: Props = $props();
  const onclick = () => onopen();
</script>

<div class="external-link-row">
  <Button
    variant="ghost"
    size="sm"
    class="external-link-row__link"
    title={title ?? label}
    data-testid="external-config-link"
    {onclick}
  >
    <span class="external-link-row__label">{label}</span>
    {#snippet trailingIcon()}
      <Icon icon="heroicons:arrow-top-right-on-square" aria-hidden="true" />
    {/snippet}
  </Button>
</div>

<style>
  .external-link-row {
    display: flex;
    min-width: 0;
    /* The ghost button's padding is inset; line the text up with the meta lines. */
    margin-left: calc(-1 * var(--fd-space-sm));
  }

  .external-link-row :global(.external-link-row__link) {
    max-width: 100%;
    color: var(--fd-primary);
  }

  .external-link-row__label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
