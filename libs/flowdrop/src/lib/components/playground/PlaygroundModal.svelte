<!--
  PlaygroundModal Component
  
  Modal wrapper for the Playground component.
  Provides a centered modal dialog with backdrop, similar to Langflow's implementation.
  Supports closing via backdrop click, Escape key, or close button.
-->

<script lang="ts">
  import Icon from "@iconify/svelte";
  import Playground from "./Playground.svelte";
  import type { Workflow } from "../../types/index.js";
  import type { EndpointConfig } from "../../config/endpoints.js";
  import type { PlaygroundConfig } from "../../types/playground.js";

  /**
   * Component props
   */
  interface Props {
    /** Whether the modal is open */
    isOpen: boolean;
    /** Target workflow ID */
    workflowId: string;
    /** Pre-loaded workflow (optional, will be fetched if not provided) */
    workflow?: Workflow;
    /** Resume a specific session */
    initialSessionId?: string;
    /** API endpoint configuration */
    endpointConfig?: EndpointConfig;
    /** Playground configuration options */
    config?: PlaygroundConfig;
    /** Callback when modal is closed */
    onClose: () => void;
  }

  let {
    isOpen,
    workflowId,
    workflow,
    initialSessionId,
    endpointConfig,
    config = {},
    onClose,
  }: Props = $props();

  /**
   * Close modal on Escape key
   */
  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      onClose();
    }
  }

  /**
   * Close modal when clicking outside (on backdrop)
   */
  function handleBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }
</script>

{#if isOpen}
  <!-- Modal Backdrop -->
  <div
    class="playground-modal-backdrop"
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="playground-modal-title"
    tabindex="-1"
  >
    <!-- Modal Container -->
    <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events — role="presentation" container stops backdrop click propagation -->
    <div
      class="playground-modal"
      onclick={(e) => e.stopPropagation()}
      role="presentation"
    >
      <!-- Modal Header -->
      <div class="playground-modal__header">
        <div class="playground-modal__title" id="playground-modal-title">
          <Icon icon="mdi:play-circle-outline" />
          <span>Playground</span>
        </div>
        <button
          type="button"
          class="playground-modal__close-btn"
          onclick={onClose}
          aria-label="Close playground modal"
        >
          <Icon icon="mdi:close" />
        </button>
      </div>

      <!-- Modal Content -->
      <div class="playground-modal__content">
        <Playground
          {workflowId}
          {workflow}
          mode="modal"
          {initialSessionId}
          {endpointConfig}
          {config}
          {onClose}
        />
      </div>
    </div>
  </div>
{/if}

<style>
  .playground-modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--fd-backdrop);
    backdrop-filter: var(--fd-backdrop-blur);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1100;
    padding: var(--fd-space-xl);
  }

  .playground-modal {
    background: var(--fd-background);
    border-radius: var(--fd-radius-xl);
    box-shadow: var(--fd-shadow-xl);
    width: 100%;
    max-width: 90vw;
    min-width: 800px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .playground-modal__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--fd-space-xl) var(--fd-space-2xl);
    border-bottom: 1px solid var(--fd-border);
    background-color: var(--fd-muted);
    flex-shrink: 0;
  }

  .playground-modal__title {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    font-size: var(--fd-text-base);
    font-weight: 600;
    color: var(--fd-foreground);
    margin: 0;
  }

  .playground-modal__close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: none;
    background: transparent;
    border-radius: var(--fd-radius-md);
    color: var(--fd-muted-foreground);
    cursor: pointer;
    transition: all var(--fd-transition-normal);
  }

  .playground-modal__close-btn:hover {
    background-color: var(--fd-secondary);
    color: var(--fd-foreground);
  }

  .playground-modal__content {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 0;
  }

  /* Responsive adjustments */
  @media (max-width: 1024px) {
    .playground-modal {
      max-width: 95vw;
      min-width: 600px;
    }
  }

  @media (max-width: 768px) {
    .playground-modal {
      max-width: 100%;
      min-width: auto;
      max-height: 100vh;
      border-radius: 0;
      margin: 0;
    }

    .playground-modal-backdrop {
      padding: 0;
    }

    .playground-modal__header {
      padding: var(--fd-space-md) var(--fd-space-xl);
    }
  }

  @media (max-width: 640px) {
    .playground-modal {
      max-width: 100%;
      max-height: 100vh;
    }
  }
</style>
