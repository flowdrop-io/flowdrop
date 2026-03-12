<!--
  Gateway Node Component
  Visual representation of gateway/branch nodes with branching flow indicators
  Shows active branches and execution paths
  Styled with BEM syntax following WorkflowNode pattern
  
  UI Extensions Support:
  - hideUnconnectedHandles: Hides ports that are not connected to reduce visual clutter
-->

<script lang="ts">
  import { Position, Handle } from "@xyflow/svelte";
  import type { WorkflowNode, NodePort, Branch } from "../../types/index.js";
  import Icon from "@iconify/svelte";
  import { getNodeIcon } from "../../utils/icons.js";
  import {
    getDataTypeColorToken,
    getCategoryColorToken,
    getPortBackgroundColor,
  } from "../../utils/colors.js";
  import { getConnectedHandles } from "../../stores/workflowStore.svelte.js";

  interface Props {
    data: WorkflowNode["data"] & {
      nodeId?: string;
      onConfigOpen?: (node: {
        id: string;
        type: string;
        data: WorkflowNode["data"];
      }) => void;
    };
    selected?: boolean;
  }

  let props: Props = $props();

  /**
   * Instance-specific title override from config.
   * Falls back to the original label if not set.
   * This allows users to customize the node title per-instance via config.
   */
  const displayTitle = $derived(
    (props.data.config?.instanceTitle as string) || props.data.label,
  );

  /**
   * Instance-specific description override from config.
   * Falls back to the metadata description if not set.
   * This allows users to customize the node description per-instance via config.
   */
  const displayDescription = $derived(
    (props.data.config?.instanceDescription as string) ||
      props.data.metadata.description,
  );

  /**
   * Get the hideUnconnectedHandles setting from extensions
   * Merges node type defaults with instance overrides
   */
  const hideUnconnectedHandles = $derived(() => {
    const typeDefault =
      props.data.metadata?.extensions?.ui?.hideUnconnectedHandles ?? false;
    const instanceOverride = props.data.extensions?.ui?.hideUnconnectedHandles;
    return instanceOverride ?? typeDefault;
  });

  /**
   * Check if a port should be visible based on connection state and settings
   * @param port - The port to check
   * @param type - Whether this is an 'input' or 'output' port
   * @returns true if the port should be visible
   */
  function isPortVisible(port: NodePort, type: "input" | "output"): boolean {
    // Always show if hideUnconnectedHandles is disabled
    if (!hideUnconnectedHandles()) {
      return true;
    }

    // Always show required ports
    if (port.required) {
      return true;
    }

    // Check if port is connected
    const handleId = `${props.data.nodeId}-${type}-${port.id}`;
    return getConnectedHandles().has(handleId);
  }

  /**
   * Derived list of visible input ports based on hideUnconnectedHandles setting
   */
  const visibleInputPorts = $derived(
    props.data.metadata.inputs.filter((port) => isPortVisible(port, "input")),
  );

  /**
   * Check if a branch output should be visible based on connection state
   * @param branchName - The branch name to check
   * @returns true if the branch should be visible
   */
  function isBranchVisible(branchName: string): boolean {
    // Always show if hideUnconnectedHandles is disabled
    if (!hideUnconnectedHandles()) {
      return true;
    }

    // Check if branch output is connected
    const handleId = `${props.data.nodeId}-output-${branchName}`;
    return getConnectedHandles().has(handleId);
  }

  // Gateway-specific data - branches are calculated at runtime from config
  let branches = $derived((props.data.config?.branches as Branch[]) || []);
  let activeBranches = $derived(
    (props.data.executionInfo?.output?.active_branches as string[]) || [],
  );

  /**
   * Derived list of visible branches based on hideUnconnectedHandles setting
   */
  const visibleBranches = $derived(
    branches.filter((branch) => isBranchVisible(branch.name)),
  );

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
        id: props.data.nodeId || "",
        type: "gateway",
        data: props.data,
      });
    }
  }

  /**
   * Handle keyboard events for accessibility
   */
  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter" || event.key === " ") {
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
  aria-label="Gateway node: {displayTitle}"
  aria-describedby="node-description-{props.data.nodeId || 'unknown'}"
>
  <!-- Node Header: expands in multiples of 10 (title row 40px + gap 10px + description 20px per line) -->
  <div class="flowdrop-workflow-node__header">
    <div class="flowdrop-workflow-node__header-title">
      <!-- Node Icon with Squircle Background -->
      <div
        class="flowdrop-workflow-node__icon-wrapper"
        style="--_icon-color: {getCategoryColorToken(
          props.data.metadata.category,
        )}"
      >
        <Icon
          icon={getNodeIcon(
            props.data.metadata.icon,
            props.data.metadata.category,
          )}
          class="flowdrop-workflow-node__icon"
        />
      </div>

      <!-- Node Title - uses instanceTitle override if set -->
      <h3
        class="flowdrop-text--sm flowdrop-font--medium flowdrop-truncate flowdrop-flex--1"
      >
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
        {#each visibleInputPorts as port, inputIndex (port.id)}
          <div class="flowdrop-workflow-node__port">
            <!-- Input Handle: centered in row, at node edge (ports have no padding) -->
            <Handle
              type="target"
              position={Position.Left}
              id={`${props.data.nodeId}-input-${port.id}`}
              class="flowdrop-workflow-node__handle"
              style="top: 50%; transform: translateY(-50%); --fd-handle-fill: {getDataTypeColorToken(
                port.dataType,
              )}; --fd-handle-border-color: var(--fd-handle-border);"
              role="button"
              tabindex={0}
              aria-label="Connect to {port.name} input port"
            />

            <!-- Port Info: padding lives here so handle position is simple -->
            <div
              class="flowdrop-workflow-node__port-content flowdrop-flex--1 flowdrop-min-w--0"
            >
              <div class="flowdrop-flex flowdrop-gap--2">
                <span class="flowdrop-text--xs flowdrop-font--medium"
                  >{port.name}</span
                >
                <span
                  class="flowdrop-badge flowdrop-badge--sm"
                  style="background-color: {getPortBackgroundColor(
                    port.dataType,
                    15,
                  )}; color: {getDataTypeColorToken(
                    port.dataType,
                  )}; border: 1px solid {getPortBackgroundColor(
                    port.dataType,
                    30,
                  )};"
                >
                  {port.dataType}
                </span>
                {#if port.required}
                  <span
                    class="flowdrop-badge flowdrop-badge--error flowdrop-badge--sm"
                    >Required</span
                  >
                {/if}
              </div>
              {#if port.description}
                <p
                  class="flowdrop-text--xs flowdrop-text--gray flowdrop-truncate"
                >
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
        {#each visibleBranches as branch, branchIndex (branch.name)}
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
                  <span style="color: {getDataTypeColorToken('trigger')};">
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
                    'trigger',
                    15,
                  )}; color: {getDataTypeColorToken(
                    'trigger',
                  )}; border: 1px solid {getPortBackgroundColor(
                    'trigger',
                    30,
                  )};"
                >
                  trigger
                </span>
              </div>
            </div>

            <!-- Output Handle: centered in row, at node edge (ports have no padding) -->
            <Handle
              type="source"
              position={Position.Right}
              id={`${props.data.nodeId}-output-${branch.name}`}
              class={`flowdrop-workflow-node__handle ${isActive ? "flowdrop-workflow-node__handle--active" : ""}`}
              style="top: 50%; transform: translateY(-50%); --fd-handle-fill: {isActive
                ? getDataTypeColorToken('trigger')
                : getDataTypeColorToken(
                    'trigger',
                  )}; --fd-handle-border-color: var(--fd-handle-border);"
              role="button"
              tabindex={0}
              aria-label="Connect from {branch.name} branch"
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
  <button
    class="flowdrop-workflow-node__config-btn"
    onclick={handleNodeDoubleClick}
    title="Configure node"
  >
    <Icon icon="mdi:cog" />
  </button>
</div>

<style>
  .flowdrop-workflow-node {
    position: relative;
    background-color: var(--fd-card);
    border: 1.5px solid var(--fd-node-border);
    border-radius: var(--fd-radius-xl);
    box-shadow: var(--fd-shadow-md);
    width: var(--fd-node-default-width);
    z-index: 10;
    color: var(--fd-foreground);
    transition: all var(--fd-transition-fast);
  }

  .flowdrop-workflow-node--gateway {
    min-width: var(--fd-node-default-width);
  }

  .flowdrop-workflow-node:hover {
    box-shadow: var(--fd-shadow-lg);
    border-color: var(--fd-node-border-hover);
  }

  .flowdrop-workflow-node--selected {
    box-shadow:
      0 0 0 2px var(--fd-primary-muted),
      var(--fd-shadow-lg);
    border-color: var(--fd-primary);
  }

  .flowdrop-workflow-node--selected:hover {
    box-shadow:
      0 0 0 2px var(--fd-primary-muted),
      var(--fd-shadow-lg);
    border-color: var(--fd-primary);
  }

  .flowdrop-workflow-node:focus-visible {
    outline: 2px solid var(--fd-ring);
    outline-offset: 2px;
  }

  .flowdrop-workflow-node__header {
    box-sizing: border-box;
    padding: var(--fd-node-header-gap) var(--fd-space-xl);
    border-bottom: 1px solid var(--fd-border-muted);
    background: var(--fd-header);
    border-top-left-radius: var(--fd-radius-xl);
    border-top-right-radius: var(--fd-radius-xl);
    display: flex;
    flex-direction: column;
    gap: var(--fd-node-header-gap);
    min-height: calc(
      var(--fd-node-header-gap) * 2 + var(--fd-node-header-title-height) +
        var(--fd-node-header-desc-line)
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
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 0.5rem;
    background: color-mix(
      in srgb,
      var(--_icon-color) var(--fd-node-icon-bg-opacity),
      transparent
    );
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
    width: 1.25rem;
    height: 1.25rem;
    color: var(--fd-node-icon);
  }

  .flowdrop-workflow-node__header-title h3 {
    margin: 0;
    line-height: 1;
    color: var(--fd-foreground);
  }

  .flowdrop-workflow-node__ports {
    padding: 0;
  }

  .flowdrop-workflow-node__ports-list {
    display: flex;
    flex-direction: column;
    gap: var(--fd-node-header-gap);
    padding: var(--fd-node-header-gap) 0;
  }

  .flowdrop-workflow-node__port {
    display: flex;
    align-items: center;
    gap: 0;
    min-height: var(--fd-node-port-row-height);
    padding: var(--fd-space-3xs) 0;
    position: relative;
  }

  .flowdrop-workflow-node__port-content {
    padding: 0 var(--fd-space-xl);
  }

  .flowdrop-badge {
    padding: 0.125rem var(--fd-space-3xs);
    border-radius: var(--fd-radius-sm);
    font-size: 0.625rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .flowdrop-badge--error {
    background-color: var(--fd-error);
    color: var(--fd-error-foreground);
  }

  .flowdrop-badge--sm {
    font-size: 0.625rem;
    padding: 0.125rem var(--fd-space-3xs);
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
    line-height: 1rem;
  }

  .flowdrop-text--sm {
    font-size: var(--fd-text-sm);
    line-height: 1.25rem;
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

  .flowdrop-workflow-node__config-btn {
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
    backdrop-filter: blur(4px);
    z-index: 15;
    font-size: var(--fd-text-sm);
  }

  .flowdrop-workflow-node:hover .flowdrop-workflow-node__config-btn {
    opacity: 1;
  }

  .flowdrop-workflow-node__config-btn:hover {
    background-color: var(--fd-muted);
    border-color: var(--fd-border-strong);
    color: var(--fd-foreground);
  }
</style>
