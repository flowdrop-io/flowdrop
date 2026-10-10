<script lang="ts">
  import type { ConfigValues, NodeMetadata } from '../../types/index.js';
  import Icon from '@iconify/svelte';
  import { onMount } from 'svelte';
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

  /** Note type configuration. Type names track the messages tree so locale
   * changes flow through. The variant is carried by the paper tint and the footer
   * word, never by an icon tile. */
  const noteTypes = $derived({
    info: {
      name: notes.types.info,
      typeClass: 'flowdrop-notes-node--info'
    },
    warning: {
      name: notes.types.warning,
      typeClass: 'flowdrop-notes-node--warning'
    },
    success: {
      name: notes.types.success,
      typeClass: 'flowdrop-notes-node--success'
    },
    error: {
      name: notes.types.error,
      typeClass: 'flowdrop-notes-node--error'
    },
    note: {
      name: notes.types.default,
      typeClass: 'flowdrop-notes-node--note'
    }
  });

  /** Current note type configuration based on selected type */
  const currentType = $derived(noteTypes[noteType as keyof typeof noteTypes] || noteTypes.info);

  /**
   * First heading of the note (inline markup stripped), shown alone in the glyph
   * and map zoom tiers so a note reads as a landmark on a zoomed-out canvas.
   * Falls back to the first line of text when the note has no heading.
   */
  const firstHeading = $derived.by((): string => {
    const lines = noteContent.split('\n');
    const strip = (t: string): string =>
      t
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/[*_`~]/g, '')
        .trim();
    for (const line of lines) {
      const match = /^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/.exec(line);
      if (match) return strip(match[1]);
    }
    const plain = lines.find((line) => line.trim() !== '');
    return plain ? strip(plain.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, '')) : '';
  });

  /** The 20px grid the height snaps to (CSS owns the rhythm; this only rounds). */
  const GRID = 20;

  let root: HTMLDivElement | undefined = $state();
  let content: HTMLDivElement | undefined = $state();
  /** Height the note snaps up to: content + padding, rounded up to a grid multiple. */
  let snappedHeight = $state(0);

  onMount(() => {
    if (!root || !content || typeof ResizeObserver === 'undefined') return;
    const measure = (): void => {
      if (!root || !content) return;
      const style = getComputedStyle(root);
      const pad = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      const natural = content.offsetHeight + pad;
      snappedHeight = Math.ceil(natural / GRID - 0.001) * GRID;
    };
    measure();
    // Observe the inner content (never the outer box), so setting min-height
    // on the box cannot feed back into the measurement.
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    return () => observer.disconnect();
  });

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
  bind:this={root}
  class="flowdrop-notes-node {currentType.typeClass}"
  class:flowdrop-notes-node--selected={props.selected}
  class:flowdrop-notes-node--processing={props.isProcessing}
  class:flowdrop-notes-node--has-error={props.isError}
  style:min-height={snappedHeight ? `${snappedHeight}px` : undefined}
  data-note-title={firstHeading}
  ondblclick={handleDoubleClick}
>
  <!-- Zoom tiers: the first heading alone (shown by [data-fd-zoom='glyph'|'map']) -->
  <div class="flowdrop-notes-node__zoom-title" aria-hidden="true">{firstHeading}</div>

  <div class="flowdrop-notes-node__content" bind:this={content}>
    <!-- Rendered markdown content -->
    <div class="flowdrop-notes-node__body">
      <MarkdownDisplay content={noteContent} className="flowdrop-notes-node__markdown" />
    </div>

    <div class="flowdrop-notes-node__footer">
      <span class="flowdrop-notes-node__type">{currentType.name}</span>
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
  /* Paper, not panel: a tinted surface with an inset edge (no border box), a 4px
     radius and no icon tile. Width is fixed by the author; height follows the
     content and snaps up to the 20px grid (min-height set from the script). */
  .flowdrop-notes-node {
    --_note-bg: var(--fd-note-bg);
    --_note-edge: var(--fd-note-edge);
    --_note-inset: inset 0 0 0 1px var(--_note-edge);
    position: relative;
    box-sizing: border-box;
    min-width: var(--fd-notes-node-min-width);
    max-width: var(--fd-notes-node-max-width);
    width: var(--fd-notes-node-width);
    min-height: var(--fd-notes-node-min-height);
    padding: var(--fd-note-padding);
    border-radius: var(--fd-note-radius);
    background: var(--_note-bg);
    backdrop-filter: var(--fd-notes-node-backdrop-filter);
    box-shadow: var(--_note-inset), var(--fd-note-shadow);
    color: var(--fd-note-fg);
    transition: box-shadow var(--fd-transition-fast);
    overflow: hidden;
    z-index: 5;
  }

  /* Variants: the tint is the type (accent mixed into the paper for the edge). */
  .flowdrop-notes-node--info {
    --_note-bg: var(--fd-note-info-bg);
    --_note-edge: color-mix(in srgb, var(--fd-info) var(--fd-note-edge-mix), var(--_note-bg));
  }

  .flowdrop-notes-node--warning {
    --_note-bg: var(--fd-note-warning-bg);
    --_note-edge: color-mix(in srgb, var(--fd-warning) var(--fd-note-edge-mix), var(--_note-bg));
  }

  .flowdrop-notes-node--success {
    --_note-bg: var(--fd-note-success-bg);
    --_note-edge: color-mix(in srgb, var(--fd-success) var(--fd-note-edge-mix), var(--_note-bg));
  }

  .flowdrop-notes-node--error {
    --_note-bg: var(--fd-note-error-bg);
    --_note-edge: color-mix(in srgb, var(--fd-error) var(--fd-note-edge-mix), var(--_note-bg));
  }

  /* Plain note keeps the --fd-note-bg / --fd-note-edge pair set above. */

  .flowdrop-notes-node:hover {
    box-shadow: var(--_note-inset), var(--fd-node-shadow-hover);
    --fd-config-btn-opacity: 1;
  }

  /* Selected: the float elevation and the accent ring, as on nodes. */
  .flowdrop-notes-node--selected,
  .flowdrop-notes-node--selected:hover {
    box-shadow:
      var(--_note-inset),
      0 0 0 var(--fd-node-selected-edge) var(--fd-node-selected-border),
      0 0 0 calc(var(--fd-node-selected-edge) + var(--fd-node-selected-ring-width))
        var(--fd-node-selected-ring),
      var(--fd-node-shadow-hover);
  }

  /* Focus ring is centralized in base.css (drawn on the .svelte-flow__node
     wrapper, which is the focusable element). */

  .flowdrop-notes-node--processing {
    opacity: 0.7;
  }

  .flowdrop-notes-node--has-error {
    --_note-bg: var(--fd-note-error-bg);
    --_note-edge: var(--fd-error);
  }

  /* Content flows at its natural height; the box rounds it up to the grid. */
  .flowdrop-notes-node__content {
    display: flow-root;
  }

  .flowdrop-notes-node__body {
    color: var(--fd-note-fg);
    font-size: var(--fd-note-body-size);
    line-height: var(--fd-note-line);
    overflow-wrap: anywhere;
  }

  .flowdrop-notes-node__body :global(.flowdrop-notes-node__markdown) {
    color: inherit;
  }

  /* Capped scale: every text line is one 20px row, blocks are separated by 8px. */
  .flowdrop-notes-node__body
    :global(:is(h1, h2, h3, h4, h5, h6, p, ul, ol, pre, blockquote, table)) {
    margin: 8px 0 0;
    font-size: inherit;
    line-height: var(--fd-note-line);
  }

  .flowdrop-notes-node__body
    :global(:is(h1, h2, h3, h4, h5, h6, p, ul, ol, pre, blockquote, table):first-child) {
    margin-top: 0;
  }

  .flowdrop-notes-node__body :global(h1) {
    font-size: var(--fd-note-h1-size);
    font-weight: var(--fd-note-heading-weight);
    color: var(--fd-foreground);
  }

  .flowdrop-notes-node__body :global(:is(h2, h3, h4, h5, h6)) {
    font-size: var(--fd-note-h2-size);
    font-weight: var(--fd-note-heading-weight);
    color: var(--fd-foreground);
  }

  .flowdrop-notes-node__body :global(:is(ul, ol)) {
    padding-left: 20px;
  }

  .flowdrop-notes-node__body :global(li) {
    margin: 0;
    line-height: var(--fd-note-line);
  }

  .flowdrop-notes-node__body :global(pre) {
    overflow-x: auto;
  }

  /* Footer word: the variant, quiet. */
  .flowdrop-notes-node__footer {
    margin-top: 12px;
    font-size: var(--fd-note-meta-size);
    line-height: 16px;
    color: var(--fd-note-meta);
  }

  .flowdrop-notes-node__processing {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
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
    margin-top: 8px;
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

  /* Zoom tiers (set on .flowdrop-root by the editor): the note shows only its
     first heading, counter-scaled to a constant screen size. The content stays
     laid out (hidden, not removed) so the box never changes size between tiers. */
  .flowdrop-notes-node__zoom-title {
    display: none;
  }

  :global([data-fd-zoom='glyph']) .flowdrop-notes-node__zoom-title,
  :global([data-fd-zoom='map']) .flowdrop-notes-node__zoom-title {
    position: absolute;
    inset: var(--fd-note-padding);
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    overflow: hidden;
    font-size: calc(var(--fd-note-zoom-size) / var(--fd-zoom, 1));
    font-weight: var(--fd-note-heading-weight);
    line-height: 1.25;
    color: var(--fd-foreground);
    overflow-wrap: anywhere;
  }

  :global([data-fd-zoom='glyph']) .flowdrop-notes-node__content,
  :global([data-fd-zoom='map']) .flowdrop-notes-node__content,
  :global([data-fd-zoom='glyph']) .flowdrop-notes-node :global(.flowdrop-node-config-btn),
  :global([data-fd-zoom='map']) .flowdrop-notes-node :global(.flowdrop-node-config-btn) {
    visibility: hidden;
  }

  /* Responsive design */
  @media (max-width: 640px) {
    .flowdrop-notes-node {
      min-width: 200px;
      max-width: 360px;
    }
  }
</style>
