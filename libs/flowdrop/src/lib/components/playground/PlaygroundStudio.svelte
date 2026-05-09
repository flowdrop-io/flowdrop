<!--
  PlaygroundStudio Component

  Drop-in embeddable split-pane layout: PipelinePanel (left, resizable) + Playground
  chat (right). Provides the same integrated experience as the FlowDrop demo app with a
  single import and zero layout glue code.

  @example Basic usage — workflow fetched automatically
  ```svelte
  <script>
    import { PlaygroundStudio, createEndpointConfig } from '@flowdrop/flowdrop/playground';
    import '@flowdrop/flowdrop/styles';
  </script>

  <PlaygroundStudio
    workflowId="wf-123"
    endpointConfig={createEndpointConfig('/api/flowdrop')}
  />
  ```

  @example With pre-loaded workflow and URL-based session routing
  ```svelte
  <script>
    import { PlaygroundStudio, createEndpointConfig } from '@flowdrop/flowdrop/playground';

    let { data } = $props();          // workflow from server load
    let sessionId = $derived($page.params.sessionId);

    function handleSessionNavigate(id) {
      goto(`/playground/${id}`);
    }
  </script>

  <PlaygroundStudio
    workflowId={data.workflow.id}
    workflow={data.workflow}
    endpointConfig={createEndpointConfig('/api/flowdrop')}
    initialSessionId={sessionId}
    onSessionNavigate={handleSessionNavigate}
  />
  ```
-->

<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '@iconify/svelte';
  import Playground from './Playground.svelte';
  import PipelinePanel from './PipelinePanel.svelte';
  import { getPipelinePanelOpen, pipelinePanelActions } from '../../stores/pipelinePanelStore.svelte.js';
  import {
    getActiveExecutionId,
    getPinnedExecutionId,
    getLatestExecutionId,
    getCurrentSession,
    getMessages,
    playgroundActions,
  } from '../../stores/playgroundStore.svelte.js';
  import { setEndpointConfig, workflowApi } from '../../services/api.js';
  import { logger } from '../../utils/logger.js';
  import type { Workflow } from '../../types/index.js';
  import type { EndpointConfig } from '../../config/endpoints.js';
  import type { PlaygroundConfig, PlaygroundMode } from '../../types/playground.js';

  interface Props {
    /** Target workflow ID */
    workflowId: string;
    /** Pre-loaded workflow — skips internal fetch when provided */
    workflow?: Workflow;
    /** API endpoint configuration */
    endpointConfig?: EndpointConfig;
    /** Display mode (default: standalone) */
    mode?: PlaygroundMode;
    /** Session ID to activate on mount. Changing this prop remounts the Playground. */
    initialSessionId?: string;
    /** Playground configuration options */
    config?: PlaygroundConfig;
    /** Whether the pipeline panel starts open. When omitted the stored preference is used. */
    initialPipelineOpen?: boolean;
    /** Minimum chat panel width in px (default: 760) */
    minChatWidth?: number;
    /** Initial pipeline panel width in px (default: 500) */
    initialPipelineWidth?: number;
    /** Called when session navigation is requested — use for URL-based routing */
    onSessionNavigate?: (sessionId: string) => void;
    /** Called when the playground is closed (embedded / modal mode) */
    onClose?: () => void;
  }

  let {
    workflowId,
    workflow: workflowProp,
    endpointConfig,
    mode = 'standalone',
    initialSessionId,
    config = {},
    initialPipelineOpen,
    minChatWidth = 760,
    initialPipelineWidth = 500,
    onSessionNavigate,
    onClose,
  }: Props = $props();

  // svelte-ignore state_referenced_locally
  let resolvedWorkflow = $state<Workflow | null>(workflowProp ?? null);
  // svelte-ignore state_referenced_locally
  let workflowLoading = $state(workflowProp === undefined);
  let workflowError = $state<string | null>(null);

  let splitEl = $state<HTMLElement | null>(null);
  // svelte-ignore state_referenced_locally
  let pipelineWidth = $state(initialPipelineWidth);
  let isResizing = $state(false);
  let containerWidth = $state(0);

  $effect(() => {
    if (!splitEl) return;
    const observer = new ResizeObserver(([entry]) => {
      containerWidth = entry.contentRect.width;
    });
    observer.observe(splitEl);
    return () => observer.disconnect();
  });

  onMount(() => {
    pipelinePanelActions.init();
    if (initialPipelineOpen !== undefined) {
      pipelinePanelActions.setOpen(initialPipelineOpen);
    }
    if (endpointConfig) {
      setEndpointConfig(endpointConfig);
    }
    if (!workflowProp) {
      void loadWorkflow();
    }
  });

  async function loadWorkflow(): Promise<void> {
    if (!endpointConfig) {
      workflowError = 'Provide a workflow prop or an endpointConfig so the workflow can be fetched.';
      workflowLoading = false;
      return;
    }

    try {
      workflowLoading = true;
      workflowError = null;
      resolvedWorkflow = await workflowApi.getWorkflow(workflowId);
    } catch (err) {
      workflowError = err instanceof Error ? err.message : 'Failed to load workflow';
      logger.error('[PlaygroundStudio] Workflow load failed:', err);
    } finally {
      workflowLoading = false;
    }
  }

  function handleResizerPointerDown(e: PointerEvent) {
    isResizing = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handleResizerPointerMove(e: PointerEvent) {
    if (!isResizing || !splitEl) return;
    const rect = splitEl.getBoundingClientRect();
    pipelineWidth = Math.min(
      Math.max(e.clientX - rect.left, rect.width - minChatWidth),
      rect.width * 0.75
    );
  }

  function handleResizerPointerUp() {
    isResizing = false;
  }
</script>

<div class="playground-studio" class:playground-studio--resizing={isResizing} style="--playground-studio-min-chat-width: {minChatWidth}px">
  <div class="playground-studio__panes" bind:this={splitEl}>
    {#if getPipelinePanelOpen() && resolvedWorkflow && endpointConfig}
      {@const activeId = getActiveExecutionId()}
      {@const executions = getCurrentSession()?.executions ?? []}
      {@const activeIndex = executions.findIndex((e) => e.id === activeId)}
      {@const runLabel = activeIndex >= 0 ? `Run #${activeIndex + 1}` : undefined}

      <div class="playground-studio__pipeline" style="width: {pipelineWidth}px;">
        <PipelinePanel
          pipelineId={activeId}
          workflow={resolvedWorkflow}
          {endpointConfig}
          isPinned={getPinnedExecutionId() !== null}
          {runLabel}
          {executions}
          latestExecutionId={getLatestExecutionId()}
          onSelectExecution={(id) => playgroundActions.pinExecution(id)}
          refreshTrigger={getMessages().length}
        />
      </div>

      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div
        class="playground-studio__resizer"
        class:playground-studio__resizer--active={isResizing}
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={Math.round(pipelineWidth)}
        aria-valuemin={0}
        aria-valuemax={Math.round(containerWidth * 0.75)}
        tabindex="0"
        onpointerdown={handleResizerPointerDown}
        onpointermove={handleResizerPointerMove}
        onpointerup={handleResizerPointerUp}
        onpointercancel={handleResizerPointerUp}
      >
        <div class="playground-studio__resizer-handle"></div>
      </div>
    {/if}

    <div
      class="playground-studio__chat"
      class:playground-studio__chat--solo={!getPipelinePanelOpen()}
    >
      {#if workflowLoading}
        <div class="playground-studio__loading">
          <Icon icon="mdi:loading" class="playground-studio__loading-icon" />
          <p>Loading workflow...</p>
        </div>
      {:else if workflowError}
        <div class="playground-studio__error">
          <Icon icon="mdi:alert-circle" class="playground-studio__error-icon" />
          <p class="playground-studio__error-text">{workflowError}</p>
          <button type="button" class="playground-studio__retry-btn" onclick={loadWorkflow}>
            <Icon icon="mdi:refresh" />
            Retry
          </button>
        </div>
      {:else if resolvedWorkflow}
        {#key initialSessionId}
          <Playground
            {workflowId}
            workflow={resolvedWorkflow}
            {endpointConfig}
            {mode}
            {initialSessionId}
            {config}
            {onClose}
            {onSessionNavigate}
            onTogglePanel={pipelinePanelActions.toggle}
            isPipelinePanelOpen={getPipelinePanelOpen()}
          />
        {/key}
      {/if}
    </div>
  </div>
</div>

<style>
  .playground-studio {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    background-color: var(--fd-background);
  }

  .playground-studio--resizing {
    cursor: col-resize;
    user-select: none;
  }

  .playground-studio__panes {
    display: flex;
    flex-direction: row;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  /* Pipeline pane — explicit width set via inline style */
  .playground-studio__pipeline {
    min-width: calc(100% - var(--playground-studio-min-chat-width));
    max-width: 75%;
    overflow: hidden;
    flex-shrink: 0;
  }

  /* Drag handle between the two panes */
  .playground-studio__resizer {
    width: 8px;
    flex-shrink: 0;
    cursor: col-resize;
    background-color: var(--fd-background);
    border-right: 1px solid var(--fd-border);
    border-left: 1px solid var(--fd-border);
    display: flex;
    align-items: center;
    justify-content: center;
    touch-action: none;
    z-index: 1;
    transition: background-color var(--fd-transition-normal);
  }

  .playground-studio__resizer:hover,
  .playground-studio__resizer--active {
    background-color: var(--fd-primary-muted);
  }

  .playground-studio__resizer-handle {
    width: 4px;
    height: 48px;
    background-color: var(--fd-border-strong);
    border-radius: var(--fd-radius-sm);
    transition:
      background-color var(--fd-transition-normal),
      transform var(--fd-transition-normal);
  }

  .playground-studio__resizer:hover .playground-studio__resizer-handle {
    background-color: var(--fd-primary);
    transform: scaleY(1.2);
  }

  .playground-studio__resizer--active .playground-studio__resizer-handle {
    background-color: var(--fd-primary-hover);
    transform: scaleY(1.4);
  }

  /* Chat pane — fills remaining space */
  .playground-studio__chat {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .playground-studio__chat--solo {
    border-left: 1px solid var(--fd-border);
    border-right: 1px solid var(--fd-border);
  }

  /* Loading state */
  .playground-studio__loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--fd-muted-foreground);
    gap: var(--fd-space-md);
  }

  :global(.playground-studio__loading-icon) {
    font-size: var(--fd-space-6xl);
    animation: studio-spin 1s linear infinite;
  }

  @keyframes studio-spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* Error state */
  .playground-studio__error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: var(--fd-space-4xl);
    text-align: center;
    gap: var(--fd-space-md);
  }

  :global(.playground-studio__error-icon) {
    font-size: var(--fd-space-7xl);
    color: var(--fd-error);
  }

  .playground-studio__error-text {
    font-size: var(--fd-text-base);
    color: var(--fd-muted-foreground);
    margin: 0;
    max-width: 400px;
  }

  .playground-studio__retry-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-xs);
    padding: var(--fd-space-md) var(--fd-space-3xl);
    border: none;
    border-radius: var(--fd-radius-lg);
    background-color: var(--fd-primary);
    color: var(--fd-primary-foreground);
    font-size: var(--fd-text-base);
    font-weight: 500;
    cursor: pointer;
    transition: background-color var(--fd-transition-normal);
  }

  .playground-studio__retry-btn:hover {
    background-color: var(--fd-primary-hover);
  }
</style>
