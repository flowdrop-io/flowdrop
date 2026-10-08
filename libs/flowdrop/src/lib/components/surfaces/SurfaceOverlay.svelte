<!--
  SurfaceOverlay
  A reusable centered modal shell used to host a surface (or a TabbedSurface of
  several) in the `modal` placement. Portals to `document.body` so the fixed
  backdrop escapes any ancestor that establishes a containing block (transform,
  filter, backdrop-filter, …). Esc and backdrop-click close it.

  Promotes the modal shell first built inline in ConfigPanel so config, console,
  and chat can all float when their placement is `modal`.
-->

<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from '@iconify/svelte';
  import PanelHeader from '../primitives/PanelHeader.svelte';
  import IconButton from '../primitives/IconButton.svelte';
  import { portal } from '$lib/utils/portal.js';

  interface Props {
    /** Header title. */
    title: string;
    /** Accessible label for the close button. */
    closeLabel?: string;
    /** Called on Esc, backdrop click, or the close button. */
    onClose: () => void;
    /** Overlay body. */
    children: Snippet;
  }

  const { title, closeLabel = 'Close', onClose, children }: Props = $props();

  const uid = $props.id();
  const titleId = `${uid}-surface-overlay-title`;

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
    }
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="surface-overlay__backdrop"
  use:portal
  onclick={handleBackdropClick}
  onkeydown={handleKeydown}
>
  <div
    class="surface-overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby={titleId}
    tabindex="-1"
  >
    <PanelHeader {title} {titleId}>
      {#snippet actions()}
        <IconButton ariaLabel={closeLabel} onclick={onClose}>
          <Icon icon="heroicons:x-mark" />
        </IconButton>
      {/snippet}
    </PanelHeader>
    <div class="surface-overlay__body">
      {@render children()}
    </div>
  </div>
</div>

<style>
  .surface-overlay__backdrop {
    position: fixed;
    inset: 0;
    /*
      Portalled to document.body, this shell sits outside the editor container
      that carries the app font, so it would otherwise inherit the host page's
      default (e.g. serif on a bare Drupal page). Re-establish the font here,
      mirroring the mount container's declaration.
    */
    font-family: var(--fd-font-family, system-ui, -apple-system, sans-serif);
    background-color: var(--fd-backdrop, rgba(0, 0, 0, 0.5));
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .surface-overlay {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 48rem;
    max-height: 90vh;
    background-color: var(--fd-panel-bg, var(--fd-card));
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-lg, 0.75rem);
    box-shadow: var(--fd-shadow-lg, 0 20px 25px -5px rgba(0, 0, 0, 0.25));
    overflow: hidden;
  }

  .surface-overlay__body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  @media (max-width: 640px) {
    .surface-overlay {
      max-width: 100%;
      max-height: 95vh;
    }
  }
</style>
