<script lang="ts">
  import PipelineStatus from '$lib/components/PipelineStatus.svelte';
  import App from '$lib/components/App.svelte';
  import Icon from '@iconify/svelte';
  import type { Workflow } from '$lib/types/index.js';
  import type { EndpointConfig } from '$lib/config/endpoints.js';
  import type { PlaygroundExecution } from '$lib/types/playground.js';

  interface Props {
    pipelineId: string | null;
    workflow: Workflow;
    endpointConfig: EndpointConfig;
    isPinned: boolean;
    /** All executions for the current session, oldest-first */
    executions?: PlaygroundExecution[];
    /** ID of the most-recent execution */
    latestExecutionId?: string | null;
    /** Called with an execution ID to pin it, or null to follow latest */
    onSelectExecution?: (id: string | null) => void;
    /** Increments when new messages arrive — forwarded to PipelineStatus for immediate refresh */
    refreshTrigger?: number;
  }

  let {
    pipelineId,
    workflow,
    endpointConfig,
    isPinned,
    executions = [],
    latestExecutionId = null,
    onSelectExecution,
    refreshTrigger = 0,
  }: Props = $props();

  let runDropdownOpen = $state(false);
  let chipWrapEl = $state<HTMLElement | null>(null);
  let runChipEl = $state<HTMLElement | null>(null);
  let runPopoverEl = $state<HTMLElement | null>(null);

  $effect(() => {
    if (runDropdownOpen && runPopoverEl) {
      runPopoverEl.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    }
  });

  // Close run popover on outside click
  $effect(() => {
    if (!runDropdownOpen) return;
    function handleOutside(e: MouseEvent) {
      if (!chipWrapEl?.contains(e.target as Node)) {
        runDropdownOpen = false;
      }
    }
    document.addEventListener('click', handleOutside);
    return () => document.removeEventListener('click', handleOutside);
  });

  function statusIcon(status: PlaygroundExecution['status']): string {
    if (status === 'running') return 'mdi:loading';
    if (status === 'failed') return 'mdi:alert-circle';
    return 'mdi:check-circle';
  }

  function statusClass(status: PlaygroundExecution['status']): string {
    if (status === 'running') return 'pipeline-panel__run-status--running';
    if (status === 'failed') return 'pipeline-panel__run-status--failed';
    return 'pipeline-panel__run-status--completed';
  }
</script>

<div class="pipeline-panel">
  <div class="pipeline-panel__header">
    <Icon icon="mdi:source-branch" class="pipeline-panel__icon" />
    <span class="pipeline-panel__title">Pipeline</span>

    {#if pipelineId && executions.length > 0}
      <!-- Run picker chip -->
      <div class="pipeline-panel__run-chip-wrap" bind:this={chipWrapEl}>
        <button
          type="button"
          class="pipeline-panel__run-chip"
          class:pipeline-panel__run-chip--pinned={isPinned}
          class:pipeline-panel__run-chip--open={runDropdownOpen}
          bind:this={runChipEl}
          aria-haspopup="true"
          aria-expanded={runDropdownOpen}
          onclick={() => (runDropdownOpen = !runDropdownOpen)}
          onkeydown={(e) => { if (e.key === 'Escape') { runDropdownOpen = false; } }}
          title="Switch run"
        >
          <span class="pipeline-panel__run-chip-label">{pipelineId ?? 'Run'}</span>
          <Icon icon={runDropdownOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'} class="pipeline-panel__run-chip-chevron" />
        </button>

        {#if runDropdownOpen}
          <div
            class="pipeline-panel__run-popover"
            bind:this={runPopoverEl}
            role="menu"
            onkeydown={(e) => { if (e.key === 'Escape') { runDropdownOpen = false; runChipEl?.focus(); } }}
          >
            {#each [...executions].reverse() as exec (exec.id)}
              {@const isActive = pipelineId === exec.id}
              <button
                type="button"
                role="menuitem"
                class="pipeline-panel__run-popover-item"
                class:pipeline-panel__run-popover-item--active={isActive}
                onclick={() => {
                  onSelectExecution?.(exec.id === latestExecutionId ? null : exec.id);
                  runDropdownOpen = false;
                }}
              >
                <Icon
                  icon={statusIcon(exec.status)}
                  class="pipeline-panel__run-status {statusClass(exec.status)}"
                />
                <span class="pipeline-panel__run-id">{exec.id}</span>
                {#if isActive}
                  <Icon icon="mdi:check" class="pipeline-panel__run-popover-check" />
                {/if}
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Latest toggle -->
      <button
        type="button"
        class="pipeline-panel__latest-toggle"
        class:pipeline-panel__latest-toggle--active={!isPinned}
        onclick={() => {
          if (isPinned) {
            onSelectExecution?.(null);
          } else {
            onSelectExecution?.(latestExecutionId);
          }
        }}
        title={isPinned ? 'Following latest is off — click to resume' : 'Always showing the most recent run'}
      >
        <Icon icon="mdi:refresh" />
        Latest
      </button>
    {:else if pipelineId}
      <span
        class="pipeline-panel__status-badge pipeline-panel__status-badge--live"
        title="Showing the most recent execution"
      >Latest</span>
    {/if}
  </div>

  {#if pipelineId}
    {#key pipelineId}
      <div class="pipeline-panel__content">
        <PipelineStatus {pipelineId} {workflow} {endpointConfig} runLabel={pipelineId ?? undefined} {refreshTrigger} isEmbedded={true} />
      </div>
    {/key}
  {:else}
    <div class="pipeline-panel__content">
      <App
        {workflow}
        height="100%"
        width="100%"
        showNavbar={false}
        disableSidebar={true}
        lockWorkflow={true}
        readOnly={true}
        {endpointConfig}
      />
    </div>
  {/if}
</div>

<style>
  .pipeline-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    background-color: var(--fd-muted);
  }

  .pipeline-panel__header {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    padding: 0 var(--fd-space-xl);
    height: var(--fd-playground-header-height);
    min-height: var(--fd-playground-header-height);
    border-bottom: 1px solid var(--fd-border);
    flex-shrink: 0;
  }

  :global(.pipeline-panel__icon) {
    font-size: var(--fd-text-base);
    color: var(--fd-muted-foreground);
    flex-shrink: 0;
  }

  .pipeline-panel__title {
    font-size: var(--fd-text-sm);
    font-weight: 600;
    color: var(--fd-foreground);
    flex: 1;
  }

  .pipeline-panel__status-badge {
    font-size: var(--fd-text-2xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 2px var(--fd-space-xs);
    border-radius: var(--fd-radius-sm);
    flex-shrink: 0;
  }

  .pipeline-panel__status-badge--live {
    background-color: var(--fd-success-muted);
    color: var(--fd-success);
  }

  /* Run picker chip */
  .pipeline-panel__run-chip-wrap {
    position: relative;
    flex-shrink: 0;
  }

  .pipeline-panel__run-chip {
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-3xs);
    padding: 2px var(--fd-space-xs) 2px var(--fd-space-sm);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-md);
    background: var(--fd-background);
    color: var(--fd-foreground);
    font-size: var(--fd-text-xs);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--fd-transition-fast);
    line-height: 1;
  }

  .pipeline-panel__run-chip:hover,
  .pipeline-panel__run-chip--open {
    background-color: var(--fd-muted);
    border-color: var(--fd-border-strong);
  }

  .pipeline-panel__run-chip--pinned {
    background-color: var(--fd-primary-muted);
    border-color: transparent;
    color: var(--fd-primary);
  }

  .pipeline-panel__run-chip--pinned:hover,
  .pipeline-panel__run-chip--pinned.pipeline-panel__run-chip--open {
    border-color: var(--fd-primary);
  }

  :global(.pipeline-panel__run-chip-chevron) {
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-xs);
    flex-shrink: 0;
  }

  /* Run popover */
  .pipeline-panel__run-popover {
    position: absolute;
    top: calc(100% + var(--fd-space-xs));
    right: 0;
    z-index: 50;
    min-width: 160px;
    padding: var(--fd-space-xs);
    background-color: var(--fd-background);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-lg);
    box-shadow: var(--fd-shadow-lg);
  }

  .pipeline-panel__run-popover-item {
    display: flex;
    align-items: center;
    gap: var(--fd-space-sm);
    width: 100%;
    padding: var(--fd-space-sm) var(--fd-space-sm);
    border: none;
    border-radius: var(--fd-radius-sm);
    background: transparent;
    color: var(--fd-foreground);
    font-size: var(--fd-text-sm);
    text-align: left;
    cursor: pointer;
    transition: background-color var(--fd-transition-fast);
  }

  .pipeline-panel__run-popover-item:hover {
    background-color: var(--fd-muted);
  }

  .pipeline-panel__run-popover-item--active {
    font-weight: 500;
  }

  .pipeline-panel__run-id {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--fd-font-mono, monospace);
    font-size: var(--fd-text-xs);
  }

  :global(.pipeline-panel__run-popover-check) {
    color: var(--fd-primary) !important;
    margin-left: auto;
    font-size: var(--fd-text-sm);
  }

  :global(.pipeline-panel__run-status) {
    flex-shrink: 0;
    font-size: var(--fd-text-sm);
  }

  :global(.pipeline-panel__run-status--running) {
    color: var(--fd-warning);
    animation: pp-spin 1s linear infinite;
  }

  :global(.pipeline-panel__run-status--completed) {
    color: var(--fd-success);
  }

  :global(.pipeline-panel__run-status--failed) {
    color: var(--fd-error);
  }

  @keyframes pp-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  /* Latest toggle */
  .pipeline-panel__latest-toggle {
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-3xs);
    padding: var(--fd-space-3xs) var(--fd-space-sm);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-md);
    background: transparent;
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-xs);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--fd-transition-fast);
    line-height: 1;
    flex-shrink: 0;
  }

  .pipeline-panel__latest-toggle :global(svg) {
    font-size: var(--fd-text-xs);
  }

  .pipeline-panel__latest-toggle:hover {
    background-color: var(--fd-muted);
    color: var(--fd-foreground);
    border-color: var(--fd-border-strong);
  }

  .pipeline-panel__latest-toggle--active {
    background-color: var(--fd-primary-muted);
    border-color: var(--fd-primary);
    color: var(--fd-primary);
  }

  .pipeline-panel__content {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

</style>
