<!--
  HierarchyTrail Component

  Renders a chevron-separated path of MessageHierarchyItem entries. The
  path is a *display*, not a list users navigate, so the SR announcement
  comes entirely from the wrapper's aria-label (built from the labels of
  the items themselves) and the visible chips are hidden from AT to avoid
  the path being announced twice.
-->

<script lang="ts">
  import Icon from '@iconify/svelte';
  import type { MessageHierarchyItem } from '../../types/playground.js';
  import { m } from '$lib/messages/index.js';

  interface Props {
    items: MessageHierarchyItem[];
  }

  let { items }: Props = $props();

  const ariaLabel = $derived.by(() => {
    const path = items.map((i) => i.label).join(' / ');
    return m().playground.messageAnnotations.hierarchyOf({ path });
  });
</script>

{#if items.length > 0}
  <span class="hierarchy-trail" aria-label={ariaLabel}>
    {#each items as item (item.id)}
      <span class="hierarchy-trail__item" aria-hidden="true">
        {#if item.icon}
          <Icon icon={item.icon} class="hierarchy-trail__icon" />
        {/if}
        <span class="hierarchy-trail__label">{item.label}</span>
      </span>
    {/each}
  </span>
{/if}

<style>
  .hierarchy-trail {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--fd-space-3xs);
    font-size: var(--fd-text-2xs);
    color: var(--fd-muted-foreground);
    min-width: 0;
  }

  .hierarchy-trail__item {
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-3xs);
    min-width: 0;
  }

  /* Chevron separator between items, drawn as a pseudo-element so it
     doesn't enter the markup (and so it never appears to AT — the items
     are already aria-hidden, but belt-and-braces). U+203A SINGLE
     RIGHT-POINTING ANGLE QUOTATION MARK matches mdi:chevron-right
     closely enough without a second iconify dependency. */
  .hierarchy-trail__item:not(:last-child)::after {
    content: '\203A';
    margin-inline-start: var(--fd-space-3xs);
    opacity: 0.5;
  }

  .hierarchy-trail__label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 8rem;
  }

  @media (max-width: 640px) {
    .hierarchy-trail__label {
      max-width: 5rem;
    }
  }

  .hierarchy-trail :global(.hierarchy-trail__icon) {
    flex-shrink: 0;
    font-size: 0.875em;
    opacity: 0.7;
  }
</style>
