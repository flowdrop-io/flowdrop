<!--
  @component
  A planning card for a conceptual flow, with ports you switch on or off.

  Users can chain ideas together without committing to node types. It has four connection
  points (left, right, top, bottom), each one a checkbox in the config.

  The editor draws it only for a node type that declares `type: "idea"`. Nothing in the
  library creates one on its own.

  **Use it for** sketching a flow before the real nodes exist.
  **Not for** steps that run; use `WorkflowNode`.
-->

<script lang="ts">
  import { m } from '$lib/messages/index.js';
  import { Position, Handle } from '@xyflow/svelte';
  import type { ConfigValues, NodeMetadata } from '../../types/index.js';
  import Icon from '@iconify/svelte';
  import NodeConfigButton from './NodeConfigButton.svelte';
  import NodeProblemMark from './NodeProblemMark.svelte';
  import { getNodeProblem } from '../../utils/nodeProblem.js';
  import { getDataTypeColor } from '$lib/utils/colors.js';
  import { getInstance } from '../../stores/getInstance.svelte.js';

  /**
   * IdeaNode component props
   * Displays a card-style node for conceptual flow diagrams
   */
  interface Props {
    /** The node's id on the canvas. */
    id: string;
    /** The node: label, config (`content`, `instanceTitle`) and node type. */
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
    /** Whether the node is selected. A selected node draws its selection border and keeps the config gear visible. */
    selected?: boolean;
    /** Not passed by the editor: run state is drawn by `NodeStatusOverlay`. */
    isProcessing?: boolean;
    /** Not passed by the editor: run state is drawn by `NodeStatusOverlay`. */
    isError?: boolean;
  }

  let props: Props = $props();

  const problem = getNodeProblem();

  const checker = getInstance().portCompatibility;

  /**
   * Instance-specific title override from config.
   * Falls back to the original label if not set.
   * This allows users to customize the node title per-instance via config.
   * Note: Also supports legacy 'title' property for backward compatibility.
   */
  const displayTitle = $derived(
    (props.data.config?.instanceTitle as string) ||
      (props.data.config?.title as string) ||
      props.data.label ||
      props.data.metadata?.name ||
      'New Idea'
  );

  /**
   * Instance-specific description override from config.
   * Falls back to the metadata description if not set.
   * This allows users to customize the node description per-instance via config.
   * Note: Also supports legacy 'description' property for backward compatibility.
   */
  const displayDescription = $derived(
    (props.data.config?.instanceDescription as string) ||
      (props.data.config?.description as string) ||
      props.data.metadata?.description ||
      'Click to add description...'
  );

  /**
   * Get custom icon from config or metadata, with fallback
   */
  const ideaIcon = $derived(
    (props.data.config?.icon as string) ||
      (props.data.metadata?.icon as string) ||
      'mdi:lightbulb-outline'
  );

  /**
   * Get accent color from config or metadata, with fallback
   */
  const ideaColor = $derived(
    (props.data.config?.color as string) ||
      (props.data.metadata?.color as string) ||
      'var(--fd-accent)'
  );

  /**
   * Port visibility configuration from config
   * Left and Right are enabled by default, Top and Bottom are disabled by default
   */
  const enableLeftPort = $derived((props.data.config?.enableLeftPort as boolean) ?? true);
  const enableRightPort = $derived((props.data.config?.enableRightPort as boolean) ?? true);
  const enableTopPort = $derived((props.data.config?.enableTopPort as boolean) ?? false);
  const enableBottomPort = $derived((props.data.config?.enableBottomPort as boolean) ?? false);

  /**
   * Data type for idea flow connections
   */
  const IDEA_DATA_TYPE = 'idea';

  /**
   * Opens the configuration sidebar for editing idea properties
   */
  function openConfigSidebar(): void {
    if (props.data.onConfigOpen) {
      const nodeForConfig = {
        id: props.id,
        type: 'idea',
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

<!-- Idea Node -->
<!-- Presentational: focus, keyboard and selection live on xyflow's node
     wrapper (see UniversalNode). double-click is a mouse convenience. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="flowdrop-idea-node"
  class:flowdrop-idea-node--selected={props.selected}
  class:flowdrop-idea-node--processing={props.isProcessing}
  class:flowdrop-idea-node--error={props.isError}
  style="--idea-accent-color: {ideaColor};"
  ondblclick={handleDoubleClick}
>
  <!-- Left Port (Target/Input): center at top 40px (multiple of 10), 20px connection area -->
  {#if enableLeftPort}
    <Handle
      type="target"
      position={Position.Left}
      style="--fd-handle-fill: {getDataTypeColor(
        checker,
        IDEA_DATA_TYPE
      )}; --fd-handle-border-color: var(--fd-handle-border); top: 40px; transform: translateY(-50%); z-index: 30;"
      id={`${props.id}-input-left`}
    />
  {/if}

  <!-- Top Port (Target/Input): center at left 140px (node midpoint, 20px grid), 20px connection area -->
  {#if enableTopPort}
    <Handle
      type="target"
      position={Position.Top}
      style="--fd-handle-fill: {getDataTypeColor(
        checker,
        IDEA_DATA_TYPE
      )}; --fd-handle-border-color: var(--fd-handle-border); left: 140px; transform: translateX(-50%); z-index: 30;"
      id={`${props.id}-input-top`}
    />
  {/if}

  <!-- Card Content -->
  <div class="flowdrop-idea-node__card">
    <!-- Accent Bar -->
    <div class="flowdrop-idea-node__accent-bar"></div>

    <!-- Header with icon and title -->
    <div
      class="flowdrop-idea-node__header"
      class:flowdrop-idea-node__header--problem={problem?.severity != null}
    >
      <div class="flowdrop-idea-node__icon-wrapper">
        <Icon icon={ideaIcon} class="flowdrop-idea-node__icon" />
      </div>
      <h3 class="flowdrop-idea-node__title">{displayTitle}</h3>
      <NodeProblemMark />
    </div>

    <!-- Description Body -->
    <div class="flowdrop-idea-node__body">
      <p class="flowdrop-idea-node__description">{displayDescription}</p>
    </div>

    <!-- Processing indicator -->
    {#if props.isProcessing}
      <div class="flowdrop-idea-node__processing">
        <div class="flowdrop-idea-node__spinner"></div>
        <span>Processing...</span>
      </div>
    {/if}

    <!-- Error indicator -->
    {#if props.isError}
      <div class="flowdrop-idea-node__error">
        <Icon icon="mdi:alert-circle" class="flowdrop-idea-node__error-icon" />
        <span>Error</span>
      </div>
    {/if}
  </div>

  <!-- Config button -->
  <NodeConfigButton onclick={openConfigSidebar} title={m().nodes.configureIdea} />

  <!-- Right Port (Source/Output): center at top 40px (multiple of 10), 20px connection area -->
  {#if enableRightPort}
    <Handle
      type="source"
      position={Position.Right}
      style="--fd-handle-fill: {getDataTypeColor(
        checker,
        IDEA_DATA_TYPE
      )}; --fd-handle-border-color: var(--fd-handle-border); top: 40px; transform: translateY(-50%); z-index: 30;"
      id={`${props.id}-output-right`}
    />
  {/if}

  <!-- Bottom Port (Source/Output): center at left 140px (node midpoint, 20px grid), 20px connection area -->
  {#if enableBottomPort}
    <Handle
      type="source"
      position={Position.Bottom}
      style="--fd-handle-fill: {getDataTypeColor(
        checker,
        IDEA_DATA_TYPE
      )}; --fd-handle-border-color: var(--fd-handle-border); left: 140px; transform: translateX(-50%); z-index: 30;"
      id={`${props.id}-output-bottom`}
    />
  {/if}
</div>

<style>
  .flowdrop-idea-node {
    position: relative;
    width: var(--fd-node-default-width);
    /* Floor at 80px, then grow in 20px steps. Fixed chrome = accent 4px +
       header 48px + body bottom 6px = 58px, plus the card's 1px×2 border = 60px;
       each description line adds 20px (line-height), so the card lands on
       80 / 100 / 120px gridlines. */
    min-height: 80px;
    cursor: pointer;
    transition: all var(--fd-transition-normal);
    z-index: 10;
    color: var(--fd-foreground);
  }

  .flowdrop-idea-node__card {
    background-color: var(--fd-background);
    border-radius: var(--fd-node-radius);
    border: 1px solid var(--fd-border);
    box-shadow: var(--fd-node-shadow);
    overflow: hidden;
    transition: all var(--fd-transition-normal);
  }

  .flowdrop-idea-node:hover .flowdrop-idea-node__card {
    box-shadow: var(--fd-node-shadow-hover);
  }

  .flowdrop-idea-node--selected .flowdrop-idea-node__card {
    border-color: var(--fd-primary);
    box-shadow:
      var(--fd-node-shadow-hover),
      0 0 0 3px color-mix(in srgb, var(--fd-primary) 30%, transparent);
  }

  .flowdrop-idea-node--processing .flowdrop-idea-node__card {
    opacity: 0.8;
  }

  .flowdrop-idea-node--error .flowdrop-idea-node__card {
    border-color: var(--fd-error) !important;
    background-color: var(--fd-error-muted) !important;
  }

  /* Accent bar at top of card */
  .flowdrop-idea-node__accent-bar {
    height: 4px;
    background-color: var(--idea-accent-color, var(--fd-accent));
    transition: background-color var(--fd-transition-normal);
  }

  /* Header section */
  .flowdrop-idea-node__header {
    display: flex;
    align-items: center;
    /* px (not rem) on the 20px grid; 8px top/bottom + 32px icon = 48px header */
    gap: 10px;
    padding: 8px 16px;
  }

  /* Squircle icon wrapper - px (not rem) so the icon stays grid-locked
     regardless of root font-size */
  .flowdrop-idea-node__icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background-color: color-mix(
      in srgb,
      var(--idea-accent-color, var(--fd-accent)) var(--fd-node-icon-bg-opacity),
      transparent
    );
    border-radius: 8px;
    flex-shrink: 0;
    transition: all var(--fd-transition-normal);
  }

  /* Icon hover effect — matches SimpleNode/ToolNode/NotesNode */
  .flowdrop-idea-node:hover .flowdrop-idea-node__icon-wrapper {
    background-color: color-mix(
      in srgb,
      var(--idea-accent-color, var(--fd-accent)) var(--fd-node-icon-bg-opacity-hover),
      transparent
    );
    transform: scale(1.05);
  }

  :global(.flowdrop-idea-node__icon) {
    width: 20px;
    height: 20px;
    color: var(--fd-node-icon);
  }

  .flowdrop-idea-node__title {
    font-size: 15px;
    font-weight: 600;
    color: var(--fd-foreground);
    margin: 0;
    /* px line-height so multi-line text stays on the 20px grid */
    line-height: 20px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Body section: 6px bottom (not 8px) compensates the card's 1px×2 border
     so the card height stays a multiple of 20px. */
  .flowdrop-idea-node__body {
    padding: 0 16px 6px;
  }

  .flowdrop-idea-node__description {
    font-size: 13px;
    color: var(--fd-muted-foreground);
    margin: 0;
    /* px line-height so the 3-line clamp lands on the 20px grid (3 × 20px) */
    line-height: 20px;
    display: var(--fd-node-desc-display);
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* Processing indicator */
  .flowdrop-idea-node__processing {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
    border-top: 1px solid var(--fd-border-muted);
  }

  .flowdrop-idea-node__spinner {
    width: 14px;
    height: 14px;
    border: 2px solid var(--fd-border);
    border-top-color: var(--idea-accent-color, var(--fd-accent));
    border-radius: 50%;
    animation: idea-spin 1s linear infinite;
  }

  /* Error indicator */
  .flowdrop-idea-node__error {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    font-size: var(--fd-text-xs);
    color: var(--fd-error);
    border-top: 1px solid color-mix(in srgb, var(--fd-error) 30%, transparent);
    background-color: var(--fd-error-muted);
  }

  :global(.flowdrop-idea-node__error-icon) {
    width: 14px;
    height: 14px;
  }

  @keyframes idea-spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Reveal the NodeConfigButton (gear) when the node is hovered. */
  .flowdrop-idea-node:hover {
    --fd-config-btn-opacity: 1;
  }

  /* Handle: 20px/12px from base.css; position offsets for 20px handle */
  :global(.flowdrop-idea-node .svelte-flow__handle) {
    z-index: 20 !important;
    pointer-events: auto !important;
  }

  :global(.flowdrop-idea-node .svelte-flow__handle-left:hover),
  :global(.flowdrop-idea-node .svelte-flow__handle-right:hover) {
    transform: translateY(-50%) scale(1.2) !important;
  }

  :global(.flowdrop-idea-node .svelte-flow__handle-top:hover),
  :global(.flowdrop-idea-node .svelte-flow__handle-bottom:hover) {
    transform: translateX(-50%) scale(1.2) !important;
  }

  /* Responsive design */
  @media (max-width: 640px) {
    .flowdrop-idea-node {
      width: 256px;
    }

    .flowdrop-idea-node__header {
      padding: 8px 12px;
    }

    .flowdrop-idea-node__body {
      padding: 0 12px 6px;
    }

    .flowdrop-idea-node__title {
      font-size: var(--fd-text-sm);
    }

    .flowdrop-idea-node__description {
      font-size: var(--fd-text-xs);
    }
  }

  /* The gear sits over the header's top-right: end the mark left of it, and keep
     it there whether or not the gear is showing. After the narrow-width rule above. */
  .flowdrop-idea-node__header--problem {
    padding-right: var(--fd-node-config-btn-slot);
  }

  /* Level with the gear, as on the default card: centred on its middle, not the row's
     (the row starts below the 1px border, the 4px accent bar and the 8px padding). */
  .flowdrop-idea-node__header--problem > :global(.fd-node-problem) {
    align-self: flex-start;
    margin-top: calc(
      var(--fd-space-xs) + var(--fd-node-config-btn-size) / 2 - 13px - var(--fd-node-problem-size) /
        2
    );
  }

  /* Title takes the spare room, so the mark stays put whatever the title's length. */
  .flowdrop-idea-node__header--problem .flowdrop-idea-node__title {
    flex: 1;
    min-width: 0;
  }
</style>
