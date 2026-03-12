<script lang="ts">
  import type { ConfigSchema, ConfigValues } from "$lib/types";
  import ConfigForm from "./ConfigForm.svelte";

  interface Props {
    isOpen: boolean;
    nodeLabel: string;
    configSchema: ConfigSchema;
    configValues: ConfigValues;
    onClose?: () => void;
    onSave?: (values: ConfigValues) => void;
    onCancel?: () => void;
  }

  let { onClose, onSave, onCancel, ...props }: Props = $props();
  let localConfigValues = $derived.by(() => ({ ...props.configValues }));

  function handleCancel() {
    onCancel?.();
  }

  function handleClose() {
    onClose?.();
  }

  // Close modal on escape key
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      handleClose();
    }
  }

  // Close modal when clicking outside
  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }
</script>

{#if props.isOpen}
  <!-- Modal Backdrop -->
  <div
    class="config-modal-backdrop"
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="config-modal-title"
    tabindex="-1"
  >
    <!-- Modal Container -->
    <div class="config-modal">
      <!-- Modal Header -->
      <div class="config-modal__header">
        <h2 id="config-modal-title" class="config-modal__title">
          Configure: {props.nodeLabel}
        </h2>
        <button
          type="button"
          class="config-modal__close-btn"
          onclick={handleClose}
          aria-label="Close configuration modal"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>

      <!-- Modal Content -->
      <div class="config-modal__content">
        <ConfigForm
          schema={props.configSchema}
          values={localConfigValues}
          showUIExtensions={false}
          onSave={(config) => {
            onSave?.(config);
          }}
          onCancel={handleCancel}
        />
      </div>
    </div>
  </div>
{/if}

<style>
  .config-modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .config-modal {
    background: white;
    border-radius: 0.75rem;
    box-shadow:
      0 20px 25px -5px rgba(0, 0, 0, 0.1),
      0 10px 10px -5px rgba(0, 0, 0, 0.04);
    width: 100%;
    max-width: 80vw;
    min-width: 40rem;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .config-modal__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem 1.5rem 1rem 1.5rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .config-modal__title {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
  }

  .config-modal__close-btn {
    width: 2rem;
    height: 2rem;
    border: none;
    background: transparent;
    border-radius: 0.375rem;
    color: #6b7280;
    font-size: 1.5rem;
    font-weight: 400;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .config-modal__close-btn:hover {
    background-color: #f3f4f6;
    color: #374151;
  }

  .config-modal__content {
    padding: 1.5rem;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }

  /* Responsive adjustments */
  @media (max-width: 1024px) {
    .config-modal {
      max-width: 90vw;
      min-width: 32rem;
    }
  }

  @media (max-width: 768px) {
    .config-modal {
      max-width: 95vw;
      min-width: 24rem;
    }

    .config-modal__header {
      padding: 1rem 1rem 0.75rem 1rem;
    }

    .config-modal__content {
      padding: 1rem;
    }
  }

  @media (max-width: 640px) {
    .config-modal {
      max-width: 100%;
      min-width: auto;
      margin: 0.5rem;
    }
  }
</style>
