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
  }

  let { pipelineId, workflow, endpointConfig, isPinned }: Props = $props();
</script>

<div class="pipeline-panel">
  <div class="pipeline-panel__header">
    <Icon icon="mdi:graph" class="pipeline-panel__icon" />
    <span class="pipeline-panel__title">Pipeline</span>
    {#if pipelineId}
      {#if isPinned}
        <span class="pipeline-panel__status-badge pipeline-panel__status-badge--pinned">pinned</span>
      {:else}
        <span class="pipeline-panel__status-badge pipeline-panel__status-badge--live">live</span>
      {/if}
    {/if}
  </div>

  {#if pipelineId}
    {#key pipelineId}
      <div class="pipeline-panel__content">
        <PipelineStatus {pipelineId} {workflow} {endpointConfig} />
      </div>
    {/key}
  {:else}
    <div class="pipeline-panel__empty">
      <Icon icon="mdi:graph-outline" class="pipeline-panel__empty-icon" />
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
    gap: 0.5rem;
    padding: 0 1rem;
    height: 40px;
    min-height: 40px;
    border-bottom: 1px solid var(--fd-border);
    flex-shrink: 0;
  }

  :global(.pipeline-panel__icon) {
    font-size: 1rem;
    color: var(--fd-muted);
    flex-shrink: 0;
  }

  .pipeline-panel__title {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--fd-foreground);
    flex: 1;
  }

  .pipeline-panel__status-badge {
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.1rem 0.4rem;
    border-radius: 0.25rem;
    flex-shrink: 0;
  }

  .pipeline-panel__status-badge--live {
    background-color: rgba(34, 197, 94, 0.15);
    color: #22c55e;
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
    gap: 0.75rem;
    color: var(--fd-muted);
    padding: 2rem;
    text-align: center;
  }

  :global(.pipeline-panel__empty-icon) {
    font-size: 3rem;
    opacity: 0.4;
  }

  .pipeline-panel__empty-text {
    font-size: 0.875rem;
    margin: 0;
    max-width: 200px;
    line-height: 1.5;
  }
</style>
