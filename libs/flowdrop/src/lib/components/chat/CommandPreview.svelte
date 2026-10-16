<script lang="ts">
  import type { CommandPreviewItem } from '../../types/chat.js';
  import Icon from '@iconify/svelte';
  import Button from '../primitives/Button.svelte';
  import { m } from '$lib/messages/index.js';

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

  // Hoist the commandPreview branch — six template reads.
  const t = $derived(m().chat.commandPreview);
</script>

<div
  class="command-preview"
  class:command-preview--resolved={resolvedAction !== null}
  role="region"
  aria-label={t.ariaLabel}
>
  <div class="command-preview__list">
    <!-- Fixed positional batch (raw strings may repeat) — index is the identity -->
    {#each commands as command, i (i)}
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
          {:else if command.status === 'skipped'}
            <Icon icon="mdi:debug-step-over" />
          {/if}
        </span>
        <pre class="command-preview__command">{command.raw}</pre>
        {#if (command.status === 'error' || command.status === 'skipped') && command.result}
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
          {t.applying}
        {:else}
          <Icon icon="mdi:check-all" />
          {t.applied}
        {/if}
      </span>
    {:else if resolvedAction === 'cancelled'}
      <span class="command-preview__resolved command-preview__resolved--cancelled">
        <Icon icon="mdi:close" />
        {t.dismissed}
      </span>
    {:else}
      <Button variant="secondary" onclick={handleCancel} disabled={isExecuting}>
        {t.cancel}
      </Button>
      <Button variant="primary" onclick={handleApprove} disabled={!hasPending || isExecuting}>
        {#snippet leadingIcon()}<Icon icon="mdi:check-all" />{/snippet}
        {t.applyAll}
      </Button>
    {/if}
  </div>
</div>

<style>
  /* The same card as an interrupt in the Playground (`--fd-interrupt-card-*`), so a person
     is asked the same way in both places. Answered, it drops its frame. */
  .command-preview {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-xs);
    padding: var(--fd-interrupt-card-pad, var(--fd-space-xs));
    border: 1px solid var(--fd-interrupt-card-border, var(--fd-border));
    border-radius: var(--fd-interrupt-card-radius, var(--fd-radius-md));
    background: var(--fd-interrupt-card-bg, var(--fd-card));
    box-shadow: var(--fd-interrupt-card-shadow, none);
  }

  .command-preview--resolved {
    padding: 0;
    border-color: transparent;
    background: transparent;
  }

  .command-preview__list {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-3xs);
  }

  .command-preview__item {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: var(--fd-space-2xs);
    padding: var(--fd-space-3xs) 0;
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

  /* Skipped isn't a failure — mute it instead of colouring it like an error. */
  .command-preview__item--skipped .command-preview__status,
  .command-preview__item--skipped .command-preview__command,
  .command-preview__item--skipped .command-preview__error {
    color: var(--fd-muted-foreground);
  }

  .command-preview__error {
    display: block;
    flex-basis: 100%;
    padding-inline-start: 1.25rem;
    font-size: var(--fd-text-xs);
    color: var(--fd-error);
    margin-top: var(--fd-space-3xs);
  }

  /* Cancel, then Apply, on the right. */
  .command-preview__actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--fd-space-xs);
  }

  .command-preview__resolved {
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-3xs);
    font-size: var(--fd-text-meta);
  }

  .command-preview--resolved .command-preview__actions {
    justify-content: flex-start;
  }

  .command-preview__resolved--applied {
    color: var(--fd-muted-foreground);
  }

  .command-preview__resolved--applied :global(svg) {
    color: var(--fd-success);
  }

  .command-preview__resolved--applied :global(svg.iconify[data-icon='mdi:loading']) {
    animation: spin 1s linear infinite;
  }

  .command-preview__resolved--cancelled {
    color: var(--fd-muted-foreground);
  }
</style>
