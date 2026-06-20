<script lang="ts">
  import type { ConfigValues, NodeMetadata } from '../../types/index.js';
  import Icon from '@iconify/svelte';
  import NodeConfigButton from './NodeConfigButton.svelte';
  import MarkdownDisplay from '../MarkdownDisplay.svelte';
  import { m } from '$lib/messages/index.js';

  /**
   * NotesNode component props
   * Displays a styled note with markdown content
   */
  interface Props {
    id: string;
    data: {
      label: string;
      config: ConfigValues;
      metadata: NodeMetadata;
      onConfigOpen?: (node: {
        id: string;
        type: string;
        data: { label: string; config: ConfigValues; metadata: NodeMetadata };
      }) => void;
    };
    selected?: boolean;
    isProcessing?: boolean;
    isError?: boolean;
  }

  let props: Props = $props();

  // Hoist the notes branch — read for placeholder, every type name, processing,
  // error, and configure tooltip.
  const notes = $derived(m().nodes.notes);

  /** Note content derived from config */
  const noteContent = $derived((props.data.config?.content as string) || notes.placeholder);

  /** Note type derived from config */
  const noteType = $derived((props.data.config?.noteType as string) || 'info');

  /** Note type configuration with styling for each type. Type names track the
   * messages tree so locale changes flow through. */
  const noteTypes = $derived({
    info: {
      name: notes.types.info,
      typeClass: 'flowdrop-notes-node--info',
      icon: 'mdi:information'
    },
    warning: {
      name: notes.types.warning,
      typeClass: 'flowdrop-notes-node--warning',
      icon: 'mdi:alert'
    },
    success: {
      name: notes.types.success,
      typeClass: 'flowdrop-notes-node--success',
      icon: 'mdi:check-circle'
    },
    error: {
      name: notes.types.error,
      typeClass: 'flowdrop-notes-node--error',
      icon: 'mdi:close-circle'
    },
    note: {
      name: notes.types.default,
      typeClass: 'flowdrop-notes-node--note',
      icon: 'mdi:note-text'
    }
  });

  /** Current note type configuration based on selected type */
  const currentType = $derived(noteTypes[noteType as keyof typeof noteTypes] || noteTypes.info);

  /**
   * Opens the configuration sidebar for editing note properties
   */
  function openConfigSidebar(): void {
    if (props.data.onConfigOpen) {
      const nodeForConfig = {
        id: props.id,
        type: 'note',
        data: props.data
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
</script>

<!-- Presentational: focus, keyboard and selection live on xyflow's node
     wrapper (see UniversalNode). double-click is a mouse convenience. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="flowdrop-notes-node {currentType.typeClass}"
  class:flowdrop-notes-node--selected={props.selected}
  class:flowdrop-notes-node--processing={props.isProcessing}
  class:flowdrop-notes-node--has-error={props.isError}
  ondblclick={handleDoubleClick}
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
      <MarkdownDisplay content={noteContent} className="flowdrop-notes-node__markdown" />
    </div>

    <!-- Processing indicator -->
    {#if props.isProcessing}
      <div class="flowdrop-notes-node__processing">
        <div class="flowdrop-notes-node__spinner"></div>
        <span>{notes.processing}</span>
      </div>
    {/if}

    <!-- Error indicator -->
    {#if props.isError}
      <div class="flowdrop-notes-node__error-indicator">
        <Icon icon="mdi:alert-circle" class="flowdrop-notes-node__error-icon" />
        <span>{notes.errorOccurred}</span>
      </div>
    {/if}
  </div>

  <!-- Config button -->
  <NodeConfigButton onclick={openConfigSidebar} title={notes.configure} />
</div>

<style>
  .flowdrop-notes-node {
    box-sizing: border-box;
    min-width: var(--fd-notes-node-min-width);
    max-width: var(--fd-notes-node-max-width);
    width: var(--fd-notes-node-width);
    /* Grid-aligned floor; grows in 20px steps via the chrome + body below. */
    min-height: var(--fd-notes-node-min-height);
    border-radius: var(--fd-node-radius);
    border: var(--fd-node-border-width) solid var(--fd-note-border);
    background: var(--fd-node-bg);
    backdrop-filter: var(--fd-notes-node-backdrop-filter);
    box-shadow: var(--fd-node-shadow);
    color: var(--fd-foreground);
    transition: all var(--fd-transition-fast);
    overflow: hidden;
    z-index: 5;
  }

  /* Note type: Info (blue) - subtle background tint, neutral border.
     Uses the info accent (not primary) so an info note never reads as a
     primary/success action — primary stays reserved for interactive intent. */
  .flowdrop-notes-node--info {
    background-color: var(--fd-info-muted);
    --_notes-icon: var(--fd-info);
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
    box-shadow: var(--fd-node-shadow-hover);
    border-color: var(--fd-note-border-hover);
  }

  /* Selected state - matches other node components */
  .flowdrop-notes-node--selected {
    box-shadow:
      0 0 0 2px var(--fd-primary-muted),
      var(--fd-node-shadow-hover);
    border-color: var(--fd-primary);
  }

  .flowdrop-notes-node--selected:hover {
    box-shadow:
      0 0 0 2px var(--fd-primary-muted),
      var(--fd-node-shadow-hover);
    border-color: var(--fd-primary);
  }

  /* Focus ring is centralized in base.css (drawn on the .svelte-flow__node
     wrapper, which is the focusable element). */

  .flowdrop-notes-node--processing {
    opacity: 0.7;
  }

  .flowdrop-notes-node--has-error {
    border-color: var(--fd-error) !important;
    background-color: var(--fd-error-muted) !important;
  }

  /* Display Mode Styles */
  .flowdrop-notes-node__content {
    box-sizing: border-box;
    /* px on the 20px grid; bottom padding absorbs both node borders so the
       chrome (padding + 40px header + 20px gap) sums to 100px and the outer
       node height stays a 20px multiple as the body grows. */
    padding: 20px 20px calc(20px - var(--fd-node-border-width) * 2);
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .flowdrop-notes-node__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    /* one 40px grid block for the icon row + a 20px gap before the body */
    min-height: 40px;
    margin-bottom: 20px;
    flex-shrink: 0;
  }

  .flowdrop-notes-node__header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  /* Squircle icon wrapper - Apple-style rounded square background */
  .flowdrop-notes-node__icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    /* px (not rem) so the icon stays grid-locked regardless of root font-size */
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--_notes-icon) var(--fd-node-icon-bg-opacity), transparent);
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
    width: 20px;
    height: 20px;
    color: var(--fd-node-icon);
  }

  .flowdrop-notes-node__type {
    font-size: var(--fd-text-sm);
    font-weight: 500;
    color: var(--fd-foreground);
  }

  .flowdrop-notes-node__body {
    flex: 1;
    overflow-y: auto;
    color: var(--fd-muted-foreground);
    /* 20px line rows so plain-text notes grow on the grid (rich markdown with
       headings/lists may not snap exactly) */
    line-height: 20px;
  }

  /* Markdown content inherits foreground color for better readability */
  .flowdrop-notes-node__body :global(.flowdrop-notes-node__markdown) {
    color: var(--fd-foreground);
  }

  /* Put markdown blocks on a 20px baseline so the note grows in clean 20px steps:
     each block bottom-margins one grid row (browser em-margins would land off-grid),
     and every line is a 20px row. */
  .flowdrop-notes-node__body
    :global(:is(h1, h2, h3, h4, h5, h6, p, ul, ol, pre, blockquote, table)) {
    margin: 0 0 20px;
    line-height: 20px;
  }

  .flowdrop-notes-node__body
    :global(:is(h1, h2, h3, h4, h5, h6, p, ul, ol, pre, blockquote, table):last-child) {
    margin-bottom: 0;
  }

  .flowdrop-notes-node__body :global(li) {
    margin: 0;
    line-height: 20px;
  }

  .flowdrop-notes-node__processing {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
  }

  .flowdrop-notes-node__spinner {
    width: 12px;
    height: 12px;
    border: 1px solid color-mix(in srgb, var(--fd-foreground) 30%, transparent);
    border-top-color: var(--fd-foreground);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .flowdrop-notes-node__error-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--fd-text-xs);
    color: var(--fd-error);
  }

  :global(.flowdrop-notes-node__error-icon) {
    width: 12px;
    height: 12px;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Reveal the NodeConfigButton (gear) when the node is hovered. */
  .flowdrop-notes-node:hover {
    --fd-config-btn-opacity: 1;
  }

  /* Responsive design */
  @media (max-width: 640px) {
    .flowdrop-notes-node {
      min-width: 200px;
      max-width: 360px;
    }

    .flowdrop-notes-node__content {
      padding: 12px;
    }
  }
</style>
