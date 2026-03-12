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
  import Icon from "@iconify/svelte";
  import SettingsPanel from "./SettingsPanel.svelte";
  import type { SettingsCategory } from "$lib/types/settings.js";

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
    onSettingsChange?: (
      category: SettingsCategory,
      values: Record<string, unknown>,
    ) => void;
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
    class: className = "",
  }: Props = $props();

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
    if (event.key === "Escape") {
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

<!-- svelte-ignore a11y_no_noninteractive_element_interactions — native <dialog> backdrop click-to-close pattern -->
<dialog
  bind:this={dialogRef}
  class="flowdrop-settings-modal {className}"
  onclick={handleBackdropClick}
  onkeydown={handleKeydown}
  onclose={handleDialogClose}
  aria-labelledby="settings-modal-title"
>
  <div class="flowdrop-settings-modal__container">
    <!-- Header -->
    <div class="flowdrop-settings-modal__header">
      <h2 id="settings-modal-title" class="flowdrop-settings-modal__title">
        <Icon icon="mdi:cog" class="flowdrop-settings-modal__title-icon" />
        Settings
      </h2>
      <button
        class="flowdrop-settings-modal__close"
        onclick={closeModal}
        aria-label="Close settings"
        title="Close"
      >
        <Icon icon="mdi:close" />
      </button>
    </div>

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
    height: 80vh;
    max-height: 700px;
    background-color: var(--fd-background);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-lg);
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

  /* Header */
  .flowdrop-settings-modal__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--fd-space-xl);
    border-bottom: 1px solid var(--fd-border);
    flex-shrink: 0;
  }

  .flowdrop-settings-modal__title {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    margin: 0;
    font-size: var(--fd-text-lg);
    font-weight: 600;
    color: var(--fd-foreground);
  }

  :global(.flowdrop-settings-modal__title-icon) {
    font-size: var(--fd-text-xl);
    color: var(--fd-muted-foreground);
  }

  .flowdrop-settings-modal__close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: var(--fd-radius-md);
    background-color: transparent;
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-lg);
    cursor: pointer;
    transition: all var(--fd-transition-fast);
  }

  .flowdrop-settings-modal__close:hover {
    background-color: var(--fd-muted);
    color: var(--fd-foreground);
  }

  .flowdrop-settings-modal__close:focus {
    outline: none;
    box-shadow: 0 0 0 2px var(--fd-ring);
  }

  /* Content */
  .flowdrop-settings-modal__content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
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
