<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /**
     * The icon to render — an inline-SVG snippet (offline-safe). Pass a local
     * icon component from `$lib/components/icons/`, not a network-fetched one.
     */
    icon: Snippet;
    /** Accessible label — drives both aria-label and the hover title. */
    label: string;
    /** Renders the active/toggled-on visual state (e.g. the panel it controls is open). */
    active?: boolean;
    onclick: () => void;
    /** Caller-supplied class for positioning (top/left/bottom/z-index). */
    class?: string;
  }

  let { icon, label, active = false, onclick, class: klass = '' }: Props = $props();
</script>

<button
  class="flowdrop-canvas-btn {klass}"
  class:flowdrop-canvas-btn--active={active}
  {onclick}
  aria-label={label}
  title={label}
  type="button"
>
  {@render icon()}
</button>

<style>
  .flowdrop-canvas-btn {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-md);
    background-color: var(--fd-background);
    color: var(--fd-muted-foreground);
    cursor: pointer;
    box-shadow: var(--fd-shadow-md);
    transition:
      color var(--fd-transition-fast),
      background-color var(--fd-transition-fast),
      box-shadow var(--fd-transition-fast),
      border-color var(--fd-transition-fast);
  }

  /* Size whatever inline SVG the caller renders. */
  .flowdrop-canvas-btn :global(svg) {
    width: 18px;
    height: 18px;
  }

  .flowdrop-canvas-btn:hover {
    color: var(--fd-foreground);
    background-color: var(--fd-subtle);
    box-shadow: var(--fd-shadow-lg);
  }

  .flowdrop-canvas-btn--active {
    color: var(--fd-primary);
    background-color: var(--fd-primary-muted);
    border-color: var(--fd-primary);
  }

  .flowdrop-canvas-btn--active:hover {
    color: var(--fd-primary);
    background-color: var(--fd-primary-muted);
  }
</style>
