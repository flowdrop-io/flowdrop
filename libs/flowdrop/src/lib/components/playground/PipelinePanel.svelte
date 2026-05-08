<script lang="ts">
  import PipelineStatus from '$lib/components/PipelineStatus.svelte';
  import Icon from '@iconify/svelte';
  import type { Workflow } from '$lib/types/index.js';
  import type { EndpointConfig } from '$lib/config/endpoints.js';

  interface Props {
    pipelineId: string | null;
    workflow: Workflow;
    endpointConfig: EndpointConfig;
    isPinned: boolean;
    runLabel?: string;
  }

  let { pipelineId, workflow, endpointConfig, isPinned, runLabel }: Props = $props();
</script>

<div class="pipeline-panel">
  <div class="pipeline-panel__header">
    <Icon icon="mdi:source-branch" class="pipeline-panel__icon" />
    <span class="pipeline-panel__title">Pipeline</span>
    {#if pipelineId}
      {#if isPinned}
        <span
          class="pipeline-panel__status-badge pipeline-panel__status-badge--pinned"
          title="Viewing a past run — click the latest run to return to live view"
        >{runLabel ?? 'Run'}</span>
      {:else}
        <span
          class="pipeline-panel__status-badge pipeline-panel__status-badge--live"
          title="Showing the most recent execution"
        >Latest</span>
      {/if}
    {/if}
  </div>

  {#if pipelineId}
    {#key pipelineId}
      <div class="pipeline-panel__content">
        <PipelineStatus {pipelineId} {workflow} {endpointConfig} {runLabel} isEmbedded={true} />
      </div>
    {/key}
  {:else}
    <div class="pipeline-panel__empty">
      <Icon icon="mdi:source-branch" class="pipeline-panel__empty-icon" />
      <p class="pipeline-panel__empty-text">Run the workflow to see the pipeline.</p>
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
    background-color: var(--fd-background);
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

  .pipeline-panel__status-badge--pinned {
    background-color: var(--fd-primary-muted);
    color: var(--fd-primary);
  }

  .pipeline-panel__content {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .pipeline-panel__empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--fd-space-md);
    color: var(--fd-muted-foreground);
    padding: var(--fd-space-4xl);
    text-align: center;
  }

  :global(.pipeline-panel__empty-icon) {
    font-size: var(--fd-space-6xl);
    opacity: 0.4;
  }

  .pipeline-panel__empty-text {
    font-size: var(--fd-text-sm);
    margin: 0;
    max-width: 200px;
    line-height: var(--fd-leading-relaxed);
  }
</style>
