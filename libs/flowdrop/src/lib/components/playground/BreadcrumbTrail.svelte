<!--
  BreadcrumbTrail Component

  Renders an ordered list of MessageBreadcrumbItem entries separated by
  chevrons. Display-only; href is intentionally not in the schema yet.
-->

<script lang="ts">
  import Icon from '@iconify/svelte';
  import type { MessageBreadcrumbItem } from '../../types/playground.js';

  interface Props {
    items: MessageBreadcrumbItem[];
  }

  let { items }: Props = $props();
</script>

{#if items.length > 0}
  <nav class="breadcrumb-trail__nav" aria-label="message hierarchy">
    <ol class="breadcrumb-trail">
      {#each items as item, index (item.id)}
        <li
          class="breadcrumb-trail__item"
          title={item.id}
          aria-current={index === items.length - 1 ? 'true' : undefined}
        >
          {#if item.icon}
            <Icon icon={item.icon} class="breadcrumb-trail__icon" aria-hidden="true" />
          {/if}
          <span class="breadcrumb-trail__label">{item.label}</span>
        </li>
        {#if index < items.length - 1}
          <li class="breadcrumb-trail__separator" aria-hidden="true">
            <Icon icon="mdi:chevron-right" />
          </li>
        {/if}
      {/each}
    </ol>
  </nav>
{/if}

<style>
  .breadcrumb-trail__nav {
    display: inline-flex;
    min-width: 0;
  }

  .breadcrumb-trail {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--fd-space-3xs);
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: var(--fd-text-2xs);
    color: var(--fd-muted-foreground);
    min-width: 0;
  }

  .breadcrumb-trail__item {
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-3xs);
    min-width: 0;
  }

  .breadcrumb-trail__label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 8rem;
  }

  @media (max-width: 640px) {
    .breadcrumb-trail__label {
      max-width: 5rem;
    }
  }

  .breadcrumb-trail__separator {
    display: inline-flex;
    align-items: center;
    opacity: 0.5;
  }

  .breadcrumb-trail :global(.breadcrumb-trail__icon) {
    flex-shrink: 0;
    font-size: 0.875em;
    opacity: 0.7;
  }
</style>
