<!--
  PanelHeader — the 40px strip at the top of a panel (docked Playground, AI
  chat, Console, inspector/settings sheet).

  Left: a `title` string or a free-form `leading` snippet (a workflow chip, a
  back button...). Right: an `actions` snippet. An optional `subtitle` sits
  under the title in smaller muted type. The title is a real heading
  (`as`, default h2) styled small, so panels stay navigable by heading.

  @internal Not exported from any package entry; the API may still change.
-->

<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** Heading text. Not rendered when `leading` is given. */
    title?: string;
    /** Muted second line under the title. */
    subtitle?: string;
    /** `id` on the heading, for a dialog's `aria-labelledby`. */
    titleId?: string;
    /** Heading element for the title. Visual size is the same for all levels. */
    as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    /** Replaces the title block on the left (chip, back button, ...). */
    leading?: Snippet;
    /** Right-aligned controls (icon buttons, segmented, ...). */
    actions?: Snippet;
    /** Hide the bottom border (when the panel supplies its own divider). */
    borderless?: boolean;
    /** Extra classes on the root. */
    class?: string;
  }

  let {
    title,
    subtitle,
    titleId,
    as = 'h2',
    leading,
    actions,
    borderless = false,
    class: className = ''
  }: Props = $props();
</script>

<header
  class="flowdrop-ui-panel-header {className}"
  class:flowdrop-ui-panel-header--borderless={borderless}
>
  <div class="flowdrop-ui-panel-header__lead">
    {#if leading}
      {@render leading()}
    {:else if title}
      <div class="flowdrop-ui-panel-header__text">
        <svelte:element this={as} id={titleId} class="flowdrop-ui-panel-header__title"
          >{title}</svelte:element
        >
        {#if subtitle}
          <span class="flowdrop-ui-panel-header__subtitle">{subtitle}</span>
        {/if}
      </div>
    {/if}
  </div>
  {#if actions}
    <div class="flowdrop-ui-panel-header__actions">
      {@render actions()}
    </div>
  {/if}
</header>

<style>
  .flowdrop-ui-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--fd-space-xs);
    flex: none;
    box-sizing: border-box;
    height: var(--fd-panel-header);
    padding-inline: var(--fd-space-md);
    border-bottom: 1px solid var(--fd-border);
    background: var(--fd-panel-bg);
    color: var(--fd-foreground);
    font-family: var(--fd-font-sans);
  }

  .flowdrop-ui-panel-header--borderless {
    border-bottom-color: transparent;
  }

  .flowdrop-ui-panel-header__lead {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    min-width: 0;
    flex: 1 1 auto;
  }

  .flowdrop-ui-panel-header__text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .flowdrop-ui-panel-header__title {
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--fd-text-sm);
    font-weight: 600;
    line-height: 1.2;
  }

  .flowdrop-ui-panel-header__subtitle {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-2xs);
    line-height: 1.2;
  }

  .flowdrop-ui-panel-header__actions {
    display: flex;
    align-items: center;
    gap: var(--fd-space-3xs);
    flex: none;
  }
</style>
