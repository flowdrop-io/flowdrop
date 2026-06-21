<!--
  Terminal Node Component
  A circular node for workflow terminal points (start, end, exit/abort)
  Configurable via metadata to display different variants:
  - start: Green with play icon, output-only
  - end: Gray with stop icon, input-only  
  - exit: Red with X icon, input-only (for abort/error exits)
  Styled with BEM syntax
-->

<script lang="ts">
  import { Position, Handle } from '@xyflow/svelte';
  import type {
    ConfigValues,
    NodeMetadata,
    NodeExtensions,
    NodePort,
    PortsConfig
  } from '../../types/index.js';
  import Icon from '@iconify/svelte';
  import NodeConfigButton from './NodeConfigButton.svelte';
  import { getPortColorToken, getCategoryColorToken } from '$lib/utils/colors.js';
  import { getNodeIcon } from '../../utils/icons.js';
  import { getCircleHandlePosition } from '$lib/utils/handlePositioning.js';
  import { orderPortsFor, isPortVisible } from '../../utils/portUtils.js';
  import { getInstance } from '../../stores/getInstance.svelte.js';

  /**
   * Terminal node variant types
   */
  type TerminalVariant = 'start' | 'end' | 'exit';

  /**
   * Configuration for each terminal variant
   */
  interface VariantConfig {
    /** Default icon for this variant */
    icon: string;
    /** Default color for this variant */
    color: string;
    /** Default label for this variant */
    label: string;
    /** Whether this variant has input handles */
    hasInputs: boolean;
    /** Whether this variant has output handles */
    hasOutputs: boolean;
  }

  /**
   * Variant configurations mapping
   */
  const VARIANT_CONFIGS: Record<TerminalVariant, VariantConfig> = {
    start: {
      icon: 'mdi:play-circle',
      color: 'var(--fd-node-emerald)',
      label: 'Start',
      hasInputs: false,
      hasOutputs: true
    },
    end: {
      icon: 'mdi:stop-circle',
      color: 'var(--fd-node-slate)',
      label: 'End',
      hasInputs: true,
      hasOutputs: false
    },
    exit: {
      icon: 'mdi:close-circle',
      color: 'var(--fd-node-red)',
      label: 'Exit',
      hasInputs: true,
      hasOutputs: false
    }
  };

  interface Props {
    id: string;
    data: {
      label: string;
      config: ConfigValues;
      metadata: NodeMetadata;
      extensions?: NodeExtensions;
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

  const fd = getInstance();
  const checker = fd.portCompatibility;

  /**
   * Determine terminal variant from config or metadata
   * Priority: config.variant > metadata tag detection > default to "start"
   */
  function getVariant(): TerminalVariant {
    // Check config first
    const configVariant = props.data.config?.variant as string | undefined;
    if (configVariant && configVariant in VARIANT_CONFIGS) {
      return configVariant as TerminalVariant;
    }

    // Check metadata tags for variant hints
    const tags = props.data.metadata?.tags || [];
    if (tags.includes('start') || tags.includes('entry')) {
      return 'start';
    }
    if (tags.includes('exit') || tags.includes('abort') || tags.includes('error')) {
      return 'exit';
    }
    if (tags.includes('end') || tags.includes('finish') || tags.includes('complete')) {
      return 'end';
    }

    // Check metadata id/name for hints
    const idLower = (props.data.metadata?.node_type_id || '').toLowerCase();
    const nameLower = (props.data.metadata?.name || '').toLowerCase();
    if (idLower.includes('start') || nameLower.includes('start')) {
      return 'start';
    }
    if (
      idLower.includes('exit') ||
      idLower.includes('abort') ||
      nameLower.includes('exit') ||
      nameLower.includes('abort')
    ) {
      return 'exit';
    }
    if (idLower.includes('end') || nameLower.includes('end')) {
      return 'end';
    }

    // Default to start
    return 'start';
  }

  let variant = $derived(getVariant());

  /**
   * Get current variant configuration
   */
  let variantConfig = $derived(VARIANT_CONFIGS[variant]);

  /**
   * Per-instance port order + exposure, in config. Order overrides the metadata
   * default; exposure is semantic (a not-exposed port is hidden, not wireable,
   * not runtime-overridable).
   */
  const portsConfig = $derived((props.data.config?.ports as PortsConfig | undefined) ?? {});

  /**
   * Get icon using the same resolution as WorkflowNode
   * Uses getNodeIcon utility with category fallback, or variant default
   */
  let terminalIcon = $derived(
    props.data.metadata?.icon
      ? getNodeIcon(fd.categories, props.data.metadata.icon, props.data.metadata?.category)
      : variantConfig.icon
  );

  /**
   * Get color using category-based color tokens for consistency
   * Falls back to variant default color if category not available
   */
  let terminalColor = $derived(
    props.data.metadata?.category
      ? getCategoryColorToken(fd.categories, props.data.metadata.category)
      : variantConfig.color
  );

  /**
   * Instance-specific title override from config.
   * Falls back to the original label if not set.
   * This allows users to customize the node title per-instance via config.
   */
  const displayTitle = $derived(
    (props.data.config?.instanceTitle as string) ||
      props.data.label ||
      props.data.metadata?.name ||
      variantConfig.label
  );

  /**
   * Instance-specific description override from config.
   * Falls back to the metadata description if not set.
   * This allows users to customize the node description per-instance via config.
   */
  const displayDescription = $derived(
    (props.data.config?.instanceDescription as string) || props.data.metadata?.description || ''
  );

  /**
   * Check if metadata explicitly defines inputs (including empty array)
   * This allows API to control ports:
   * - undefined: use variant default
   * - []: explicitly no inputs
   * - [{...}]: use these inputs
   */
  let hasExplicitInputs = $derived(Array.isArray(props.data.metadata?.inputs));

  /**
   * Check if metadata explicitly defines outputs (including empty array)
   */
  let hasExplicitOutputs = $derived(Array.isArray(props.data.metadata?.outputs));

  /**
   * Default trigger input port for end/exit nodes
   */
  const DEFAULT_INPUT_PORT = {
    id: 'trigger',
    name: 'Trigger',
    type: 'input' as const,
    dataType: 'trigger',
    description: 'Workflow trigger input'
  };

  /**
   * Default trigger output port for start nodes
   */
  const DEFAULT_OUTPUT_PORT = {
    id: 'trigger',
    name: 'Trigger',
    type: 'output' as const,
    dataType: 'trigger',
    description: 'Workflow trigger output'
  };

  /**
   * Get input ports from metadata or create default trigger input
   * Priority:
   * 1. If metadata.inputs is defined (even empty array), use it exactly
   * 2. Otherwise, use variant default (trigger port for end/exit)
   */
  let inputPorts = $derived(
    hasExplicitInputs
      ? props.data.metadata.inputs
      : variantConfig.hasInputs
        ? [DEFAULT_INPUT_PORT]
        : []
  );

  /**
   * Get output ports from metadata or create default trigger output
   * Priority:
   * 1. If metadata.outputs is defined (even empty array), use it exactly
   * 2. Otherwise, use variant default (trigger port for start)
   */
  let outputPorts = $derived(
    hasExplicitOutputs
      ? props.data.metadata.outputs
      : variantConfig.hasOutputs
        ? [DEFAULT_OUTPUT_PORT]
        : []
  );

  /**
   * Exposed input ports, in effective order.
   */
  let visibleInputPorts = $derived(
    orderPortsFor(inputPorts, portsConfig.inputs).filter((port: NodePort) =>
      isPortVisible(port, 'input', portsConfig)
    )
  );

  /**
   * Exposed output ports, in effective order.
   */
  let visibleOutputPorts = $derived(
    orderPortsFor(outputPorts, portsConfig.outputs).filter((port: NodePort) =>
      isPortVisible(port, 'output', portsConfig)
    )
  );

  /**
   * Determine if we should show inputs based on visible ports
   */
  let showInputs = $derived(visibleInputPorts.length > 0);

  /**
   * Determine if we should show outputs based on visible ports
   */
  let showOutputs = $derived(visibleOutputPorts.length > 0);

  /**
   * Handle configuration sidebar - using global ConfigSidebar
   */
  function openConfigSidebar(): void {
    if (props.data.onConfigOpen) {
      const nodeForConfig = {
        id: props.id,
        type: 'terminal',
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

<!-- Terminal Node -->
<!-- Presentational: focus, keyboard and selection live on xyflow's node
     wrapper (see UniversalNode). double-click is a mouse convenience. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="flowdrop-terminal-node"
  class:flowdrop-terminal-node--selected={props.selected}
  class:flowdrop-terminal-node--processing={props.isProcessing}
  class:flowdrop-terminal-node--error={props.isError}
  class:flowdrop-terminal-node--start={variant === 'start'}
  class:flowdrop-terminal-node--end={variant === 'end'}
  class:flowdrop-terminal-node--exit={variant === 'exit'}
  style="--terminal-color: {terminalColor};"
  ondblclick={handleDoubleClick}
  aria-label="{variant} node: {displayTitle}"
>
  <!-- Config button at top -->
  <NodeConfigButton onclick={openConfigSidebar} title="Configure node" placement="top-center" />

  <!-- Circle wrapper for proper handle positioning -->
  <div class="flowdrop-terminal-node__circle-wrapper">
    <!-- Input Handles (for end/exit variants) -->
    {#if showInputs}
      {#each visibleInputPorts as port, index (`${port.id}-${visibleInputPorts.length}`)}
        {@const pos = getCircleHandlePosition(index, visibleInputPorts.length, 'left')}
        <Handle
          type="target"
          position={Position.Left}
          style="--fd-handle-fill: {getPortColorToken(
            checker,
            port
          )}; --fd-handle-border-color: var(--fd-handle-border); left: {pos.left}px; top: {pos.top}px; transform: translate(-50%, -50%); z-index: 30;"
          id={`${props.id}-input-${port.id}`}
        />
      {/each}
    {/if}

    <!-- Circular content with icon in squircle wrapper -->
    <div class="flowdrop-terminal-node__content">
      <div class="flowdrop-terminal-node__icon-wrapper" style="--_icon-color: {terminalColor}">
        <Icon icon={terminalIcon} class="flowdrop-terminal-node__icon" />
      </div>
    </div>

    <!-- Output Handles (for start variant) -->
    {#if showOutputs}
      {#each visibleOutputPorts as port, index (`${port.id}-${visibleOutputPorts.length}`)}
        {@const pos = getCircleHandlePosition(index, visibleOutputPorts.length, 'right')}
        <Handle
          type="source"
          position={Position.Right}
          id={`${props.id}-output-${port.id}`}
          style="--fd-handle-fill: {getPortColorToken(
            checker,
            port
          )}; --fd-handle-border-color: var(--fd-handle-border); left: {pos.left}px; top: {pos.top}px; transform: translate(-50%, -50%); z-index: 30;"
        />
      {/each}
    {/if}
  </div>

  <!-- Label and description below the circle -->
  <div class="flowdrop-terminal-node__label-container">
    <div class="flowdrop-terminal-node__label">
      {displayTitle}
    </div>
    {#if displayDescription}
      <div class="flowdrop-terminal-node__description">
        {displayDescription}
      </div>
    {/if}
  </div>

  <!-- Processing indicator -->
  {#if props.isProcessing}
    <div class="flowdrop-terminal-node__processing">
      <div class="flowdrop-terminal-node__spinner"></div>
    </div>
  {/if}

  <!-- Error indicator -->
  {#if props.isError}
    <div class="flowdrop-terminal-node__error">
      <Icon icon="mdi:alert-circle" class="flowdrop-terminal-node__error-icon" />
    </div>
  {/if}
</div>

<style>
  .flowdrop-terminal-node {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    /* px (not rem) on the 20px grid */
    gap: 8px;
    cursor: pointer;
    transition: all var(--fd-transition-normal);
    z-index: 10;
    color: var(--fd-foreground);
  }

  /* Wrapper for circle and handles - ensures handles are vertically centered to circle */
  .flowdrop-terminal-node__circle-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .flowdrop-terminal-node__content {
    width: var(--fd-node-terminal-size);
    height: var(--fd-node-terminal-size);
    background-color: var(--fd-background);
    border: 3px solid var(--terminal-color, var(--fd-muted-foreground));
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--fd-node-shadow);
    transition: all var(--fd-transition-normal);
  }

  .flowdrop-terminal-node:hover .flowdrop-terminal-node__content {
    box-shadow: var(--fd-node-shadow-hover);
    transform: scale(1.05);
  }

  .flowdrop-terminal-node--selected .flowdrop-terminal-node__content {
    box-shadow:
      var(--fd-node-shadow-hover),
      0 0 0 3px color-mix(in srgb, var(--fd-primary) 50%, transparent);
    border-color: var(--fd-primary);
  }

  .flowdrop-terminal-node--selected:hover .flowdrop-terminal-node__content {
    box-shadow:
      var(--fd-node-shadow-hover),
      0 0 0 3px color-mix(in srgb, var(--fd-primary) 50%, transparent);
    border-color: var(--fd-primary);
    transform: scale(1.05);
  }

  /* Focus ring is centralized in base.css (drawn on the .svelte-flow__node
     wrapper, which is the focusable element). */

  .flowdrop-terminal-node--processing .flowdrop-terminal-node__content {
    opacity: 0.7;
  }

  .flowdrop-terminal-node--error .flowdrop-terminal-node__content {
    border-color: var(--fd-error) !important;
    background-color: var(--fd-error-muted) !important;
  }

  /* Variant-specific glow effects */
  .flowdrop-terminal-node--start .flowdrop-terminal-node__content {
    box-shadow:
      0 4px 6px -1px color-mix(in srgb, var(--fd-success) 20%, transparent),
      0 2px 4px -1px color-mix(in srgb, var(--fd-success) 10%, transparent);
  }

  .flowdrop-terminal-node--start:hover .flowdrop-terminal-node__content {
    box-shadow:
      0 10px 15px -3px color-mix(in srgb, var(--fd-success) 30%, transparent),
      0 4px 6px -2px color-mix(in srgb, var(--fd-success) 15%, transparent);
  }

  .flowdrop-terminal-node--start.flowdrop-terminal-node--selected:hover
    .flowdrop-terminal-node__content {
    box-shadow:
      0 10px 15px -3px color-mix(in srgb, var(--fd-success) 30%, transparent),
      0 4px 6px -2px color-mix(in srgb, var(--fd-success) 15%, transparent),
      0 0 0 3px color-mix(in srgb, var(--fd-primary) 50%, transparent);
  }

  .flowdrop-terminal-node--exit .flowdrop-terminal-node__content {
    box-shadow:
      0 4px 6px -1px color-mix(in srgb, var(--fd-error) 20%, transparent),
      0 2px 4px -1px color-mix(in srgb, var(--fd-error) 10%, transparent);
  }

  .flowdrop-terminal-node--exit:hover .flowdrop-terminal-node__content {
    box-shadow:
      0 10px 15px -3px color-mix(in srgb, var(--fd-error) 30%, transparent),
      0 4px 6px -2px color-mix(in srgb, var(--fd-error) 15%, transparent);
  }

  .flowdrop-terminal-node--exit.flowdrop-terminal-node--selected:hover
    .flowdrop-terminal-node__content {
    box-shadow:
      0 10px 15px -3px color-mix(in srgb, var(--fd-error) 30%, transparent),
      0 4px 6px -2px color-mix(in srgb, var(--fd-error) 15%, transparent),
      0 0 0 3px color-mix(in srgb, var(--fd-primary) 50%, transparent);
  }

  /* Squircle icon wrapper - px (not rem) so the icon stays grid-locked
     regardless of root font-size */
  .flowdrop-terminal-node__icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--_icon-color) var(--fd-node-icon-bg-opacity), transparent);
    flex-shrink: 0;
    transition: all var(--fd-transition-normal);
  }

  .flowdrop-terminal-node:hover .flowdrop-terminal-node__icon-wrapper {
    background: color-mix(
      in srgb,
      var(--_icon-color) var(--fd-node-icon-bg-opacity-hover),
      transparent
    );
  }

  .flowdrop-terminal-node__icon-wrapper :global(.flowdrop-terminal-node__icon) {
    width: 24px;
    height: 24px;
    color: var(--fd-node-icon);
  }

  .flowdrop-terminal-node__label-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    background-color: var(--fd-backdrop);
    padding: 4px 8px;
    border-radius: var(--fd-radius-sm);
    box-shadow: var(--fd-shadow-sm);
    max-width: 140px;
  }

  .flowdrop-terminal-node__label {
    font-size: var(--fd-text-xs);
    font-weight: 500;
    color: var(--fd-foreground);
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }

  .flowdrop-terminal-node__description {
    font-size: 10px;
    color: var(--fd-muted-foreground);
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }

  .flowdrop-terminal-node__processing {
    position: absolute;
    top: 24px;
    right: 0;
  }

  .flowdrop-terminal-node__spinner {
    width: 14px;
    height: 14px;
    border: 2px solid color-mix(in srgb, var(--fd-foreground) 30%, transparent);
    border-top: 2px solid var(--terminal-color, var(--fd-muted-foreground));
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .flowdrop-terminal-node__error {
    position: absolute;
    top: 24px;
    right: 0;
    color: var(--fd-error);
  }

  :global(.flowdrop-terminal-node__error-icon) {
    width: 14px;
    height: 14px;
  }

  /* Reveal the NodeConfigButton (gear) when the node is hovered. */
  .flowdrop-terminal-node:hover {
    --fd-config-btn-opacity: 1;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Handle styles - positioned along circle arc using cos/sin */
  :global(.flowdrop-terminal-node__circle-wrapper .svelte-flow__handle) {
    width: 16px !important;
    height: 16px !important;
    border-radius: 50% !important;
    border: none !important;
    transition: all var(--fd-transition-normal) !important;
    cursor: pointer !important;
    z-index: 20 !important;
    pointer-events: auto !important;
  }

  :global(.flowdrop-terminal-node__circle-wrapper .svelte-flow__handle:hover) {
    transform: translate(-50%, -50%) scale(1.2) !important;
  }

  /* Also keep node-level handle styles for fallback */
  :global(.svelte-flow__node-terminal .svelte-flow__handle) {
    z-index: 20 !important;
    pointer-events: auto !important;
  }

  :global(.svelte-flow__node-terminal .svelte-flow__handle:hover) {
    transform: translate(-50%, -50%) scale(1.2) !important;
  }
</style>
