<script lang="ts">
  import type { CommandPreviewItem } from '../../types/chat.js';
  import Icon from '@iconify/svelte';

  interface Props {
    commands: CommandPreviewItem[];
    onApprove: () => void;
    onCancel: () => void;
  }

  let { commands, onApprove, onCancel }: Props = $props();

  const hasPending = $derived(commands.some((c) => c.status === 'pending'));
  const isExecuting = $derived(commands.some((c) => c.status === 'executing'));

  let resolvedAction: 'applied' | 'cancelled' | null = $state(null);

  function handleApprove() {
    resolvedAction = 'applied';
    onApprove();
  }

  function handleCancel() {
    resolvedAction = 'cancelled';
    onCancel();
  }
</script>

<div class="command-preview" role="region" aria-label="Command preview">
  <div class="command-preview__list">
    {#each commands as command, i}
      <div class="command-preview__item command-preview__item--{command.status}">
        <span class="command-preview__status">
          {#if command.status === 'pending'}
            <Icon icon="mdi:chevron-right" />
          {:else if command.status === 'executing'}
            <Icon icon="mdi:loading" />
          {:else if command.status === 'success'}
            <Icon icon="mdi:check-circle" />
          {:else if command.status === 'error'}
            <Icon icon="mdi:alert-circle" />
          {/if}
        </span>
        <pre class="command-preview__command">{command.raw}</pre>
        {#if command.status === 'error' && command.result}
          <span class="command-preview__error">{command.result}</span>
        {/if}
      </div>
    {/each}
  </div>

  <div class="command-preview__actions">
    {#if resolvedAction === 'applied'}
      <span class="command-preview__resolved command-preview__resolved--applied">
        {#if isExecuting}
          <Icon icon="mdi:loading" />
          Applying…
        {:else}
          <Icon icon="mdi:check-all" />
          Applied
        {/if}
      </span>
    {:else if resolvedAction === 'cancelled'}
      <span class="command-preview__resolved command-preview__resolved--cancelled">
        <Icon icon="mdi:close" />
        Dismissed
      </span>
    {:else}
      <button
        class="command-preview__btn command-preview__btn--approve"
        onclick={handleApprove}
        disabled={!hasPending || isExecuting}
      >
        <Icon icon="mdi:check-all" />
        Apply All
      </button>
      <button
        class="command-preview__btn command-preview__btn--cancel"
        onclick={handleCancel}
        disabled={isExecuting}
      >
        Cancel
      </button>
    {/if}
  </div>
</div>

<style>
  .command-preview {
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-md);
    background: var(--fd-card);
    overflow: hidden;
  }

  .command-preview__list {
    display: flex;
    flex-direction: column;
    padding: var(--fd-space-xs);
    gap: var(--fd-space-3xs);
  }

  .command-preview__item {
    display: flex;
    align-items: flex-start;
    gap: var(--fd-space-2xs);
    padding: var(--fd-space-3xs) var(--fd-space-xs);
    border-radius: var(--fd-radius-sm);
  }

  .command-preview__status {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    font-size: var(--fd-text-xs);
    /* align icon with the first line of the pre block */
    margin-top: 1px;
    line-height: 1.5;
  }

  .command-preview__item--pending .command-preview__status {
    color: var(--fd-muted-foreground);
  }

  .command-preview__item--executing .command-preview__status {
    color: var(--fd-info);
    animation: spin 1s linear infinite;
  }

  .command-preview__item--success .command-preview__status {
    color: var(--fd-success);
  }

  .command-preview__item--error .command-preview__status {
    color: var(--fd-error);
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .command-preview__command {
    font-family: var(--fd-font-mono);
    font-size: var(--fd-text-xs);
    line-height: 1.5;
    color: var(--fd-foreground);
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
  }

  .command-preview__item--error .command-preview__command {
    color: var(--fd-error);
  }

  .command-preview__error {
    display: block;
    font-size: var(--fd-text-xs);
    color: var(--fd-error);
    margin-top: var(--fd-space-3xs);
  }

  .command-preview__actions {
    display: flex;
    gap: var(--fd-space-xs);
    padding: var(--fd-space-xs);
    border-top: 1px solid var(--fd-border);
    background: var(--fd-muted);
  }

  .command-preview__btn {
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-3xs);
    padding: var(--fd-space-3xs) var(--fd-space-sm);
    border: none;
    border-radius: var(--fd-radius-sm);
    font-size: var(--fd-text-xs);
    font-weight: 600;
    cursor: pointer;
    transition:
      background-color var(--fd-transition-fast),
      color var(--fd-transition-fast);
  }

  .command-preview__btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .command-preview__btn--approve {
    background: var(--fd-primary);
    color: var(--fd-primary-foreground);
  }

  .command-preview__btn--approve:hover:not(:disabled) {
    background: var(--fd-primary-hover);
  }

  .command-preview__btn--cancel {
    background: var(--fd-secondary);
    color: var(--fd-secondary-foreground);
  }

  .command-preview__btn--cancel:hover:not(:disabled) {
    background: var(--fd-secondary-hover);
  }

  .command-preview__resolved {
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-3xs);
    font-size: var(--fd-text-xs);
    font-weight: 600;
    padding: var(--fd-space-3xs) var(--fd-space-xs);
  }

  .command-preview__resolved--applied {
    color: var(--fd-success);
  }

  .command-preview__resolved--applied :global(svg.iconify[data-icon='mdi:loading']) {
    animation: spin 1s linear infinite;
  }

  .command-preview__resolved--cancelled {
    color: var(--fd-muted-foreground);
  }
</style>
