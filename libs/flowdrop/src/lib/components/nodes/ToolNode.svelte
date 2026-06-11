<!--
  Tool Node Component
  A specialized node for tools with metadata port
  Styled with BEM syntax
-->

<script lang="ts">
  import { Position, Handle } from '@xyflow/svelte';
  import Icon from '@iconify/svelte';
  import { getDataTypeColor, getCategoryColorToken } from '$lib/utils/colors';
  import { getInstance } from '../../stores/getInstance.svelte.js';
  import type { NodeMetadata, NodePort } from '../../types/index.js';
  import NodeConfigButton from './NodeConfigButton.svelte';
  import AlertCircleIcon from '../icons/AlertCircleIcon.svelte';

  interface ToolNodeParameter {
    name: string;
    type?: string;
    description?: string;
  }

  const props = $props<{
    data: {
      label: string;
      config: {
        icon?: string;
        color?: string;
        toolName?: string;
        toolDescription?: string;
        toolVersion?: string;
        parameters?: ToolNodeParameter[];
      };
      metadata: NodeMetadata;
      nodeId?: string;
      onConfigOpen?: (node: {
        id: string;
        type: string;
        data: {
          label: string;
          config: Record<string, unknown>;
          metadata: NodeMetadata;
        };
      }) => void;
    };
    selected?: boolean;
    isProcessing?: boolean;
    isError?: boolean;
  }>();

  const fd = getInstance();
  const checker = fd.portCompatibility;

  // Prioritize metadata over config for tool nodes (metadata is the node definition)
  let toolIcon = $derived(
    (props.data.metadata?.icon as string) || (props.data.config?.icon as string) || 'mdi:tools'
  );
  let toolColor = $derived(
    (props.data.metadata?.color as string) || (props.data.config?.color as string) || '#f59e0b'
  );

  /**
   * Instance-specific title override from config.
   * Falls back to metadata name, toolName config, or label if not set.
   * This allows users to customize the tool title per-instance via config.
   */
  const displayTitle = $derived(
    (props.data.config?.instanceTitle as string) ||
      (props.data.metadata?.name as string) ||
      (props.data.config?.toolName as string) ||
      props.data.label ||
      'Tool'
  );

  /**
   * Instance-specific badge label override from config.
   * Falls back to metadata badge or default 'TOOL' if not set.
   * This allows users to customize the badge text per-instance via config.
   */
  const displayBadge = $derived(
    (props.data.config?.instanceBadge as string) || (props.data.metadata?.badge as string) || 'TOOL'
  );

  /**
   * Instance-specific description override from config.
   * Falls back to metadata description or toolDescription config if not set.
   * This allows users to customize the tool description per-instance via config.
   */
  const displayDescription = $derived(
    (props.data.config?.instanceDescription as string) ||
      (props.data.metadata?.description as string) ||
      (props.data.config?.toolDescription as string) ||
      'A configurable tool for agents'
  );

  let toolVersion = $derived(
    (props.data.metadata?.version as string) ||
      (props.data.config?.toolVersion as string) ||
      '1.0.0'
  );

  /**
   * Build inline style string for CSS custom properties
   * Sets the base color, CSS handles light/dark mode tints via color-mix()
   */
  let nodeStyle = $derived(`--fd-tool-node-color: ${toolColor}`);

  /**
   * Configurable port dataType to expose on this tool node.
   * Defaults to 'tool', but can be overridden via metadata.portDataType
   * to show a different port type (e.g., 'trigger') when the node is
   * repurposed with a custom badge.
   */
  let portDataType = $derived((props.data.metadata?.portDataType as string) || 'tool');

  // Check for matching interface ports in metadata
  let hasToolInputPort = $derived(
    props.data.metadata?.inputs?.some((port: NodePort) => port.dataType === portDataType) || false
  );
  let hasToolOutputPort = $derived(
    props.data.metadata?.outputs?.some((port: NodePort) => port.dataType === portDataType) || false
  );

  // Get the actual matching ports for proper handle generation
  let toolInputPort = $derived(
    props.data.metadata?.inputs?.find((port: NodePort) => port.dataType === portDataType)
  );
  let toolOutputPort = $derived(
    props.data.metadata?.outputs?.find((port: NodePort) => port.dataType === portDataType)
  );

  /**
   * Vertical center of the first port handle (px). Single source of truth shared
   * by the input/output handles and the badge overlay, so the badge stays level
   * with the first port.
   */
  const firstPortTop = 40;

  /**
   * Handle configuration sidebar - using global ConfigSidebar
   */
  function openConfigSidebar(): void {
    if (props.data.onConfigOpen) {
      // Create a WorkflowNodeType-like object for the global ConfigSidebar
      const nodeForConfig = {
        id: props.data.nodeId || 'unknown',
        type: 'tool',
        data: props.data
      };
      props.data.onConfigOpen(nodeForConfig);
    }
  }

  /**
   * Handle double-click to open config
   */
  function handleDoubleClick(): void {
    openConfigSidebar();
  }
</script>

<!-- Tool Input Handle (optional): center at 40px (multiple of 10), 20px connection area -->
{#if hasToolInputPort && toolInputPort}
  <Handle
    type="target"
    position={Position.Left}
    id={`${props.data.nodeId}-input-${toolInputPort.id}`}
    style="top: {firstPortTop}px; transform: translateY(-50%); z-index: 30; --fd-handle-fill: var(--fd-port-skin-color, {getDataTypeColor(
      checker,
      portDataType
    )}); --fd-handle-border-color: var(--fd-handle-border);"
  />
{/if}

<!-- Tool Node -->
<!-- Presentational: focus, keyboard and selection live on xyflow's node
     wrapper (see UniversalNode). double-click is a mouse convenience. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="flowdrop-tool-node"
  class:flowdrop-tool-node--selected={props.selected}
  class:flowdrop-tool-node--processing={props.isProcessing}
  class:flowdrop-tool-node--error={props.isError}
  style={nodeStyle}
  ondblclick={handleDoubleClick}
>
  <!-- Node Header -->
  <div class="flowdrop-tool-node__header">
    <div class="flowdrop-tool-node__header-content">
      <!-- Squircle icon — visibility controlled by --fd-node-icon-display -->
      <div class="flowdrop-tool-node__icon-wrapper">
        <Icon icon={toolIcon} class="flowdrop-tool-node__icon" />
      </div>
      <!-- Circle dot — visibility controlled by --fd-node-circle-display -->
      <span
        class="flowdrop-tool-node__color-dot"
        style="background: {getCategoryColorToken(fd.categories, props.data.metadata?.category)}"
      ></span>

      <!-- Tool Info -->
      <div class="flowdrop-tool-node__info">
        <h3 class="flowdrop-tool-node__title">
          {displayTitle}
        </h3>
        <div class="flowdrop-tool-node__version">
          v{toolVersion}
        </div>
      </div>

      <!-- Tool Badge - overlay aligned to the first port's vertical center -->
      <div class="flowdrop-tool-node__badge" style="top: {firstPortTop}px">{displayBadge}</div>
    </div>

    <!-- Tool Description - uses instanceDescription override if set -->
    <p class="flowdrop-tool-node__description">
      {displayDescription}
    </p>
  </div>

  <!-- Processing indicator -->
  {#if props.isProcessing}
    <div class="flowdrop-tool-node__processing">
      <div class="flowdrop-tool-node__spinner"></div>
    </div>
  {/if}

  <!-- Error indicator -->
  {#if props.isError}
    <div class="flowdrop-tool-node__error">
      <AlertCircleIcon />
    </div>
  {/if}

  <!-- Config button -->
  <NodeConfigButton onclick={openConfigSidebar} title="Configure tool" />
</div>

<!-- Tool Output Handle (optional): center at 40px (multiple of 10), 20px connection area -->
{#if hasToolOutputPort && toolOutputPort}
  <Handle
    type="source"
    position={Position.Right}
    id={`${props.data.nodeId}-output-${toolOutputPort.id}`}
    style="top: {firstPortTop}px; transform: translateY(-50%); z-index: 30; --fd-handle-fill: var(--fd-port-skin-color, {getDataTypeColor(
      checker,
      portDataType
    )}); --fd-handle-border-color: var(--fd-handle-border);"
  />
{/if}

<style>
  .flowdrop-tool-node {
    position: relative;
    box-sizing: border-box;
    background-color: var(--fd-node-bg);
    backdrop-filter: var(--fd-node-backdrop-filter);
    border: var(--fd-node-border-width) solid var(--fd-tool-node-color);
    border-radius: var(--fd-node-radius);
    width: var(--fd-node-default-width);
    /* A tool has at most 2 ports on a side (handles at 40px & 80px), so 100px
       is the fixed floor; the grid-aligned header keeps it a 20px multiple. */
    min-height: 100px;
    display: flex;
    flex-direction: column;
    cursor: pointer;
    transition: all var(--fd-transition-fast);
    box-shadow: var(--fd-node-shadow);
    overflow: visible;
    z-index: 10;
    color: var(--fd-foreground);
  }

  .flowdrop-tool-node:hover {
    box-shadow: var(--fd-node-shadow-hover);
    border-color: var(--fd-tool-node-color);
  }

  .flowdrop-tool-node--selected {
    box-shadow:
      0 0 0 2px color-mix(in srgb, var(--fd-tool-node-color) 30%, transparent),
      var(--fd-node-shadow-hover);
    border-color: var(--fd-tool-node-color);
  }

  .flowdrop-tool-node--selected:hover {
    box-shadow:
      0 0 0 2px color-mix(in srgb, var(--fd-tool-node-color) 30%, transparent),
      var(--fd-node-shadow-hover);
    border-color: var(--fd-tool-node-color);
  }

  /* Focus ring is centralized in base.css (drawn on the .svelte-flow__node
     wrapper, which is the focusable element). */

  .flowdrop-tool-node--processing {
    opacity: 0.7;
  }

  .flowdrop-tool-node--error {
    border-color: var(--fd-error) !important;
    background-color: var(--fd-error-muted) !important;
  }

  .flowdrop-tool-node__header {
    box-sizing: border-box;
    flex: 1;
    display: flex;
    flex-direction: column;
    /* px on the 20px grid. Bottom padding absorbs BOTH node borders (top + bottom)
       so the OUTER node height lands on a 20px multiple: with a 40px title row and
       a 20px-per-line description, outer = 60 + 20·lines (80, 100, 120…). */
    padding: var(--fd-node-header-gap) 20px
      calc(var(--fd-node-header-gap) - var(--fd-node-border-width) * 2);
    /* Light mode: mix tool color with white (95%) for subtle tint */
    background-color: color-mix(in srgb, var(--fd-tool-node-color) 5%, white);
    border-radius: var(--fd-node-radius);
    border: none;
  }

  /* Dark mode header styles */
  :global([data-theme='dark']) .flowdrop-tool-node__header {
    /* Dark mode: mix tool color with dark background (15%) for subtle tint */
    background-color: color-mix(in srgb, var(--fd-tool-node-color) 15%, #1a1a1e);
    border: none;
  }

  .flowdrop-tool-node__header-content {
    display: flex;
    align-items: center;
    gap: 12px;
    /* Two grid rows (title + version), so the icon + text block is exactly 40px;
       the description stacks flush below and each wrapped line adds one 20px row. */
    min-height: var(--fd-node-header-title-height);
  }

  /* Squircle icon wrapper - Apple-style rounded square background */
  .flowdrop-tool-node__icon-wrapper {
    display: var(--fd-node-icon-display, flex);
    align-items: center;
    justify-content: center;
    /* px (not rem) so the icon stays grid-locked regardless of root font-size */
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: color-mix(
      in srgb,
      var(--fd-tool-node-color) var(--fd-node-icon-bg-opacity),
      transparent
    );
    flex-shrink: 0;
    transition: all var(--fd-transition-normal);
  }

  .flowdrop-tool-node:hover .flowdrop-tool-node__icon-wrapper {
    background: color-mix(
      in srgb,
      var(--fd-tool-node-color) var(--fd-node-icon-bg-opacity-hover),
      transparent
    );
    transform: scale(1.05);
  }

  .flowdrop-tool-node__info {
    flex: 1;
    min-width: 0;
  }

  .flowdrop-tool-node__title {
    font-size: 16px;
    font-weight: 600;
    color: var(--fd-foreground);
    margin: 0;
    /* one 20px grid row */
    line-height: var(--fd-node-port-row-height);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .flowdrop-tool-node__version {
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
    font-weight: 500;
    /* one 20px grid row */
    line-height: var(--fd-node-port-row-height);
  }

  .flowdrop-tool-node__badge {
    /* Overlay so it takes no row space — the title gets the full width. The
       inline `top` is set to the first port's center; translateY keeps the
       badge vertically aligned with that port. */
    position: absolute;
    right: 20px;
    transform: translateY(-50%);
    z-index: 12;
    background-color: color-mix(in srgb, var(--fd-tool-node-color) 15%, transparent);
    color: var(--fd-tool-node-color);
    border: 1px solid color-mix(in srgb, var(--fd-tool-node-color) 30%, transparent);
    font-size: 10px;
    font-weight: 700;
    padding: 4px 8px;
    border-radius: var(--fd-radius-sm);
    letter-spacing: 0.05em;
    /* Lay flat: sit back at reduced opacity so it reads as a subtle marker and
       any title underneath stays legible. */
    opacity: 0.4;
  }

  .flowdrop-tool-node__description {
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
    margin: 0;
    /* each line is one 20px grid row; clamp so the node grows in clean 20px steps */
    line-height: var(--fd-node-port-row-height);
    min-height: var(--fd-node-port-row-height);
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .flowdrop-tool-node__icon-wrapper :global(.flowdrop-tool-node__icon) {
    width: 20px;
    height: 20px;
    color: var(--fd-node-icon);
  }

  .flowdrop-tool-node__processing {
    position: absolute;
    top: 4px;
    right: 4px;
  }

  .flowdrop-tool-node__spinner {
    width: 12px;
    height: 12px;
    border: 1px solid color-mix(in srgb, var(--fd-tool-node-color) 30%, transparent);
    border-top: 1px solid var(--fd-tool-node-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .flowdrop-tool-node__error {
    position: absolute;
    top: 4px;
    right: 4px;
    color: var(--fd-error);
  }

  .flowdrop-tool-node__error :global(svg) {
    width: 12px;
    height: 12px;
  }

  /* Reveal the NodeConfigButton (gear) when the node is hovered. */
  .flowdrop-tool-node:hover {
    --fd-config-btn-opacity: 1;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Handle: 20px/12px from base.css; position offsets, tool-specific hover/focus */
  :global(.svelte-flow__node-tool .svelte-flow__handle) {
    z-index: 20 !important;
    pointer-events: auto !important;
  }

  :global(.svelte-flow__node-tool .svelte-flow__handle:hover) {
    transform: translateY(-50%) scale(1.2) !important;
  }

  :global(.svelte-flow__node-tool .svelte-flow__handle:hover::before) {
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--fd-tool-node-color) 30%, transparent) !important;
  }

  /* Circle dot icon — shown in minimal skin via --fd-node-circle-display */
  .flowdrop-tool-node__color-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
    display: var(--fd-node-circle-display, none);
  }
</style>
