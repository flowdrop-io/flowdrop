<!--
  ExternalLinkRow — one quiet row naming the workflow (or portal) a node
  delegates its configuration to: "Runs" in muted text, then the name as an
  accent link with a small ↗. A link, not a card.
-->

<script lang="ts">
  import Icon from '@iconify/svelte';
  import Button from './primitives/Button.svelte';

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
    /**
     * Handle a plain left click instead of following the link. The href stays,
     * so middle-click, modified clicks and "copy link" work as for any link.
     * With an empty `href` there is nothing to follow: the row renders as a
     * button and every click goes to `onActivate`.
     */
    onActivate?: () => void;
  }

  let { prefix, name, title, href, newTab = true, onActivate }: Props = $props();

  function handleClick(event: MouseEvent): void {
    if (!onActivate) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    onActivate();
  }
</script>

{#snippet content()}
  <span class="external-link-row__name">{name}</span>
  <Icon icon="mdi:arrow-top-right" aria-hidden="true" />
{/snippet}

{#if href || onActivate}
  <div class="external-link-row">
    {#if prefix}<span class="external-link-row__prefix">{prefix}</span>{/if}
    {#if href}
      <a
        class="external-link-row__link"
        {href}
        target={newTab ? '_blank' : undefined}
        rel={newTab ? 'noopener noreferrer' : undefined}
        title={title ?? name}
        onclick={handleClick}
        data-testid="external-config-link"
      >
        {@render content()}
      </a>
    {:else if onActivate}
      <Button
        variant="ghost"
        size="sm"
        class="external-link-row__link"
        title={title ?? name}
        onclick={() => onActivate()}
        data-testid="external-config-link"
      >
        {@render content()}
      </Button>
    {/if}
  </div>
{/if}

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

  /* One look for both forms: the <a>, and the Button primitive that stands in
     for it when there is no URL. :global reaches the Button's own element; the
     two-class selector outweighs the primitive's single-class sizing. */
  .external-link-row :global(.external-link-row__link),
  .external-link-row :global(.external-link-row__link:hover:not(:disabled)) {
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-3xs);
    min-width: 0;
    height: auto;
    min-height: 0;
    padding: 0;
    border: none;
    background: none;
    color: var(--fd-inspector-link-color);
    text-decoration: none;
    font: inherit;
    font-weight: 500;
    cursor: pointer;
  }

  .external-link-row :global(.external-link-row__link:hover .external-link-row__name) {
    text-decoration: underline;
  }

  .external-link-row__name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .external-link-row :global(.external-link-row__link svg) {
    flex: none;
    width: 0.875rem;
    height: 0.875rem;
  }
</style>
