<!--
  Playground Session Page

  Renders the playground for a specific session ID.
  The session ID comes from the URL — navigating to a different
  session causes Playground to fully remount via {#key sessionId}.
-->

<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import Icon from '@iconify/svelte';
  import Playground from '$lib/components/playground/Playground.svelte';
  import PipelinePanel from '$lib/components/playground/PipelinePanel.svelte';
  import { getPipelinePanelOpen, pipelinePanelActions } from '$lib/stores/pipelinePanelStore.svelte.js';
  import {
    getActiveExecutionId,
    getPinnedExecutionId,
    getLatestExecutionId,
    getPipelineRefreshTrigger,
    getCurrentSession,
    playgroundActions
  } from '$lib/stores/playgroundStore.svelte.js';
  import { createEndpointConfig, type EndpointConfig } from '$lib/config/endpoints.js';
  import { setEndpointConfig } from '$lib/services/api.js';
  import type { Workflow } from '$lib/types/index.js';
  import type { PlaygroundConfig } from '$lib/types/playground.js';

  let { data } = $props();

  // Reactive route params — update automatically when SvelteKit reuses this component
  let workflowId = $derived($page.params.id);
  let sessionId = $derived($page.params.sessionId);

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

  function parseBoolParam(value: string | null): boolean | undefined {
    if (value === null) return undefined;
    return value === 'true' || value === '1';
  }

  // $derived keeps config in sync if query params change without a full navigation
  const playgroundConfig: PlaygroundConfig = $derived({
    showChatInput: parseBoolParam($page.url.searchParams.get('showChatInput')),
    showRunButton: parseBoolParam($page.url.searchParams.get('showRunButton')),
    predefinedMessage: $page.url.searchParams.get('predefinedMessage') ?? undefined,
    autoRun: parseBoolParam($page.url.searchParams.get('autoRun')),
    sidebarWidth: $page.url.searchParams.get('sidebarWidth') ?? undefined
  });

  /** Workflow data */
  let workflow = $state<Workflow | null>(null);
  let loading = $state(true);
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
    const MIN_CHAT_WIDTH = 760;
    pipelineWidth = Math.min(Math.max(e.clientX - rect.left, rect.width - MIN_CHAT_WIDTH), rect.width * 0.75);
  }

  function handleResizerPointerUp() {
    isResizing = false;
  }

  /** Navigate to a different session — triggers {#key} remount of Playground */
  function handleSessionNavigate(newSessionId: string) {
    goto(`/workflow/${workflowId}/playground/${newSessionId}`);
  }

  onMount(() => {
    pipelinePanelActions.init();
    setEndpointConfig(endpointConfig);
    loadWorkflow();
  });

  async function loadWorkflow(): Promise<void> {
    if (!workflowId) {
      error = 'Missing workflow ID';
      loading = false;
      return;
    }

    try {
      loading = true;
      error = null;

      const apiUrl = `${endpointConfig.baseUrl}/workflows/${encodeURIComponent(workflowId)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch(apiUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

        const result = await response.json();
        workflow = result.success && result.data ? result.data : result;
        if (!workflow) throw new Error('No workflow data in response');
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        throw fetchErr;
      }
    } catch (err) {
      if (err instanceof Error) {
        error = err.name === 'AbortError'
          ? 'Request timed out. Please check your connection and try again.'
          : err.message;
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
            {executions}
            latestExecutionId={getLatestExecutionId()}
            onSelectExecution={(id) => playgroundActions.pinExecution(id)}
            refreshTrigger={getPipelineRefreshTrigger()}
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

      <div class="playground-page__primary" class:playground-page__primary--solo={!getPipelinePanelOpen()}>
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
          <!-- {#key sessionId} forces Playground to fully remount when navigating between sessions -->
          {#key sessionId}
            <Playground
              {workflowId}
              {workflow}
              {endpointConfig}
              mode="standalone"
              initialSessionId={sessionId}
              config={playgroundConfig}
              onTogglePanel={pipelinePanelActions.toggle}
              isPipelinePanelOpen={getPipelinePanelOpen()}
              onSessionNavigate={handleSessionNavigate}
            />
          {/key}
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
    overflow: hidden;
    background-color: var(--fd-background);
  }

  .playground-page__content {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .playground-page__split {
    display: flex;
    flex-direction: row;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .playground-page__primary {
    flex: 1;
    min-width: 0;
    max-width: 760px;
    margin: 0 auto;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .playground-page__primary--solo {
    border-left: 1px solid var(--fd-border);
    border-right: 1px solid var(--fd-border);
  }

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
    transition: background-color 0.2s ease, transform 0.2s ease;
  }

  .playground-page__resizer:hover .playground-page__resizer-handle {
    background-color: var(--fd-primary);
    transform: scaleY(1.2);
  }

  .playground-page__resizer--active .playground-page__resizer-handle {
    background-color: var(--fd-primary-hover);
    transform: scaleY(1.4);
  }

  .playground-page__pipeline {
    min-width: calc(100% - 760px);
    max-width: 75%;
    overflow: hidden;
    flex-shrink: 0;
  }

  .playground-page--resizing {
    cursor: col-resize;
    user-select: none;
  }

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
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

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
