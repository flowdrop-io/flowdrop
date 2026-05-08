<!--
  Playground Page
  
  Standalone page for testing workflows interactively.
  Fetches workflow data and renders the Playground component.
-->

<script lang="ts">
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { onMount } from 'svelte';
  import Icon from '@iconify/svelte';
  import Playground from '$lib/components/playground/Playground.svelte';
  import PipelinePanel from '$lib/components/playground/PipelinePanel.svelte';
  import { getPipelinePanelOpen, pipelinePanelActions } from '$lib/stores/pipelinePanelStore.svelte.js';
  import {
    getActiveExecutionId,
    getPinnedExecutionId,
    getCurrentSession
  } from '$lib/stores/playgroundStore.svelte.js';
  import { createEndpointConfig, type EndpointConfig } from '$lib/config/endpoints.js';
  import { setEndpointConfig } from '$lib/services/api.js';
  import type { Workflow } from '$lib/types/index.js';
  import type { PlaygroundConfig } from '$lib/types/playground.js';

  let { data } = $props();

  /** API endpoint configuration */
  // svelte-ignore state_referenced_locally — page remounts on navigation
  let endpointConfig = $state<EndpointConfig>(
    createEndpointConfig(data.runtimeConfig.apiBaseUrl, {
      auth: {
        type: data.runtimeConfig.authType,
        token: data.runtimeConfig.authToken
      },
      timeout: data.runtimeConfig.timeout
    })
  );

  /** Workflow ID from URL params (captured once at init to avoid re-renders) */
  const pageData = get(page);
  const workflowId: string = pageData.params.id;

  /** Session ID from URL query params (captured once at init) */
  const sessionId: string | undefined = pageData.url.searchParams.get('session') ?? undefined;

  /**
   * Parse boolean query parameter
   * Returns undefined if not present, allowing defaults to apply
   */
  function parseBoolParam(value: string | null): boolean | undefined {
    if (value === null) return undefined;
    return value === 'true' || value === '1';
  }

  /**
   * Playground configuration from URL query params (for testing)
   *
   * Supported params:
   * - showChatInput: "true" | "false" - Show/hide chat text input
   * - showRunButton: "true" | "false" - Show/hide Run button
   * - predefinedMessage: string - Message sent when Run is clicked
   * - autoRun: "true" | "false" - Auto-execute workflow on load
   * - sidebarWidth: string - CSS width for sidebar (e.g. "300px", "20rem")
   *
   * Example URLs:
   * - /workflow/demo/playground?showChatInput=false (Run button only)
   * - /workflow/demo/playground?showChatInput=false&showRunButton=false (View-only)
   * - /workflow/demo/playground?showChatInput=false&predefinedMessage=Execute%20pipeline
   * - /workflow/demo/playground?showChatInput=false&autoRun=true (Auto-execute on load)
   * - /workflow/demo/playground?sidebarWidth=320px (Wider sidebar)
   */
  const playgroundConfig: PlaygroundConfig = {
    showChatInput: parseBoolParam(pageData.url.searchParams.get('showChatInput')),
    showRunButton: parseBoolParam(pageData.url.searchParams.get('showRunButton')),
    predefinedMessage: pageData.url.searchParams.get('predefinedMessage') ?? undefined,
    autoRun: parseBoolParam(pageData.url.searchParams.get('autoRun')),
    sidebarWidth: pageData.url.searchParams.get('sidebarWidth') ?? undefined
  };

  /** Workflow data */
  let workflow = $state<Workflow | null>(null);

  /** Loading state */
  let loading = $state(true);

  /** Error state */
  let error = $state<string | null>(null);

  /** Pipeline panel resize state */
  let splitEl = $state<HTMLElement | null>(null);
  let pipelineWidth = $state(500);
  let isResizing = $state(false);

  function handleResizerPointerDown(e: PointerEvent) {
    isResizing = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handleResizerPointerMove(e: PointerEvent) {
    if (!isResizing || !splitEl) return;
    const rect = splitEl.getBoundingClientRect();
    const newWidth = e.clientX - rect.left;
    pipelineWidth = Math.min(Math.max(newWidth, 300), rect.width * 0.75);
  }

  function handleResizerPointerUp() {
    isResizing = false;
  }

  /**
   * Initialize API configuration
   */
  onMount(() => {
    pipelinePanelActions.init();
    setEndpointConfig(endpointConfig);
    loadWorkflow();
  });

  /**
   * Load workflow data with timeout protection
   */
  async function loadWorkflow(): Promise<void> {
    if (!workflowId) {
      error = 'Missing workflow ID';
      loading = false;
      return;
    }

    try {
      loading = true;
      error = null;

      // Build the API URL
      const apiUrl = `${endpointConfig.baseUrl}/workflows/${encodeURIComponent(workflowId)}`;
      console.log('[Playground] Fetching workflow from:', apiUrl);

      // Create an AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.warn('[Playground] Fetch timeout - aborting request');
      }, 10000); // 10 second timeout

      try {
        const response = await fetch(apiUrl, {
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('[Playground] Workflow loaded:', result);

        // Extract workflow data from response
        workflow = result.success && result.data ? result.data : result;

        if (!workflow) {
          throw new Error('No workflow data in response');
        }
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        throw fetchErr;
      }
    } catch (err) {
      console.error('[Playground] Failed to load workflow:', err);

      // Handle specific error types
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          error = 'Request timed out. Please check your connection and try again.';
        } else {
          error = err.message;
        }
      } else {
        error = 'Failed to load workflow';
      }
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Playground - {workflow?.name ?? 'Workflow'} - FlowDrop</title>
</svelte:head>

<div class="playground-page" class:playground-page--resizing={isResizing}>
  <!-- Content -->
  <main class="playground-page__content">
    <div class="playground-page__split" bind:this={splitEl}>
      {#if getPipelinePanelOpen() && workflow}
        {@const activeId = getActiveExecutionId()}
        {@const executions = getCurrentSession()?.executions ?? []}
        {@const activeIndex = executions.findIndex((e) => e.id === activeId)}
        {@const runLabel = activeIndex >= 0 ? `Run #${activeIndex + 1}` : undefined}
        <div class="playground-page__pipeline" style="width: {pipelineWidth}px;">
          <PipelinePanel
            pipelineId={activeId}
            {workflow}
            {endpointConfig}
            isPinned={getPinnedExecutionId() !== null}
            {runLabel}
          />
        </div>
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div
          class="playground-page__resizer"
          class:playground-page__resizer--active={isResizing}
          role="separator"
          aria-orientation="vertical"
          onpointerdown={handleResizerPointerDown}
          onpointermove={handleResizerPointerMove}
          onpointerup={handleResizerPointerUp}
          onpointercancel={handleResizerPointerUp}
        >
          <div class="playground-page__resizer-handle"></div>
        </div>
      {/if}

      <div class="playground-page__primary">
        {#if loading}
          <div class="playground-page__loading">
            <Icon icon="mdi:loading" class="playground-page__loading-icon" />
            <p>Loading workflow...</p>
          </div>
        {:else if error}
          <div class="playground-page__error">
            <Icon icon="mdi:alert-circle" class="playground-page__error-icon" />
            <h2 class="playground-page__error-title">Failed to load workflow</h2>
            <p class="playground-page__error-text">{error}</p>
            <button type="button" class="playground-page__retry-btn" onclick={loadWorkflow}>
              <Icon icon="mdi:refresh" />
              Retry
            </button>
          </div>
        {:else if workflow}
          <Playground
            {workflowId}
            {workflow}
            {endpointConfig}
            mode="standalone"
            initialSessionId={sessionId}
            config={playgroundConfig}
            onTogglePanel={pipelinePanelActions.toggle}
            isPipelinePanelOpen={getPipelinePanelOpen()}
          />
        {:else}
          <div class="playground-page__empty">
            <Icon icon="mdi:file-question" class="playground-page__empty-icon" />
            <h2 class="playground-page__empty-title">Workflow not found</h2>
            <p class="playground-page__empty-text">
              The workflow you're looking for doesn't exist or has been deleted.
            </p>
            <a href="/" class="playground-page__home-link">
              <Icon icon="mdi:home" />
              Go to Home
            </a>
          </div>
        {/if}
      </div>
    </div>
  </main>
</div>

<style>
  .playground-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    overflow: hidden; /* Prevent page-level scrolling - let chat panel handle it */
    background-color: var(--fd-background);
  }

  /* Content - fills the available space */
  .playground-page__content {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* Split layout container */
  .playground-page__split {
    display: flex;
    flex-direction: row;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  /* Primary area (playground chat) */
  .playground-page__primary {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* Drag handle between primary and pipeline panels — matches MainLayout divider style */
  .playground-page__resizer {
    width: 8px;
    flex-shrink: 0;
    cursor: col-resize;
    background-color: var(--fd-background);
    border-right: 1px solid var(--fd-border);
    border-left: 1px solid var(--fd-border);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    touch-action: none;
    z-index: 1;
    transition: background-color 0.2s ease;
  }

  .playground-page__resizer:hover,
  .playground-page__resizer--active {
    background-color: var(--fd-primary-muted);
  }

  .playground-page__resizer-handle {
    width: 4px;
    height: 48px;
    background-color: var(--fd-border-strong);
    border-radius: 4px;
    transition:
      background-color 0.2s ease,
      transform 0.2s ease;
  }

  .playground-page__resizer:hover .playground-page__resizer-handle {
    background-color: var(--fd-primary);
    transform: scaleY(1.2);
  }

  .playground-page__resizer--active .playground-page__resizer-handle {
    background-color: var(--fd-primary-hover);
    transform: scaleY(1.4);
  }

  /* Pipeline panel — width set via inline style */
  .playground-page__pipeline {
    min-width: 300px;
    max-width: 75%;
    overflow: hidden;
    flex-shrink: 0;
  }

  /* Prevent text selection and keep col-resize cursor while dragging */
  .playground-page--resizing {
    cursor: col-resize;
    user-select: none;
  }

  /* Loading */
  .playground-page__loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--fd-muted-foreground);
  }

  :global(.playground-page__loading-icon) {
    font-size: var(--fd-space-6xl);
    animation: spin 1s linear infinite;
    margin-bottom: var(--fd-space-xl);
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* Error */
  .playground-page__error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: var(--fd-space-4xl);
    text-align: center;
  }

  :global(.playground-page__error-icon) {
    font-size: var(--fd-space-7xl);
    color: var(--fd-error);
    margin-bottom: var(--fd-space-xl);
  }

  .playground-page__error-title {
    font-size: var(--fd-text-2xl);
    font-weight: 600;
    color: var(--fd-foreground);
    margin: 0 0 var(--fd-space-xs) 0;
  }

  .playground-page__error-text {
    font-size: var(--fd-text-base);
    color: var(--fd-muted-foreground);
    margin: 0 0 var(--fd-space-3xl) 0;
    max-width: 400px;
  }

  .playground-page__retry-btn {
    display: flex;
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

  .playground-page__retry-btn:hover {
    background-color: var(--fd-primary-hover);
  }

  /* Empty */
  .playground-page__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: var(--fd-space-4xl);
    text-align: center;
  }

  :global(.playground-page__empty-icon) {
    font-size: var(--fd-space-7xl);
    color: var(--fd-border-strong);
    margin-bottom: var(--fd-space-xl);
  }

  .playground-page__empty-title {
    font-size: var(--fd-text-2xl);
    font-weight: 600;
    color: var(--fd-foreground);
    margin: 0 0 var(--fd-space-xs) 0;
  }

  .playground-page__empty-text {
    font-size: var(--fd-text-base);
    color: var(--fd-muted-foreground);
    margin: 0 0 var(--fd-space-3xl) 0;
    max-width: 400px;
  }

  .playground-page__home-link {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    padding: var(--fd-space-md) var(--fd-space-3xl);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-lg);
    background: var(--fd-background);
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-base);
    text-decoration: none;
    transition: all var(--fd-transition-normal);
  }

  .playground-page__home-link:hover {
    background-color: var(--fd-muted);
    border-color: var(--fd-border-strong);
    color: var(--fd-foreground);
  }
</style>
