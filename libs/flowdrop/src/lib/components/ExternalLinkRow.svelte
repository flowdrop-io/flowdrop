<!--
  ExternalLinkRow — one quiet row naming the workflow (or portal) a node
  delegates its configuration to: "Runs" in muted text, then the name as an
  accent link with a small ↗. A link, not a card.
-->

<script lang="ts">
  import Icon from '@iconify/svelte';

  interface Props {
    /** Muted lead-in, e.g. "Runs"; absent for a plain labelled link */
    prefix?: string;
    /** The link text, e.g. "Calculator" */
    name: string;
    /** Tooltip */
    title?: string;
    href: string;
    /** Open in a new tab */
    newTab?: boolean;
  }

  let { prefix, name, title, href, newTab = true }: Props = $props();
</script>

<div class="external-link-row">
  {#if prefix}<span class="external-link-row__prefix">{prefix}</span>{/if}
  <a
    class="external-link-row__link"
    {href}
    target={newTab ? '_blank' : undefined}
    rel={newTab ? 'noopener noreferrer' : undefined}
    title={title ?? name}
    data-testid="external-config-link"
  >
    <span class="external-link-row__name">{name}</span>
    <Icon icon="mdi:arrow-top-right" aria-hidden="true" />
  </a>
</div>

<style>
  .external-link-row {
    display: flex;
    align-items: baseline;
    gap: var(--fd-space-3xs);
    min-width: 0;
    font-size: var(--fd-text-sm);
  }

  .external-link-row__prefix {
    flex: none;
    color: var(--fd-muted-foreground);
  }

  .external-link-row__link {
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-3xs);
    min-width: 0;
    padding: 0;
    color: var(--fd-inspector-link-color);
    text-decoration: none;
    font: inherit;
    font-weight: 500;
    cursor: pointer;
  }

  .external-link-row__link:hover .external-link-row__name {
    text-decoration: underline;
  }

  .external-link-row__name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .external-link-row__link :global(svg) {
    flex: none;
    width: 0.875rem;
    height: 0.875rem;
  }
</style>
