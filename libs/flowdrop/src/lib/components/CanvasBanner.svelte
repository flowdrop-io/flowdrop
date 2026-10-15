<!--
  @component
  The message in the middle of an empty canvas: an icon, a title and a line of help.

  It fills the canvas and lets clicks through, so the canvas under it still takes drops. The editor shows it
  while the workflow has no nodes and removes it with the first node.

  **Use it for** telling a person what to do on a canvas with nothing on it.
  **Not for** errors or progress (use `EditorStatusBar` or a notice).
-->

<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** The headline, for example "Drag components here to start building". */
    title: string;
    /** One line of help under the title. */
    description: string;
    /** The icon above the title. Nothing is drawn when it is left out. */
    icon?: Snippet;
  }

  let { title, description, icon }: Props = $props();
</script>

<div class="flowdrop-canvas-banner">
  <div class="flowdrop-card">
    <div class="flowdrop-card__body flowdrop-text--center">
      <div class="flowdrop-canvas-banner__icon">
        {#if icon}
          {@render icon()}
        {/if}
      </div>
      <h3 class="flowdrop-canvas-banner__title">{title}</h3>
      <p class="flowdrop-canvas-banner__description">{description}</p>
    </div>
  </div>
</div>

<style>
  .flowdrop-canvas-banner {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  @media (max-width: 768px) {
    .flowdrop-canvas-banner {
      left: var(--fd-canvas-left-offset, 0px);
    }
  }

  .flowdrop-canvas-banner__icon {
    font-size: 3.75rem;
    margin-bottom: 1rem;
    display: flex;
    justify-content: center;
    align-items: center;
    color: var(--fd-muted-foreground);
  }

  .flowdrop-canvas-banner__title {
    font-size: 1.125rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    color: var(--fd-foreground, #111827);
  }

  .flowdrop-canvas-banner__description {
    font-size: 0.875rem;
    color: var(--fd-muted-foreground, #6b7280);
  }
</style>
