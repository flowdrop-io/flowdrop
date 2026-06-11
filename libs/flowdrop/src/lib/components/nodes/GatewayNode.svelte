<!--
  Gateway Node Component
  Visual representation of gateway/branch nodes with branching flow indicators
  Shows active branches and execution paths
  Styled with BEM syntax following WorkflowNode pattern
  
  UI Extensions Support:
  - hideUnconnectedHandles: Hides ports that are not connected to reduce visual clutter
-->

<script lang="ts">
  import { Position, Handle } from '@xyflow/svelte';
  import type { WorkflowNode, NodePort, Branch } from '../../types/index.js';
  import Icon from '@iconify/svelte';
  import NodeConfigButton from './NodeConfigButton.svelte';
  import { getNodeIcon } from '../../utils/icons.js';
  import {
    getDataTypeColorToken,
    getCategoryColorToken,
    getPortBackgroundColor
  } from '../../utils/colors.js';
  import { getInstance } from '../../stores/getInstance.svelte.js';
  import { m } from '$lib/messages/index.js';

  interface Props {
    data: WorkflowNode['data'] & {
      nodeId?: string;
      onConfigOpen?: (node: { id: string; type: string; data: WorkflowNode['data'] }) => void;
    };
    selected?: boolean;
  }

  let props: Props = $props();

  const fd = getInstance();
  const checker = fd.portCompatibility;

  // Hoist the graph branch — three reads in the template, two inside
  // {#each port} / {#each branch} loops. One getter walk per render.
  const graph = $derived(m().nodes.graph);

  /**
   * Instance-specific title override from config.
   * Falls back to the original label if not set.
   * This allows users to customize the node title per-instance via config.
   */
  const displayTitle = $derived((props.data.config?.instanceTitle as string) || props.data.label);

  /**
   * Instance-specific description override from config.
   * Falls back to the metadata description if not set.
   * This allows users to customize the node description per-instance via config.
   */
  const displayDescription = $derived(
    (props.data.config?.instanceDescription as string) || props.data.metadata.description
  );

  /**
   * Get the hideUnconnectedHandles setting from extensions
   * Merges node type defaults with instance overrides
   */
  const hideUnconnectedHandles = $derived(
    props.data.extensions?.ui?.hideUnconnectedHandles ??
      props.data.metadata?.extensions?.ui?.hideUnconnectedHandles ??
      false
  );

  /**
   * Check if a port should be visible based on connection state and settings
   * @param port - The port to check
   * @param type - Whether this is an 'input' or 'output' port
   * @returns true if the port should be visible
   */
  function isPortVisible(port: NodePort, type: 'input' | 'output'): boolean {
    // Always show if hideUnconnectedHandles is disabled
    if (!hideUnconnectedHandles) {
      return true;
    }

    // Always show required ports
    if (port.required) {
      return true;
    }

    // Check if port is connected
    const handleId = `${props.data.nodeId}-${type}-${port.id}`;
    return fd.workflow.connectedHandles.has(handleId);
  }

  /**
   * Derived list of visible input ports based on hideUnconnectedHandles setting
   */
  const visibleInputPorts = $derived(
    props.data.metadata.inputs.filter((port) => isPortVisible(port, 'input'))
  );

  /**
   * Check if a branch output should be visible based on connection state
   * @param branchName - The branch name to check
   * @returns true if the branch should be visible
   */
  function isBranchVisible(branchName: string): boolean {
    // Always show if hideUnconnectedHandles is disabled
    if (!hideUnconnectedHandles) {
      return true;
    }

    // Check if branch output is connected
    const handleId = `${props.data.nodeId}-output-${branchName}`;
    return fd.workflow.connectedHandles.has(handleId);
  }

  // Gateway-specific data - branches are calculated at runtime from config
  let branches = $derived((props.data.config?.branches as Branch[]) || []);
  let activeBranches = $derived(
    (props.data.executionInfo?.output?.active_branches as string[]) || []
  );

  /**
   * Derived list of visible branches based on hideUnconnectedHandles setting
   */
  const visibleBranches = $derived(branches.filter((branch) => isBranchVisible(branch.name)));

  /**
   * Handle node click - only handle selection, no config opening
   */
  function handleNodeClick(): void {
    // Node selection is handled by Svelte Flow
  }

  /**
   * Handle double-click to open config
   */
  function handleNodeDoubleClick(): void {
    if (props.data.onConfigOpen) {
      props.data.onConfigOpen({
        id: props.data.nodeId || '',
        type: 'gateway',
        data: props.data
      });
    }
  }

  /**
   * Handle keyboard events for accessibility
   */
  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleNodeClick();
    }
  }

  /**
   * Check if a branch is active
   */
  function isBranchActive(branchName: string): boolean {
    return activeBranches.includes(branchName);
  }
</script>

<!-- Node Container -->
<div
  class="flowdrop-workflow-node flowdrop-workflow-node--gateway"
  class:flowdrop-workflow-node--selected={props.selected}
  onclick={handleNodeClick}
  ondblclick={handleNodeDoubleClick}
  onkeydown={handleKeydown}
  role="button"
  tabindex="0"
  aria-label={graph.gatewayNode({ title: displayTitle })}
  aria-describedby="node-description-{props.data.nodeId || 'unknown'}"
>
  <!-- Node Header: expands in multiples of 10 (title row 40px + gap 10px + description 20px per line) -->
  <div class="flowdrop-workflow-node__header">
    <div class="flowdrop-workflow-node__header-title">
      <!-- Node Icon with Squircle Background -->
      <div
        class="flowdrop-workflow-node__icon-wrapper"
        style="--_icon-color: {getCategoryColorToken(fd.categories, props.data.metadata.category)}"
      >
        <Icon
          icon={getNodeIcon(fd.categories, props.data.metadata.icon, props.data.metadata.category)}
          class="flowdrop-workflow-node__icon"
        />
      </div>

      <!-- Node Title - uses instanceTitle override if set -->
      <h3 class="flowdrop-text--sm flowdrop-font--medium flowdrop-flex--1">
        {displayTitle}
      </h3>
    </div>
    <!-- Node Description - line-height 20px so header grows in steps of 10 -->
    <p
      class="flowdrop-workflow-node__header-desc"
      id="node-description-{props.data.nodeId || 'unknown'}"
    >
      {displayDescription}
    </p>
  </div>

  <!-- Input Ports Container (filtered based on hideUnconnectedHandles) -->
  {#if visibleInputPorts.length > 0}
    <div class="flowdrop-workflow-node__ports">
      <div class="flowdrop-workflow-node__ports-list">
        {#each visibleInputPorts as port (port.id)}
          <div class="flowdrop-workflow-node__port">
            <!-- Input Handle: one grid row (20px) from the top so it aligns with the label, at node edge -->
            <Handle
              type="target"
              position={Position.Left}
              id={`${props.data.nodeId}-input-${port.id}`}
              class="flowdrop-workflow-node__handle"
              style="top: var(--fd-node-port-row-height); transform: translateY(-50%); --fd-handle-fill: {getDataTypeColorToken(
                checker,
                port.dataType
              )}; --fd-handle-border-color: var(--fd-handle-border);"
              tabindex={-1}
            />

            <!-- Port Info: padding lives here so handle position is simple -->
            <div class="flowdrop-workflow-node__port-content flowdrop-flex--1 flowdrop-min-w--0">
              <div class="flowdrop-flex flowdrop-gap--2">
                <span class="flowdrop-text--xs flowdrop-font--medium">{port.name}</span>
                <span
                  class="flowdrop-badge flowdrop-badge--sm"
                  style="background-color: {getPortBackgroundColor(
                    checker,
                    port.dataType,
                    15
                  )}; color: {getDataTypeColorToken(
                    checker,
                    port.dataType
                  )}; border: 1px solid {getPortBackgroundColor(checker, port.dataType, 30)};"
                >
                  {port.dataType}
                </span>
                {#if port.required}
                  <span class="flowdrop-badge flowdrop-badge--error flowdrop-badge--sm"
                    >Required</span
                  >
                {/if}
              </div>
              {#if port.description}
                <p class="flowdrop-text--xs flowdrop-text--gray flowdrop-truncate">
                  {port.description}
                </p>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Branches Section (Output Ports) - filtered based on hideUnconnectedHandles -->
  {#if visibleBranches.length > 0}
    <div class="flowdrop-workflow-node__ports">
      <div class="flowdrop-workflow-node__ports-list">
        {#each visibleBranches as branch (branch.name)}
          {@const isActive = isBranchActive(branch.name)}
          <div class="flowdrop-workflow-node__port">
            <!-- Port Info: padding lives here so handle position is simple -->
            <div
              class="flowdrop-workflow-node__port-content flowdrop-flex--1 flowdrop-min-w--0 flowdrop-text--right"
            >
              <div
                class="flowdrop-flex flowdrop-gap--2 flowdrop-justify--end flowdrop-items--center"
              >
                {#if isActive}
                  <span style="color: {getDataTypeColorToken(checker, 'trigger')};">
                    <Icon icon="mdi:check-circle" />
                  </span>
                {/if}
                <span
                  class="flowdrop-text--xs flowdrop-font--medium"
                  class:flowdrop-text--active={isActive}
                >
                  {branch.label || branch.name}
                </span>
                <span
                  class="flowdrop-badge flowdrop-badge--sm"
                  style="background-color: {getPortBackgroundColor(
                    checker,
                    'trigger',
                    15
                  )}; color: {getDataTypeColorToken(
                    checker,
                    'trigger'
                  )}; border: 1px solid {getPortBackgroundColor(checker, 'trigger', 30)};"
                >
                  trigger
                </span>
              </div>
            </div>

            <!-- Output Handle: one grid row (20px) from the top so it aligns with the label, at node edge -->
            <Handle
              type="source"
              position={Position.Right}
              id={`${props.data.nodeId}-output-${branch.name}`}
              class={`flowdrop-workflow-node__handle ${isActive ? 'flowdrop-workflow-node__handle--active' : ''}`}
              style="top: var(--fd-node-port-row-height); transform: translateY(-50%); --fd-handle-fill: {isActive
                ? getDataTypeColorToken(checker, 'trigger')
                : getDataTypeColorToken(
                    checker,
                    'trigger'
                  )}; --fd-handle-border-color: var(--fd-handle-border);"
              tabindex={-1}
            />
          </div>
        {/each}
      </div>
    </div>
  {:else if branches.length === 0}
    <!-- No branches configured at all -->
    <div class="flowdrop-workflow-node__ports">
      <div class="workflow-node__no-branches">
        <Icon icon="mdi:alert-circle-outline" />
        <span>No branches configured</span>
      </div>
    </div>
  {/if}
  <!-- Note: When all branches are hidden due to hideUnconnectedHandles, we don't show anything -->

  <!-- Config button -->
  <NodeConfigButton onclick={handleNodeDoubleClick} title="Configure node" />
</div>

<style>
  .flowdrop-workflow-node {
    position: relative;
    background-color: var(--fd-node-bg);
    backdrop-filter: var(--fd-node-backdrop-filter);
    border: var(--fd-node-border-width) solid var(--fd-node-border);
    border-radius: var(--fd-node-radius);
    box-shadow: var(--fd-node-shadow);
    width: var(--fd-node-default-width);
    z-index: 10;
    color: var(--fd-foreground);
    transition: all var(--fd-transition-fast);
  }

  .flowdrop-workflow-node--gateway {
    min-width: var(--fd-node-default-width);
  }

  .flowdrop-workflow-node:hover {
    box-shadow: var(--fd-node-shadow-hover);
    border-color: var(--fd-node-border-hover);
  }

  .flowdrop-workflow-node--selected {
    box-shadow:
      0 0 0 2px var(--fd-primary-muted),
      var(--fd-node-shadow-hover);
    border-color: var(--fd-primary);
  }

  .flowdrop-workflow-node--selected:hover {
    box-shadow:
      0 0 0 2px var(--fd-primary-muted),
      var(--fd-node-shadow-hover);
    border-color: var(--fd-primary);
  }

  .flowdrop-workflow-node:focus-visible {
    outline: 2px solid var(--fd-ring);
    outline-offset: 2px;
  }

  .flowdrop-workflow-node__header {
    box-sizing: border-box;
    /* Bottom padding absorbs BOTH the node's own top border and the header
       divider, so the body below the header lands on the 20px grid measured
       from the node's outer top edge: node-border + header = 100/120/140. */
    padding: var(--fd-node-header-gap) var(--fd-space-xl)
      calc(
        var(--fd-node-header-gap) - var(--fd-node-border-width) -
          var(--fd-node-header-divider-width)
      );
    border-bottom: var(--fd-node-header-divider-width) solid var(--fd-node-header-divider-color);
    background: var(--fd-node-header-bg);
    border-top-left-radius: var(--fd-node-radius);
    border-top-right-radius: var(--fd-node-radius);
    display: flex;
    flex-direction: column;
    gap: calc(var(--fd-node-header-gap) * 2);
    /* node-border (1.5) + header = 100/120/140. Header itself is
       4*gap + title + desc-line - node-border; each extra desc line adds 20. */
    min-height: calc(
      var(--fd-node-header-gap) * 4 + var(--fd-node-header-title-height) +
        var(--fd-node-header-desc-line) - var(--fd-node-border-width)
    );
  }

  .flowdrop-workflow-node__header-title {
    display: flex;
    align-items: center;
    gap: var(--fd-space-md);
    min-height: var(--fd-node-header-title-height);
    flex-shrink: 0;
  }

  .flowdrop-workflow-node__header-desc {
    margin: 0;
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
    line-height: var(--fd-node-header-desc-line);
    min-height: var(--fd-node-header-desc-line);
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
  }

  /* Squircle icon wrapper - Apple-style rounded square background */
  .flowdrop-workflow-node__icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    /* px (not rem) so the icon stays grid-locked regardless of root font-size */
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--_icon-color) var(--fd-node-icon-bg-opacity), transparent);
    flex-shrink: 0;
    transition: all var(--fd-transition-normal);
  }

  .flowdrop-workflow-node:hover .flowdrop-workflow-node__icon-wrapper {
    background: color-mix(
      in srgb,
      var(--_icon-color) var(--fd-node-icon-bg-opacity-hover),
      transparent
    );
    transform: scale(1.05);
  }

  .flowdrop-workflow-node__icon-wrapper :global(.flowdrop-workflow-node__icon) {
    width: 20px;
    height: 20px;
    color: var(--fd-node-icon);
  }

  .flowdrop-workflow-node__header-title h3 {
    margin: 0;
    /* half the title block so two lines fill it exactly on the 20px grid */
    line-height: calc(var(--fd-node-header-title-height) / 2);
    color: var(--fd-foreground);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    min-width: 0;
  }

  .flowdrop-workflow-node__ports {
    padding: 0;
  }

  .flowdrop-workflow-node__ports-list {
    display: flex;
    flex-direction: column;
    gap: 0;
    /* No vertical padding: sections stack flush and node height stays a
       multiple of 20. The one exception is the clearance below the header
       divider, applied to the first section only (below). */
    padding: 0;
  }

  /* The first port section sits directly below the header divider; give it a
     full 20px grid row of clearance so the first port lands on the grid. */
  .flowdrop-workflow-node__header
    + .flowdrop-workflow-node__ports
    .flowdrop-workflow-node__ports-list {
    padding-top: calc(var(--fd-node-header-gap) * 2);
  }

  .flowdrop-workflow-node__port {
    display: flex;
    align-items: flex-start;
    gap: 0;
    /* Fixed three-row (60px) height for every port — node height stays
       predictable whether or not a port carries a description. */
    height: calc(var(--fd-node-port-row-height) * 3);
    padding: 0;
    position: relative;
  }

  .flowdrop-workflow-node__port-content {
    padding: var(--fd-node-header-gap) var(--fd-space-xl) 0;
  }

  /* Each line in a port occupies one 20px grid row: a label-only port
     centers its single row, a label + description fills both. */
  .flowdrop-workflow-node__port-content > div {
    min-height: var(--fd-node-port-row-height);
    align-items: center;
  }

  .flowdrop-workflow-node__port-content > p {
    min-height: var(--fd-node-port-row-height);
    line-height: var(--fd-node-port-row-height);
  }

  .flowdrop-badge {
    padding: 2px 4px;
    border-radius: var(--fd-radius-sm);
    font-size: 10px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .flowdrop-badge--error {
    background-color: var(--fd-error);
    color: var(--fd-error-foreground);
  }

  .flowdrop-badge--sm {
    font-size: 10px;
    padding: 2px 4px;
  }

  .workflow-node__no-branches {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    padding: var(--fd-space-md);
    background: var(--fd-warning-muted);
    border: 1px solid var(--fd-warning);
    border-radius: var(--fd-radius-lg);
    color: var(--fd-warning-foreground);
    font-size: var(--fd-text-sm);
  }

  /* Handle overrides: hover scale, active state (base 20px/12px from base.css) */
  :global(.flowdrop-workflow-node__handle:hover) {
    transform: translateY(-50%) scale(1.2);
  }

  :global(.flowdrop-workflow-node__handle--active::before) {
    transform: scale(1.15);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--fd-success) 20%, transparent);
  }

  /* Utility classes */
  .flowdrop-flex {
    display: flex;
  }

  .flowdrop-flex--1 {
    flex: 1;
  }

  .flowdrop-gap--2 {
    gap: var(--fd-space-xs);
  }

  .flowdrop-items--center {
    align-items: center;
  }

  .flowdrop-justify--end {
    justify-content: flex-end;
  }

  .flowdrop-min-w--0 {
    min-width: 0;
  }

  .flowdrop-text--xs {
    font-size: var(--fd-text-xs);
    line-height: 16px;
  }

  .flowdrop-text--sm {
    font-size: var(--fd-text-sm);
    line-height: 20px;
  }

  .flowdrop-text--gray {
    color: var(--fd-muted-foreground);
  }

  .flowdrop-text--active {
    color: var(--fd-success);
    font-weight: 600;
  }

  .flowdrop-font--medium {
    font-weight: 500;
  }

  .flowdrop-truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .flowdrop-text--right {
    text-align: right;
  }

  /* Reveal the NodeConfigButton (gear) when the node is hovered. */
  .flowdrop-workflow-node:hover {
    --fd-config-btn-opacity: 1;
  }
</style>
