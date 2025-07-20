<!--
  Workflow Node Component
  Renders individual nodes in the workflow editor with full functionality
  Uses SvelteFlow's Handle for connection ports
  Styled with BEM syntax
-->

<script lang="ts">
  import { 
    Position, 
    // @ts-ignore
    Handle,
    type NodeProps 
  } from "@xyflow/svelte";
  import type { WorkflowNode, NodePort, ConfigValues } from "../types/index.js";
  import Icon from "@iconify/svelte";
  import { getNodeIcon } from "../utils/icons.js";
  import { getDataTypeColorToken, getCategoryColorToken } from "../utils/colors.js";
  import ConfigForm from "./ConfigForm.svelte";

  interface Props {
    data: WorkflowNode["data"] & { nodeId?: string };
    selected?: boolean;
    onPortClick?: (nodeId: string, portId: string, isOutput: boolean, event: MouseEvent) => void;
  }

  let props: Props = $props();
  let isExpanded = $state(true); // Temporarily force expansion for debugging
  let configValues = $state({ ...props.data.config });
  let isHandleInteraction = $state(false);

  // Debug logging
  $effect(() => {
    console.log('🔧 WorkflowNode Debug:', {
      nodeId: props.data.nodeId,
      label: props.data.label,
      config: props.data.config,
      configSchema: props.data.metadata.configSchema,
      configSchemaProperties: props.data.metadata.configSchema?.properties,
      configValues: configValues,
      isExpanded: isExpanded,
      configKeys: Object.keys(configValues),
      hasConfig: Object.keys(configValues).length > 0,
      metadataKeys: Object.keys(props.data.metadata || {})
    });
  });

  /**
   * Handle configuration value changes
   */
  function handleConfigChange(key: string, value: unknown): void {
    configValues = { ...configValues, [key]: value };
  }

  /**
   * Handle node selection
   */
  function handleNodeClick(): void {
    // Node selection is handled through events
  }

  /**
   * Toggle node expansion
   */
  function toggleExpansion(): void {
    isExpanded = !isExpanded;
  }

  /**
   * Handle node drag start
   */
  function handleDragStart(event: DragEvent): void {
    // Prevent default drag behavior
    event.preventDefault();
  }
</script>

<!-- Node Container -->
<div
  class="flowdrop-workflow-node"
  class:flowdrop-workflow-node--selected={props.selected}
  onclick={handleNodeClick}
  onmouseup={() => {
    isHandleInteraction = false;
  }}
  data-handle-interaction={isHandleInteraction}
  role="button"
  tabindex="0"
  onkeydown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleNodeClick();
    }
  }}
  aria-label="Workflow node: {props.data.metadata.name}"
  aria-describedby="node-description-{props.data.nodeId || 'unknown'}"
>
  <!-- Node Header -->
  <div class="flowdrop-workflow-node__header">
    <div class="flowdrop-flex flowdrop-gap--3 flowdrop-items--center">
      <!-- Node Icon -->
      <div class="flowdrop-workflow-node__icon" style="background-color: {getCategoryColorToken(props.data.metadata.category)}">
        <Icon icon={getNodeIcon(props.data.metadata.icon, props.data.metadata.category)} />
      </div>
      
      <!-- Node Title - Icon and Title on same line -->
      <h3 class="flowdrop-text--sm flowdrop-font--medium flowdrop-truncate flowdrop-flex--1">
        {props.data.label}
      </h3>
      
      <!-- Status Indicators -->
      <div class="flowdrop-flex flowdrop-gap--2">
        {#if props.data.isProcessing}
          <div class="flowdrop-workflow-node__status flowdrop-workflow-node__status--processing" title="Processing"></div>
        {/if}
        {#if props.data.error}
          <div class="flowdrop-workflow-node__status flowdrop-workflow-node__status--error" title="Error"></div>
        {/if}
        <button
          class="flowdrop-workflow-node__expand-btn"
          onclick={(e) => {
            e.stopPropagation();
            toggleExpansion();
          }}
          type="button"
          aria-label="{isExpanded ? 'Collapse' : 'Expand'} node configuration"
        >
          <span class="flowdrop-text--xs flowdrop-font--medium">{isExpanded ? "−" : "+"}</span>
        </button>
      </div>
    </div>
    <!-- Node Description - on new line below -->
    <p class="flowdrop-text--xs flowdrop-text--gray flowdrop-truncate flowdrop-mt--1" id="node-description-{props.data.nodeId || 'unknown'}">
      {props.data.metadata.description}
    </p>
  </div>

  <!-- Node Configuration (Expanded) -->
  {#if isExpanded}
    <div class="flowdrop-workflow-node__config">
      <h4 class="flowdrop-workflow-node__config-title">Configuration</h4>
      <div class="flowdrop-workflow-node__config-content">
        {#if props.data.metadata.configSchema}
          <ConfigForm
            schema={props.data.metadata.configSchema}
            values={configValues}
            on:change={({ detail }) => {
              configValues = detail.values;
              // Update the node's config in the workflow
              props.data.config = detail.values;
            }}
            on:validate={({ detail }) => {
              console.log('Config validation:', detail);
            }}
          />
        {:else}
          <p class="flowdrop-text--xs flowdrop-text--gray">No configuration schema available for this node type.</p>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Input Ports Container -->
  {#if props.data.metadata.inputs.length > 0}
    <div class="flowdrop-workflow-node__ports">
      <div class="flowdrop-workflow-node__ports-header">
        <h5 class="flowdrop-workflow-node__ports-title">Inputs</h5>
      </div>
      <div class="flowdrop-workflow-node__ports-list">
        {#each props.data.metadata.inputs as port (port.id)}
          <div class="flowdrop-workflow-node__port">
            <!-- Input Handle -->
            <Handle
              type="target"
              position={Position.Left}
              id={port.id}
              class="flowdrop-workflow-node__handle"
              style="top: 50%; transform: translateY(-50%); margin-left: -16px;"
              role="button"
              tabindex={0}
              aria-label="Connect to {port.name} input port"
            />
            
            <!-- Port Info -->
            <div class="flowdrop-flex--1 flowdrop-min-w--0">
              <div class="flowdrop-flex flowdrop-gap--2">
                <span class="flowdrop-text--xs flowdrop-font--medium">{port.name}</span>
                <span class="flowdrop-badge flowdrop-badge--sm" style="background-color: {getDataTypeColorToken(port.dataType)}; color: #fff;">
                  {port.dataType}
                </span>
                {#if port.required}
                  <span class="flowdrop-badge flowdrop-badge--error flowdrop-badge--sm">Required</span>
                {/if}
              </div>
              {#if port.description}
                <p class="flowdrop-text--xs flowdrop-text--gray flowdrop-truncate">{port.description}</p>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Output Ports Container -->
  {#if props.data.metadata.outputs.length > 0}
    <div class="flowdrop-workflow-node__ports">
      <div class="flowdrop-workflow-node__ports-header">
        <h5 class="flowdrop-workflow-node__ports-title">Outputs</h5>
      </div>
      <div class="flowdrop-workflow-node__ports-list">
        {#each props.data.metadata.outputs as port (port.id)}
          <div class="flowdrop-workflow-node__port">
            <!-- Port Info -->
            <div class="flowdrop-flex--1 flowdrop-min-w--0 flowdrop-text--right">
              <div class="flowdrop-flex flowdrop-gap--2 flowdrop-justify--end">
                <span class="flowdrop-text--xs flowdrop-font--medium">{port.name}</span>
                <span class="flowdrop-badge flowdrop-badge--sm" style="background-color: {getDataTypeColorToken(port.dataType)}; color: #fff;">
                  {port.dataType}
                </span>
              </div>
              {#if port.description}
                <p class="flowdrop-text--xs flowdrop-text--gray flowdrop-truncate">{port.description}</p>
              {/if}
            </div>
            
            <!-- Output Handle -->
            <Handle
              type="source"
              position={Position.Right}
              id={port.id}
              class="flowdrop-workflow-node__handle"
              style="top: 50%; transform: translateY(-50%); margin-right: -16px;"
              role="button"
              tabindex={0}
              aria-label="Connect from {port.name} output port"
            />
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .flowdrop-workflow-node {
    position: relative;
    background-color: #ffffff;
    border: 2px solid #e5e7eb;
    border-radius: 0.75rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    min-width: 14rem;
    max-width: 18rem;
  }
  
  .flowdrop-workflow-node--selected {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    border: 2px solid #3b82f6;
  }
  
  .flowdrop-workflow-node__header {
    padding: 1rem;
    border-bottom: 1px solid #e5e7eb;
    background-color: #f9fafb;
    border-top-left-radius: 0.75rem;
    border-top-right-radius: 0.75rem;
  }
  
  .flowdrop-workflow-node__icon {
    width: 2rem;
    height: 2rem;
    border-radius: 0.5rem;
    color: #ffffff;
    font-size: 0.875rem;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  }
  
  .flowdrop-workflow-node__header h3 {
    margin: 0;
    line-height: 1;
  }
  
  .flowdrop-workflow-node__expand-btn {
    width: 1.5rem;
    height: 1.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.25rem;
    background-color: #ffffff;
    color: #6b7280;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease-in-out;
  }
  
  .flowdrop-workflow-node__expand-btn:hover {
    background-color: #f3f4f6;
    border-color: #9ca3af;
    color: #374151;
  }
  
  .flowdrop-workflow-node__expand-btn:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }
  
  .flowdrop-workflow-node__status {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
  }
  
  .flowdrop-workflow-node__status--processing {
    background-color: #f59e0b;
    animation: flowdrop-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  
  .flowdrop-workflow-node__status--error {
    background-color: #ef4444;
  }
  
  .flowdrop-workflow-node__expand-btn {
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 0.375rem;
    background-color: #f3f4f6;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6b7280;
    transition: all 0.2s ease-in-out;
    border: none;
    cursor: pointer;
  }
  
  .flowdrop-workflow-node__expand-btn:hover {
    background-color: #e5e7eb;
    color: #374151;
  }
  
  .flowdrop-workflow-node__config {
    padding: 1rem;
    border-bottom: 1px solid #e5e7eb;
    background-color: #f9fafb;
  }
  
  .flowdrop-workflow-node__config-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: #374151;
    margin-bottom: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .flowdrop-workflow-node__config-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .flowdrop-form-control {
    display: flex;
    flex-direction: column;
  }
  
  .flowdrop-form-control__label {
    padding-bottom: 0.25rem;
    display: flex;
    flex-direction: column;
  }
  
  .flowdrop-input {
    display: block;
    width: 100%;
    padding: 0.375rem 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    line-height: 1.25rem;
    color: #111827;
    background-color: rgba(255, 255, 255, 0.7);
    transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  }
  
  .flowdrop-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  .flowdrop-input--sm {
    padding: 0.375rem 0.5rem;
    font-size: 0.75rem;
  }
  
  .flowdrop-textarea {
    display: block;
    width: 100%;
    padding: 0.375rem 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    line-height: 1.25rem;
    color: #111827;
    background-color: rgba(255, 255, 255, 0.7);
    transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
    resize: vertical;
    min-height: 2.5rem;
  }
  
  .flowdrop-textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  .flowdrop-textarea--sm {
    padding: 0.375rem 0.5rem;
    font-size: 0.75rem;
  }
  
  .flowdrop-select {
    display: block;
    width: 100%;
    padding: 0.375rem 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    line-height: 1.25rem;
    color: #111827;
    background-color: rgba(255, 255, 255, 0.7);
    transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  }
  
  .flowdrop-select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  .flowdrop-select--sm {
    padding: 0.375rem 0.5rem;
    font-size: 0.75rem;
  }
  
  .flowdrop-toggle {
    appearance: none;
    width: 2rem;
    height: 1rem;
    background-color: #d1d5db;
    border-radius: 9999px;
    position: relative;
    cursor: pointer;
    transition: background-color 0.2s ease-in-out;
  }
  
  .flowdrop-toggle:checked {
    background-color: #3b82f6;
  }
  
  .flowdrop-toggle::before {
    content: "";
    position: absolute;
    width: 0.75rem;
    height: 0.75rem;
    background-color: #ffffff;
    border-radius: 50%;
    top: 0.125rem;
    left: 0.125rem;
    transition: transform 0.2s ease-in-out;
  }
  
  .flowdrop-toggle:checked::before {
    transform: translateX(1rem);
  }
  
  .flowdrop-toggle--sm {
    width: 1.5rem;
    height: 0.75rem;
  }
  
  .flowdrop-toggle--sm::before {
    width: 0.5rem;
    height: 0.5rem;
    top: 0.125rem;
    left: 0.125rem;
  }
  
  .flowdrop-toggle--sm:checked::before {
    transform: translateX(0.75rem);
  }
  
  .flowdrop-workflow-node__ports {
    border-bottom: 1px solid #e5e7eb;
  }
  
  .flowdrop-workflow-node__ports:last-child {
    border-bottom: none;
  }
  
  .flowdrop-workflow-node__ports-header {
    padding: 0.5rem 1rem;
    background-color: #f3f4f6;
  }
  
  .flowdrop-workflow-node__ports-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .flowdrop-workflow-node__ports-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .flowdrop-workflow-node__port {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    transition: background-color 0.2s ease-in-out;
  }
  
  .flowdrop-workflow-node__port:hover {
    background-color: #f9fafb;
  }
  
  .flowdrop-workflow-node__handle {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    background-color: #3b82f6;
    border: 2px solid #ffffff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    cursor: crosshair;
    transition: all 0.2s ease-in-out;
  }
  
  .flowdrop-workflow-node__handle:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }
  
  .flowdrop-badge--sm {
    padding: 0.125rem 0.25rem;
    font-size: 0.625rem;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  }
  
  .flowdrop-badge--error {
    background-color: #fee2e2;
    color: #991b1b;
  }
  
  .flowdrop-justify--end {
    justify-content: flex-end;
  }
  
  .flowdrop-text--right {
    text-align: right;
  }
  
  .flowdrop-min-w--0 {
    min-width: 0;
  }
  
  .flowdrop-truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .flowdrop-mt--1 {
    margin-top: 0.25rem;
  }
  
  .flowdrop-mb--1 {
    margin-bottom: 0.25rem;
  }
  
  .flowdrop-gap--3 {
    gap: 0.75rem;
  }
  
  .flowdrop-flex {
    display: flex;
  }
  
  .flowdrop-items--center {
    align-items: center;
  }
  
  @keyframes flowdrop-pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
  
  /* Focus styles for accessibility */
  .flowdrop-workflow-node:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }
  
  .flowdrop-workflow-node:focus:not(:focus-visible) {
    outline: none;
  }
  
  /* Configuration form styling */
  .flowdrop-form-control input:focus,
  .flowdrop-form-control textarea:focus {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
</style> 