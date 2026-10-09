<!--
  ActivityList — the rows of one assistant turn.

  Open while the turn runs; once it is done they fold into one line,
  "✓ Used 4 tools · 1.6 s ›", that opens to the rows again.
-->
<script lang="ts">
  import Icon from '@iconify/svelte';
  import ActivityRow from './ActivityRow.svelte';
  import {
    formatActivityDuration,
    rowDuration,
    summarizeActivity,
    type ActivityRow as Row
  } from '../../chat/activity.js';
  import { m } from '$lib/messages/index.js';

  interface Props {
    rows: Row[];
    /** The turn is still running: rows stay open. */
    live: boolean;
    /** How long the whole turn took, for the fold. Absent: the sum of the rows' own times. */
    elapsedMs?: number;
  }

  let { rows, live, elapsedMs }: Props = $props();

  const t = $derived(m().chat.tools);
  const summary = $derived(summarizeActivity(rows));
  const hasTools = $derived(summary.tools > 0);
  const text = $derived(
    t.used({
      count: summary.tools,
      problems: summary.problems,
      duration:
        (elapsedMs ?? summary.totalMs) >= 100
          ? formatActivityDuration(elapsedMs ?? summary.totalMs)
          : ''
    })
  );
</script>

{#snippet list()}
  <ul class="activity-list" aria-label={t.rounds({ count: summary.tools })}>
    {#each rows as row, i (i)}
      <li>
        <ActivityRow
          status={row.status}
          label={row.verb}
          detail={row.detail}
          duration={rowDuration(row.ms)}
        />
      </li>
    {/each}
  </ul>
{/snippet}

{#if live || !hasTools}
  {@render list()}
{:else}
  <details class="activity-fold" data-testid="assistant-activity-fold">
    <summary class="activity-fold__summary">
      {#if summary.problems > 0}
        <Icon icon="mdi:alert-circle-outline" class="activity-fold__bad" />
      {:else}
        <Icon icon="mdi:check" class="activity-fold__ok" />
      {/if}
      <span>{text}</span>
      <Icon icon="mdi:chevron-right" class="activity-fold__chevron" />
    </summary>
    {@render list()}
  </details>
{/if}

<style>
  .activity-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--fd-activity-row-gap, 2px);
  }

  .activity-fold__summary {
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-xs);
    padding: 1px 0;
    font-size: var(--fd-activity-text, var(--fd-text-meta));
    color: var(--fd-muted-foreground);
    cursor: pointer;
    list-style: none;
    border-radius: var(--fd-radius-xs);
  }

  .activity-fold__summary::-webkit-details-marker {
    display: none;
  }

  .activity-fold__summary:hover {
    color: var(--fd-foreground);
  }

  .activity-fold__summary :global(.activity-fold__ok) {
    color: var(--fd-success, var(--fd-primary));
  }

  .activity-fold__summary :global(.activity-fold__bad) {
    color: var(--fd-error);
  }

  .activity-fold__summary :global(.activity-fold__chevron) {
    transition: transform var(--fd-transition-fast);
  }

  .activity-fold[open] .activity-fold__summary :global(.activity-fold__chevron) {
    transform: rotate(90deg);
  }

  .activity-fold[open] > .activity-list {
    margin-top: var(--fd-space-3xs);
  }

  @media (prefers-reduced-motion: reduce) {
    .activity-fold__summary :global(.activity-fold__chevron) {
      transition: none;
    }
  }
</style>
