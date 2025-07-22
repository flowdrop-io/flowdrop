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
  import ConfigModal from "./ConfigModal.svelte";

  interface Props {
    data: WorkflowNode["data"] & { nodeId?: string };
    selected?: boolean;
    onPortClick?: (nodeId: string, portId: string, isOutput: boolean, event: MouseEvent) => void;
  }

  let props: Props = $props();
  let configValues = $state({ ...props.data.config });
  let isHandleInteraction = $state(false);
  let isConfigModalOpen = $state(false);

  // Debug logging
  $effect(() => {
    console.log('🔧 WorkflowNode Debug:', {
      nodeId: props.data.nodeId,
      label: props.data.label,
      config: props.data.config,
      configSchema: props.data.metadata.configSchema,
      configSchemaProperties: props.data.metadata.configSchema?.properties,
      configValues: configValues,
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
   * Open configuration modal
   */
  function openConfigModal(): void {
    isConfigModalOpen = true;
  }

  /**
   * Handle configuration save
   */
  function handleConfigSave({ detail }: { detail: { values: ConfigValues } }): void {
    configValues = detail.values;
    props.data.config = detail.values;
    isConfigModalOpen = false;
  }

  /**
   * Handle configuration cancel
   */
  function handleConfigCancel(): void {
    isConfigModalOpen = false;
  }

  /**
   * Handle configuration close
   */
  function handleConfigClose(): void {
    isConfigModalOpen = false;
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
  <!-- Default Node Header -->
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
        {#if props.data.metadata.configSchema}
          <button
            class="flowdrop-workflow-node__config-btn"
            onclick={(e) => {
              e.stopPropagation();
              openConfigModal();
            }}
            type="button"
            aria-label="Configure node"
            title="Configure node"
          >
            <Icon icon="mdi:cog" />
          </button>
        {/if}
      </div>
    </div>
    <!-- Node Description - on new line below -->
    <p class="flowdrop-text--xs flowdrop-text--gray flowdrop-truncate flowdrop-mt--1" id="node-description-{props.data.nodeId || 'unknown'}">
      {props.data.metadata.description}
    </p>
  </div>

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
              style="top: 50%; transform: translateY(-50%); margin-left: -32px;"
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
              style="top: 50%; transform: translateY(-50%); margin-right: -32px;"
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

<!-- Configuration Modal -->
<ConfigModal
  isOpen={isConfigModalOpen}
  nodeId={props.data.nodeId || 'unknown'}
  nodeLabel={props.data.label}
  configSchema={props.data.metadata.configSchema}
  configValues={configValues}
  on:save={handleConfigSave}
  on:cancel={handleConfigCancel}
  on:close={handleConfigClose}
/>

<style>
  .flowdrop-workflow-node {
    position: relative;
    background-color: #ffffff;
    border: 2px solid #e5e7eb;
    border-radius: 0.75rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    width: 18rem;
    z-index: 10;
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
  
  .flowdrop-workflow-node__config-btn {
    width: 1.5rem;
    height: 1.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.25rem;
    background-color: #ffffff;
    color: #6b7280;
    font-size: 0.75rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease-in-out;
  }
  
  .flowdrop-workflow-node__config-btn:hover {
    background-color: #f3f4f6;
    color: #374151;
    border-color: #9ca3af;
  }
  
  .flowdrop-workflow-node__config-btn:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }
  
  .flowdrop-workflow-node__status {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 50%;
    display: inline-block;
  }
  
  .flowdrop-workflow-node__status--processing {
    background-color: #f59e0b;
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  
  .flowdrop-workflow-node__status--error {
    background-color: #ef4444;
  }
  
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
  
  .flowdrop-workflow-node__ports {
    padding: 0.75rem 1rem;
  }
  
  .flowdrop-workflow-node__ports-header {
    margin-bottom: 0.5rem;
  }
  
  .flowdrop-workflow-node__ports-title {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 600;
    color: #374151;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .flowdrop-workflow-node__ports-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .flowdrop-workflow-node__port {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0;
    position: relative;
  }
  
  .flowdrop-workflow-node__handle {
    width: 0.75rem;
    height: 0.75rem;
    background-color: #6b7280;
    border: 2px solid #ffffff;
    border-radius: 50%;
    cursor: crosshair;
    transition: all 0.2s ease-in-out;
  }
  
  .flowdrop-workflow-node__handle:hover {
    background-color: #3b82f6;
    transform: scale(1.2);
  }
  
  .flowdrop-workflow-node__handle:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }
  
  .flowdrop-badge {
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.625rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .flowdrop-badge--error {
    background-color: #ef4444;
    color: #ffffff;
  }
  
  .flowdrop-badge--sm {
    font-size: 0.625rem;
    padding: 0.125rem 0.25rem;
  }
  
  /* Utility classes */
  .flowdrop-flex {
    display: flex;
  }
  
  .flowdrop-flex--1 {
    flex: 1;
  }
  
  .flowdrop-gap--2 {
    gap: 0.5rem;
  }
  
  .flowdrop-gap--3 {
    gap: 0.75rem;
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
    font-size: 0.75rem;
    line-height: 1rem;
  }
  
  .flowdrop-text--sm {
    font-size: 0.875rem;
    line-height: 1.25rem;
  }
  
  .flowdrop-text--gray {
    color: #6b7280;
  }
  
  .flowdrop-font--medium {
    font-weight: 500;
  }
  
  .flowdrop-truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .flowdrop-mt--1 {
    margin-top: 0.25rem;
  }
  
  .flowdrop-text--right {
    text-align: right;
  }
</style> 