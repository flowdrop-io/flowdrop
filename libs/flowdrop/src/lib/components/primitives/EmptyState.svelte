<!--
  EmptyState — a quiet, centred "nothing here yet" block: optional icon,
  title, description and an actions row.

  @internal Not exported from any package entry; the API may still change.
-->

<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from '@iconify/svelte';

  interface Props {
    /** Iconify name, e.g. `mdi:inbox-outline`. */
    icon?: string;
    /** Headline. */
    title: string;
    /** Muted explanation under the title. */
    description?: string;
    /** Buttons under the text. */
    actions?: Snippet;
    /** Density: `sm` for panels and lists, `md` for a whole pane. */
    size?: 'sm' | 'md';
    /** Extra classes on the root. */
    class?: string;
  }

  let { icon, title, description, actions, size = 'md', class: className = '' }: Props = $props();
</script>

<div class="flowdrop-ui-empty flowdrop-ui-empty--{size} {className}">
  {#if icon}
    <span class="flowdrop-ui-empty__icon" aria-hidden="true"><Icon {icon} /></span>
  {/if}
  <p class="flowdrop-ui-empty__title">{title}</p>
  {#if description}
    <p class="flowdrop-ui-empty__description">{description}</p>
  {/if}
  {#if actions}
    <div class="flowdrop-ui-empty__actions">{@render actions()}</div>
  {/if}
</div>

<style>
  .flowdrop-ui-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--fd-space-2xs);
    box-sizing: border-box;
    text-align: center;
    color: var(--fd-muted-foreground);
    font-family: var(--fd-font-sans);
  }

  .flowdrop-ui-empty--sm {
    padding: var(--fd-space-md);
  }

  .flowdrop-ui-empty--md {
    padding: var(--fd-space-2xl) var(--fd-space-lg);
    gap: var(--fd-space-xs);
  }

  .flowdrop-ui-empty__icon {
    display: inline-flex;
    color: var(--fd-muted-foreground);
    opacity: 0.7;
  }

  .flowdrop-ui-empty--sm .flowdrop-ui-empty__icon {
    font-size: var(--fd-text-lg);
  }

  .flowdrop-ui-empty--md .flowdrop-ui-empty__icon {
    font-size: var(--fd-text-2xl);
  }

  .flowdrop-ui-empty__title {
    margin: 0;
    color: var(--fd-foreground);
    font-weight: 600;
  }

  .flowdrop-ui-empty--sm .flowdrop-ui-empty__title {
    font-size: var(--fd-text-xs);
  }

  .flowdrop-ui-empty--md .flowdrop-ui-empty__title {
    font-size: var(--fd-text-sm);
  }

  .flowdrop-ui-empty__description {
    margin: 0;
    max-width: 36ch;
    line-height: 1.4;
  }

  .flowdrop-ui-empty--sm .flowdrop-ui-empty__description {
    font-size: var(--fd-text-2xs);
  }

  .flowdrop-ui-empty--md .flowdrop-ui-empty__description {
    font-size: var(--fd-text-xs);
  }

  .flowdrop-ui-empty__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--fd-space-xs);
    margin-top: var(--fd-space-xs);
  }
</style>
