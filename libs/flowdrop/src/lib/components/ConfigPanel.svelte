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
    /** Callback function when the panel is closed */
    onClose: () => void;
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
    configTitle = 'Configuration',
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
  {#if hasDetails && id}
    <div class="config-panel__details">
      <ReadOnlyDetails {id} {description} {details} />
    </div>
  {/if}

  <div class="config-panel__content">
    {#if children}
      <div class="config-panel__section">
        <h3 class="config-panel__section-title">{configTitle}</h3>
        {@render children()}
      </div>
    {/if}
  </div>
{/snippet}

<div class="config-panel" class:config-panel--compact={getUiSettings().compactMode}>
  <!-- Header -->
  <div class="config-panel__header">
    <h2 class="config-panel__title">{title}</h2>
    <div class="config-panel__actions">
      {#if onSwap}
        <button
          class="config-panel__action-btn"
          onclick={onSwap}
          aria-label={m().layout.swapNode}
          title="Swap node type"
        >
          <Icon icon="heroicons:arrows-right-left" />
        </button>
      {/if}
      {#if expandable && !expanded}
        <button
          class="config-panel__action-btn"
          onclick={() => (expanded = true)}
          aria-label="Pop out configuration"
          title="Pop out to a larger window"
        >
          <Icon icon="heroicons:arrows-pointing-out" />
        </button>
      {/if}
      <button
        class="config-panel__close"
        onclick={onClose}
        aria-label={m().layout.closeConfigPanel}
      >
        ×
      </button>
    </div>
  </div>

  {#if expanded}
    <!-- Content is popped out into the modal; show a lightweight placeholder. -->
    <div class="config-panel__popped">
      <Icon icon="heroicons:window" class="config-panel__popped-icon" />
      <p class="config-panel__popped-text">Configuration is open in a larger window.</p>
      <button class="config-panel__popped-btn" onclick={dock}> Dock back to sidebar </button>
    </div>
  {:else}
    {@render panelContent()}
  {/if}
</div>

{#if expanded}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
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
      <div class="config-panel-modal__header">
        <h2 id={titleId} class="config-panel-modal__title">{title}</h2>
        <div class="config-panel__actions">
          <button
            class="config-panel__action-btn"
            onclick={dock}
            aria-label="Dock configuration back to sidebar"
            title="Dock back to sidebar"
          >
            <Icon icon="heroicons:arrows-pointing-in" />
          </button>
          <button
            class="config-panel__close"
            onclick={onClose}
            aria-label={m().layout.closeConfigPanel}
          >
            ×
          </button>
        </div>
      </div>

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

  .config-panel__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.875rem 1rem;
    border-bottom: 1px solid var(--fd-border);
    background-color: var(--fd-card);
    flex-shrink: 0;
  }

  .config-panel__title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--fd-foreground);
  }

  .config-panel__actions {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .config-panel__action-btn {
    background: none;
    border: none;
    font-size: 1rem;
    line-height: 1;
    cursor: pointer;
    color: var(--fd-muted-foreground);
    padding: 0.25rem;
    border-radius: var(--fd-radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      color var(--fd-transition-fast),
      background-color var(--fd-transition-fast);
  }

  .config-panel__action-btn:hover {
    color: var(--fd-primary);
    background-color: var(--fd-subtle);
  }

  .config-panel__close {
    background: none;
    border: none;
    font-size: 1.25rem;
    line-height: 1;
    cursor: pointer;
    color: var(--fd-muted-foreground);
    padding: 0.25rem;
    border-radius: var(--fd-radius-sm);
    transition:
      color var(--fd-transition-fast),
      background-color var(--fd-transition-fast);
  }

  .config-panel__close:hover {
    color: var(--fd-foreground);
    background-color: var(--fd-subtle);
  }

  .config-panel__details {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--fd-border-muted);
    background-color: var(--fd-card);
    flex-shrink: 0;
  }

  .config-panel__content {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
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
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Compact Mode Styles */
  .config-panel--compact .config-panel__header {
    padding: 0.5rem 0.75rem;
  }

  .config-panel--compact .config-panel__title {
    font-size: 0.875rem;
  }

  .config-panel--compact .config-panel__close {
    font-size: 1rem;
    padding: 0.125rem;
  }

  .config-panel--compact .config-panel__action-btn {
    font-size: 0.875rem;
    padding: 0.125rem;
  }

  .config-panel--compact .config-panel__details {
    padding: 0.5rem 0.75rem;
  }

  .config-panel--compact .config-panel__content {
    padding: 0.75rem;
  }

  .config-panel--compact .config-panel__section {
    gap: 0.5rem;
  }

  /* Popped-out placeholder (shown in the rail while the modal is open) */
  .config-panel__popped {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 2rem 1rem;
    text-align: center;
    color: var(--fd-muted-foreground);
  }

  .config-panel__popped :global(.config-panel__popped-icon) {
    width: 2rem;
    height: 2rem;
    opacity: 0.6;
  }

  .config-panel__popped-text {
    margin: 0;
    font-size: var(--fd-text-sm);
  }

  .config-panel__popped-btn {
    border: 1px solid var(--fd-border);
    background-color: var(--fd-card);
    color: var(--fd-foreground);
    padding: 0.375rem 0.75rem;
    border-radius: var(--fd-radius-sm);
    font-size: var(--fd-text-sm);
    cursor: pointer;
    transition:
      color var(--fd-transition-fast),
      background-color var(--fd-transition-fast),
      border-color var(--fd-transition-fast);
  }

  .config-panel__popped-btn:hover {
    color: var(--fd-primary);
    border-color: var(--fd-primary);
    background-color: var(--fd-subtle);
  }

  /* Pop-out modal */
  .config-panel-modal__backdrop {
    position: fixed;
    inset: 0;
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

  .config-panel-modal__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.875rem 1rem;
    border-bottom: 1px solid var(--fd-border);
    background-color: var(--fd-card);
    flex-shrink: 0;
  }

  .config-panel-modal__title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--fd-foreground);
  }

  .config-panel-modal__body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  /* Inside the modal the content area should breathe on a wider canvas. */
  .config-panel-modal__body .config-panel__content {
    padding: 1.25rem 1.5rem;
  }

  @media (max-width: 640px) {
    .config-panel-modal {
      max-width: 100%;
      max-height: 95vh;
    }
  }
</style>
