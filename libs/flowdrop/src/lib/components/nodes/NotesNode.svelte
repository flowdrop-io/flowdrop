<script lang="ts">
  import type { ConfigValues, NodeMetadata } from "../../types/index.js";
  import Icon from "@iconify/svelte";
  import MarkdownDisplay from "../MarkdownDisplay.svelte";

  /**
   * NotesNode component props
   * Displays a styled note with markdown content
   */
  const props = $props<{
    data: {
      label: string;
      config: ConfigValues;
      metadata: NodeMetadata;
      nodeId?: string;
      onConfigOpen?: (node: {
        id: string;
        type: string;
        data: { label: string; config: ConfigValues; metadata: NodeMetadata };
      }) => void;
    };
    selected?: boolean;
    isProcessing?: boolean;
    isError?: boolean;
  }>();

  /** Note content derived from config */
  const noteContent = $derived(
    (props.data.config?.content as string) || "Add your notes here...",
  );

  /** Note type derived from config */
  const noteType = $derived((props.data.config?.noteType as string) || "info");

  /** Note type configuration with styling for each type */
  const noteTypes = {
    info: {
      name: "Info",
      typeClass: "flowdrop-notes-node--info",
      icon: "mdi:information",
    },
    warning: {
      name: "Warning",
      typeClass: "flowdrop-notes-node--warning",
      icon: "mdi:alert",
    },
    success: {
      name: "Success",
      typeClass: "flowdrop-notes-node--success",
      icon: "mdi:check-circle",
    },
    error: {
      name: "Error",
      typeClass: "flowdrop-notes-node--error",
      icon: "mdi:close-circle",
    },
    note: {
      name: "Note",
      typeClass: "flowdrop-notes-node--note",
      icon: "mdi:note-text",
    },
  };

  /** Current note type configuration based on selected type */
  const currentType = $derived(
    noteTypes[noteType as keyof typeof noteTypes] || noteTypes.info,
  );

  /**
   * Opens the configuration sidebar for editing note properties
   */
  function openConfigSidebar(): void {
    if (props.data.onConfigOpen) {
      const nodeForConfig = {
        id: props.data.nodeId || "unknown",
        type: "note",
        data: props.data,
      };
      props.data.onConfigOpen(nodeForConfig);
    }
  }

  /**
   * Handles double-click to open config sidebar
   */
  function handleDoubleClick(): void {
    openConfigSidebar();
  }

  /**
   * Handles keyboard events for accessibility
   * @param event - The keyboard event
   */
  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleDoubleClick();
    }
  }
</script>

<div
  class="flowdrop-notes-node {currentType.typeClass}"
  class:flowdrop-notes-node--selected={props.selected}
  class:flowdrop-notes-node--processing={props.isProcessing}
  class:flowdrop-notes-node--has-error={props.isError}
  ondblclick={handleDoubleClick}
  onkeydown={handleKeydown}
  role="button"
  tabindex="0"
>
  <!-- Display Mode -->
  <div class="flowdrop-notes-node__content">
    <!-- Header with icon and type -->
    <div class="flowdrop-notes-node__header">
      <div class="flowdrop-notes-node__header-left">
        <div class="flowdrop-notes-node__icon-wrapper">
          <Icon icon={currentType.icon} class="flowdrop-notes-node__icon" />
        </div>
        <span class="flowdrop-notes-node__type">{currentType.name}</span>
      </div>
    </div>

    <!-- Rendered markdown content -->
    <div class="flowdrop-notes-node__body">
      <MarkdownDisplay
        content={noteContent}
        className="flowdrop-notes-node__markdown"
      />
    </div>

    <!-- Processing indicator -->
    {#if props.isProcessing}
      <div class="flowdrop-notes-node__processing">
        <div class="flowdrop-notes-node__spinner"></div>
        <span>Processing...</span>
      </div>
    {/if}

    <!-- Error indicator -->
    {#if props.isError}
      <div class="flowdrop-notes-node__error-indicator">
        <Icon icon="mdi:alert-circle" class="flowdrop-notes-node__error-icon" />
        <span>Error occurred</span>
      </div>
    {/if}
  </div>

  <!-- Config button -->
  <button
    class="flowdrop-notes-node__config-btn"
    onclick={openConfigSidebar}
    title="Configure note"
  >
    <Icon icon="mdi:cog" />
  </button>
</div>

<style>
  .flowdrop-notes-node {
    min-width: var(--fd-notes-node-min-width);
    max-width: var(--fd-notes-node-max-width);
    width: var(--fd-notes-node-width);
    border-radius: var(--fd-radius-xl);
    border: 1.5px solid var(--fd-node-border);
    background: var(--fd-card);
    backdrop-filter: var(--fd-notes-node-backdrop-filter);
    box-shadow: var(--fd-shadow-md);
    color: var(--fd-foreground);
    transition: all var(--fd-transition-fast);
    overflow: hidden;
    z-index: 5;
  }

  /* Note type: Info (blue) - subtle background tint, neutral border */
  .flowdrop-notes-node--info {
    background-color: var(--fd-info-muted);
    --_notes-icon: var(--fd-primary);
  }

  /* Note type: Warning (yellow/amber) - subtle background tint */
  .flowdrop-notes-node--warning {
    background-color: var(--fd-warning-muted);
    --_notes-icon: var(--fd-warning);
  }

  /* Note type: Success (green) - subtle background tint */
  .flowdrop-notes-node--success {
    background-color: var(--fd-success-muted);
    --_notes-icon: var(--fd-success);
  }

  /* Note type: Error (red) - subtle background tint */
  .flowdrop-notes-node--error {
    background-color: var(--fd-error-muted);
    --_notes-icon: var(--fd-error);
  }

  /* Note type: Note (gray/neutral) - subtle background tint */
  .flowdrop-notes-node--note {
    background-color: var(--fd-muted);
    --_notes-icon: var(--fd-muted-foreground);
  }

  .flowdrop-notes-node:hover {
    box-shadow: var(--fd-shadow-lg);
    border-color: var(--fd-node-border-hover);
  }

  /* Selected state - matches other node components */
  .flowdrop-notes-node--selected {
    box-shadow:
      0 0 0 2px var(--fd-primary-muted),
      var(--fd-shadow-lg);
    border-color: var(--fd-primary);
  }

  .flowdrop-notes-node--selected:hover {
    box-shadow:
      0 0 0 2px var(--fd-primary-muted),
      var(--fd-shadow-lg);
    border-color: var(--fd-primary);
  }

  .flowdrop-notes-node:focus-visible {
    outline: 2px solid var(--fd-ring);
    outline-offset: 2px;
  }

  .flowdrop-notes-node--processing {
    opacity: 0.7;
  }

  .flowdrop-notes-node--has-error {
    border-color: var(--fd-error) !important;
    background-color: var(--fd-error-muted) !important;
  }

  /* Display Mode Styles */
  .flowdrop-notes-node__content {
    padding: var(--fd-space-xl);
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .flowdrop-notes-node__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
    flex-shrink: 0;
  }

  .flowdrop-notes-node__header-left {
    display: flex;
    align-items: center;
    gap: var(--fd-space-md);
  }

  /* Squircle icon wrapper - Apple-style rounded square background */
  .flowdrop-notes-node__icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 0.5rem;
    background: color-mix(
      in srgb,
      var(--_notes-icon) var(--fd-node-icon-bg-opacity),
      transparent
    );
    flex-shrink: 0;
    transition: all var(--fd-transition-normal);
  }

  .flowdrop-notes-node:hover .flowdrop-notes-node__icon-wrapper {
    background: color-mix(
      in srgb,
      var(--_notes-icon) var(--fd-node-icon-bg-opacity-hover),
      transparent
    );
    transform: scale(1.05);
  }

  .flowdrop-notes-node__icon-wrapper :global(.flowdrop-notes-node__icon) {
    width: 1.25rem;
    height: 1.25rem;
    color: var(--fd-node-icon);
  }

  .flowdrop-notes-node__type {
    font-size: var(--fd-text-sm);
    font-weight: 500;
    color: var(--fd-foreground);
  }

  .flowdrop-notes-node__body {
    margin-bottom: var(--fd-space-xs);
    flex: 1;
    overflow-y: auto;
    color: var(--fd-muted-foreground);
  }

  /* Markdown content inherits foreground color for better readability */
  .flowdrop-notes-node__body :global(.flowdrop-notes-node__markdown) {
    color: var(--fd-foreground);
  }

  .flowdrop-notes-node__processing {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
  }

  .flowdrop-notes-node__spinner {
    width: 0.75rem;
    height: 0.75rem;
    border: 1px solid color-mix(in srgb, var(--fd-foreground) 30%, transparent);
    border-top-color: var(--fd-foreground);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .flowdrop-notes-node__error-indicator {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    font-size: var(--fd-text-xs);
    color: var(--fd-error);
  }

  :global(.flowdrop-notes-node__error-icon) {
    width: 0.75rem;
    height: 0.75rem;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .flowdrop-notes-node__config-btn {
    position: absolute;
    top: var(--fd-space-xs);
    right: var(--fd-space-xs);
    width: 1.5rem;
    height: 1.5rem;
    background-color: var(--fd-backdrop);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-sm);
    color: var(--fd-muted-foreground);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: all var(--fd-transition-normal);
    backdrop-filter: var(--fd-backdrop-blur);
    z-index: 15;
    font-size: var(--fd-text-sm);
  }

  .flowdrop-notes-node:hover .flowdrop-notes-node__config-btn {
    opacity: 1;
  }

  .flowdrop-notes-node__config-btn:hover {
    background-color: var(--fd-muted);
    border-color: var(--fd-border-strong);
    color: var(--fd-foreground);
  }

  /* Responsive design */
  @media (max-width: 640px) {
    .flowdrop-notes-node {
      min-width: 200px;
      max-width: 350px;
    }

    .flowdrop-notes-node__content {
      padding: var(--fd-space-md);
    }
  }
</style>
