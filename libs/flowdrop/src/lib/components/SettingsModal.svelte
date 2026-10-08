<!--
  Settings Modal Component

  A modal dialog wrapper for the SettingsPanel component.
  Provides backdrop, close button, and keyboard navigation.

  Features:
  - Click backdrop to close
  - Escape key to close
  - Smooth open/close animations
  - Focus trap for accessibility
  - Responsive sizing

  @example
  ```svelte
  <script>
    import { SettingsModal } from "@flowdrop/flowdrop";
    let open = $state(false);
  </script>

  <button onclick={() => open = true}>Open Settings</button>
  <SettingsModal bind:open />
  ```
-->

<script lang="ts">
  import Icon from '@iconify/svelte';
  import SettingsPanel from './SettingsPanel.svelte';
  import PanelHeader from './primitives/PanelHeader.svelte';
  import IconButton from './primitives/IconButton.svelte';
  import type { SettingsCategory } from '$lib/types/settings.js';
  import { m } from '$lib/messages/index.js';

  /**
   * Props interface for SettingsModal component
   */
  interface Props {
    /** Whether the modal is open */
    open?: boolean;
    /** Categories to display in the settings panel */
    categories?: SettingsCategory[];
    /** Show the "Sync to Cloud" button */
    showSyncButton?: boolean;
    /** Show the reset button */
    showResetButton?: boolean;
    /** Callback when modal is closed */
    onClose?: () => void;
    /** Callback when settings change */
    onSettingsChange?: (category: SettingsCategory, values: Record<string, unknown>) => void;
    /** Custom CSS class for the modal */
    class?: string;
  }

  let {
    open = $bindable(false),
    categories,
    showSyncButton = true,
    showResetButton = true,
    onClose,
    onSettingsChange,
    class: className = ''
  }: Props = $props();

  // Unique per component instance so two FlowDrop editors on one page
  // don't render colliding DOM ids (a11y).
  const uid = $props.id();
  const titleId = `${uid}-settings-modal-title`;

  /**
   * Reference to the modal dialog element
   */
  let dialogRef = $state<HTMLDialogElement | null>(null);

  /**
   * Handle modal open/close state changes
   */
  $effect(() => {
    if (dialogRef) {
      if (open) {
        dialogRef.showModal();
      } else {
        dialogRef.close();
      }
    }
  });

  /**
   * Close the modal
   */
  function closeModal(): void {
    open = false;
    if (onClose) {
      onClose();
    }
  }

  /**
   * Handle backdrop click
   */
  function handleBackdropClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target === dialogRef) {
      closeModal();
    }
  }

  /**
   * Handle keyboard events
   */
  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
    }
  }

  /**
   * Handle native dialog close event
   */
  function handleDialogClose(): void {
    open = false;
    if (onClose) {
      onClose();
    }
  }
</script>

<!-- native <dialog> backdrop click-to-close pattern -->
<dialog
  bind:this={dialogRef}
  class="flowdrop-scope flowdrop-settings-modal {className}"
  onclick={handleBackdropClick}
  onkeydown={handleKeydown}
  onclose={handleDialogClose}
  aria-labelledby={titleId}
>
  <div class="flowdrop-settings-modal__container">
    <!-- Header -->
    <PanelHeader title={m().navigation.settingsTitle} {titleId}>
      {#snippet actions()}
        <IconButton
          ariaLabel={m().navigation.closeSettings}
          title={m().common.close}
          onclick={closeModal}
        >
          <Icon icon="mdi:close" />
        </IconButton>
      {/snippet}
    </PanelHeader>

    <!-- Content -->
    <div class="flowdrop-settings-modal__content">
      <SettingsPanel
        {categories}
        {showSyncButton}
        {showResetButton}
        {onSettingsChange}
        onClose={closeModal}
      />
    </div>
  </div>
</dialog>

<style>
  .flowdrop-settings-modal {
    position: fixed;
    inset: 0;
    width: 100%;
    max-width: 100%;
    height: 100%;
    max-height: 100%;
    margin: 0;
    padding: 0;
    border: none;
    background-color: transparent;
    overflow: hidden;
  }

  .flowdrop-settings-modal::backdrop {
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
  }

  .flowdrop-settings-modal[open] {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .flowdrop-settings-modal__container {
    display: flex;
    flex-direction: column;
    width: 90vw;
    max-width: 640px;
    max-height: min(80vh, 700px);
    background-color: var(--fd-background);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-modal-radius);
    box-shadow: var(--fd-shadow-lg, 0 25px 50px -12px rgba(0, 0, 0, 0.25));
    overflow: hidden;
    animation: flowdrop-modal-enter 0.2s ease-out;
  }

  @keyframes flowdrop-modal-enter {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .flowdrop-settings-modal__container :global(.flowdrop-ui-panel-header) {
    height: var(--fd-modal-header-height);
  }

  .flowdrop-settings-modal__container :global(.flowdrop-ui-panel-header__title) {
    font-size: var(--fd-modal-title-size);
  }

  /* Content */
  .flowdrop-settings-modal__content {
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .flowdrop-settings-modal__content :global(.flowdrop-settings-panel) {
    flex: 1 1 auto;
    min-height: 0;
    height: auto;
  }

  /* Responsive adjustments */
  @media (max-width: 640px) {
    .flowdrop-settings-modal__container {
      width: 100%;
      height: 100%;
      max-width: 100%;
      max-height: 100%;
      border-radius: 0;
    }
  }
</style>
