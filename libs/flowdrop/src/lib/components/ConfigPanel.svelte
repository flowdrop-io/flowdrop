<!--
  ConfigPanel Component
  A generic panel for displaying details and configuration
  Can be used for node config, workflow settings, or any entity with an ID
  Accepts a slot for custom form content
  Styled with BEM syntax
-->

<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from '@iconify/svelte';
  import ReadOnlyDetails from './ReadOnlyDetails.svelte';
  import PanelHeader from './primitives/PanelHeader.svelte';
  import IconButton from './primitives/IconButton.svelte';
  import { getUiSettings } from '../stores/settingsStore.svelte.js';
  import { m } from '$lib/messages/index.js';
  import { portal } from '$lib/utils/portal.js';

  /**
   * A single detail item with label and value
   */
  interface DetailItem {
    /** The label to display */
    label: string;
    /** The value to display */
    value: string;
  }

  /**
   * Props interface for ConfigPanel component
   */
  interface Props {
    /** Panel title displayed in the header */
    title: string;
    /** Unique identifier to display with copy button */
    id?: string;
    /** Optional description text */
    description?: string;
    /** Array of label-value pairs to display */
    details?: DetailItem[];
    /** Title for the configuration section */
    configTitle?: string;
    /** Callback function when the panel is closed. Without it the panel has no close control. */
    onClose?: () => void;
    /** Optional callback to initiate node swap — when provided, shows swap button */
    onSwap?: () => void;
    /**
     * Whether to show the "pop out" control that opens the panel content in a
     * wide centered modal — useful when the narrow sidebar cramps fields such
     * as prompts. Defaults to true.
     */
    expandable?: boolean;
    /** Slot content for the configuration form */
    children?: Snippet;
  }

  const {
    title,
    id,
    description,
    details = [],
    configTitle,
    onClose,
    onSwap,
    expandable = true,
    children
  }: Props = $props();

  /** Whether the panel content is currently popped out into the modal. */
  let expanded = $state(false);

  // Unique per component instance so two FlowDrop editors on one page don't
  // render colliding DOM ids (a11y).
  const uid = $props.id();
  const titleId = `${uid}-config-panel-title`;

  /**
   * Check if details section should be shown
   */
  const hasDetails = $derived(id !== undefined || details.length > 0 || description !== undefined);

  /** Dock the popped-out content back into the sidebar (Esc / backdrop click). */
  function dock() {
    expanded = false;
  }

  function handleModalKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      dock();
    }
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      dock();
    }
  }
</script>

<!--
  The details + configuration content is rendered as a snippet so it can live
  in exactly one place at a time — the sidebar rail while docked, or the modal
  while popped out — without duplicating the form (a Snippet can only be
  rendered once).
-->
{#snippet panelContent()}
  <!-- One scroll area for meta + form, so scrolled fields never slide under the meta block. -->
  <div class="config-panel__scroll">
    {#if hasDetails && id}
      <div class="config-panel__details">
        <ReadOnlyDetails {id} {description} {details} />
      </div>
    {/if}

    <div class="config-panel__content">
      {#if children}
        <div class="config-panel__section">
          {#if configTitle}
            <h3 class="config-panel__section-title">{configTitle}</h3>
          {/if}
          {@render children()}
        </div>
      {/if}
    </div>
  </div>
{/snippet}

<!-- Header controls, shared by the docked panel and the popped-out modal. -->
{#snippet headerActions(popped: boolean)}
  {#if popped}
    <IconButton ariaLabel={m().layout.dockConfig} title={m().layout.dockConfigTitle} onclick={dock}>
      <Icon icon="heroicons:arrows-pointing-in" />
    </IconButton>
  {:else}
    {#if onSwap}
      <IconButton ariaLabel={m().layout.swapNode} title={m().layout.swapNodeTitle} onclick={onSwap}>
        <Icon icon="heroicons:arrows-right-left" />
      </IconButton>
    {/if}
    {#if expandable && !expanded}
      <IconButton
        ariaLabel={m().layout.popOutConfig}
        title={m().layout.popOutConfigTitle}
        onclick={() => (expanded = true)}
      >
        <Icon icon="heroicons:arrows-pointing-out" />
      </IconButton>
    {/if}
  {/if}
  {#if onClose}
    <IconButton ariaLabel={m().layout.closeConfigPanel} onclick={onClose}>
      <Icon icon="heroicons:x-mark" />
    </IconButton>
  {/if}
{/snippet}

<!--
  While the content is popped out the docked panel is empty and its sidebar
  collapses (see the :global rules below) instead of showing a placeholder.
-->
<div
  class="config-panel"
  class:config-panel--compact={getUiSettings().compactMode}
  class:config-panel--popped={expanded}
>
  {#if !expanded}
    <PanelHeader {title}>
      {#snippet actions()}
        {@render headerActions(false)}
      {/snippet}
    </PanelHeader>
    {@render panelContent()}
  {/if}
</div>

{#if expanded}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="config-panel-modal__backdrop"
    use:portal
    onclick={handleBackdropClick}
    onkeydown={handleModalKeydown}
  >
    <div
      class="config-panel-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabindex="-1"
    >
      <PanelHeader {title} {titleId}>
        {#snippet actions()}
          {@render headerActions(true)}
        {/snippet}
      </PanelHeader>

      <div class="config-panel-modal__body">
        {@render panelContent()}
      </div>
    </div>
  </div>
{/if}

<style>
  .config-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: var(--fd-panel-bg);
    backdrop-filter: var(--fd-panel-backdrop-filter);
  }

  .config-panel__scroll {
    --fd-inspector-pad-x: var(--fd-space-xl);
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  /* The meta lines scroll with the content: no band, no rule, no overlap. */
  .config-panel__details {
    padding: var(--fd-space-md) var(--fd-inspector-pad-x) 0;
    flex-shrink: 0;
  }

  .config-panel :global(.flowdrop-ui-panel-header__title) {
    font-size: var(--fd-inspector-title-size);
  }

  .config-panel__content {
    flex: 1 0 auto;
    padding: var(--fd-space-md) var(--fd-inspector-pad-x) var(--fd-space-xl);
  }

  .config-panel__section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .config-panel__section-title {
    margin: 0;
    font-size: var(--fd-text-xs);
    font-weight: 600;
    color: var(--fd-muted-foreground);
  }

  /* Compact Mode Styles */
  .config-panel--compact .config-panel__scroll {
    --fd-inspector-pad-x: var(--fd-space-md);
  }

  .config-panel--compact .config-panel__section {
    gap: 0.5rem;
  }

  /* Popped out: the rail it sat in collapses (and its resize handle with it). */
  :global(.flowdrop-main-layout__sidebar--right:has(.config-panel--popped)),
  :global(
    .flowdrop-main-layout__divider--right:has(
      + .flowdrop-main-layout__sidebar--right .config-panel--popped
    )
  ) {
    display: none;
  }

  /* Pop-out modal */
  .config-panel-modal__backdrop {
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

  .config-panel-modal {
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

  .config-panel-modal__body {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* Inside the modal the content area should breathe on a wider canvas. */
  .config-panel-modal__body .config-panel__scroll {
    --fd-inspector-pad-x: var(--fd-space-3xl);
  }

  .config-panel-modal__body .config-panel__content {
    padding-top: var(--fd-space-xl);
    padding-bottom: var(--fd-space-3xl);
  }

  @media (max-width: 640px) {
    .config-panel-modal {
      max-width: 100%;
      max-height: 95vh;
    }
  }
</style>
