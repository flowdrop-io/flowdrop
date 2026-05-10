<script lang="ts">
  import Icon from '@iconify/svelte';
  import type { PlaygroundExecution } from '$lib/types/playground.js';

  interface Props {
    executions: PlaygroundExecution[];
    activeExecutionId: string | null;
    latestExecutionId: string | null;
    onSelect: (executionId: string) => void;
  }

  let { executions, activeExecutionId, latestExecutionId, onSelect }: Props = $props();

  function statusIcon(status: PlaygroundExecution['status']): string {
    if (status === 'completed') return 'mdi:check-circle';
    if (status === 'failed') return 'mdi:alert-circle';
    return '';
  }
</script>

<div class="execution-list">
  {#each executions as execution (execution.id)}
    <div
      class="execution-list__item"
      class:execution-list__item--active={execution.id === activeExecutionId}
      class:execution-list__item--running={execution.status === 'running'}
      class:execution-list__item--completed={execution.status === 'completed'}
      class:execution-list__item--failed={execution.status === 'failed'}
      role="button"
      tabindex="0"
      onclick={() => onSelect(execution.id)}
      onkeydown={(e) => e.key === 'Enter' && onSelect(execution.id)}
    >
      {#if execution.status === 'running'}
        <span class="execution-list__running-dot" aria-hidden="true"></span>
      {:else if statusIcon(execution.status)}
        <Icon
          icon={statusIcon(execution.status)}
          class="execution-list__status-icon execution-list__status-icon--{execution.status}"
        />
      {/if}
      <span class="execution-list__label">{execution.id}</span>
      {#if execution.id === latestExecutionId}
        <span class="execution-list__badge">latest</span>
      {/if}
    </div>
  {/each}
</div>

<style>
  /* Match the visual weight of .playground__session items */
  .execution-list {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-3xs);
    padding: 0 var(--fd-space-sm);
  }

  .execution-list__item {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    padding: var(--fd-space-sm) var(--fd-space-md);
    border-radius: var(--fd-radius-md);
    border-left: 3px solid transparent;
    cursor: pointer;
    font-size: var(--fd-text-sm);
    color: var(--fd-foreground);
    transition:
      background-color var(--fd-transition-fast),
      border-left-color var(--fd-transition-fast);
    user-select: none;
  }

  .execution-list__item:hover {
    background-color: var(--fd-muted);
    border-left-color: var(--fd-border);
  }

  .execution-list__item--active {
    background-color: var(--fd-primary-muted);
    border-left-color: var(--fd-primary);
  }

  .execution-list__item--active:hover {
    background-color: var(--fd-primary-muted);
    border-left-color: var(--fd-primary);
  }

  .execution-list__label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .execution-list__item--active .execution-list__label {
    color: var(--fd-primary);
    font-weight: 500;
  }

  .execution-list__badge {
    font-size: var(--fd-text-2xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--fd-success);
    flex-shrink: 0;
  }

  .execution-list__running-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: var(--fd-success);
    flex-shrink: 0;
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  :global(.execution-list__status-icon) {
    flex-shrink: 0;
    font-size: var(--fd-text-sm);
  }

  :global(.execution-list__status-icon--completed) {
    color: var(--fd-success, #22c55e);
  }

  :global(.execution-list__status-icon--failed) {
    color: var(--fd-error, #ef4444);
  }
</style>
