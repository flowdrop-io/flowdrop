<!--
  StepsSummary — one row for the steps of a turn.

  "4 steps · 46 ms · 1 waiting ▸" opens a compact list (status dot · node · runs ·
  time). A failed step's error stays visible under the row, folded or not,
  because that is what people look for. Nested (sub-workflow) steps are indented
  in the node column; their full path is the cell's title. The origin chip and
  the per-node breadcrumb rows of the old log rows are gone: the Playground is
  where the reader already is, and the table says which node it was.

  @internal Used by MessageStream.
-->

<script lang="ts">
  import Icon from '@iconify/svelte';
  import Button from '../primitives/Button.svelte';
  import { m } from '$lib/messages/index.js';
  import { formatStepDuration } from '../../utils/duration.js';
  import type { StepsSummary } from './stepSummary.js';

  interface Props {
    summary: StepsSummary;
    expanded: boolean;
    onToggle: () => void;
    /** Used to tie the toggle to the table it opens. */
    id: string;
  }

  let { summary, expanded, onToggle, id }: Props = $props();

  const t = $derived(m().playground.steps);
  const duration = $derived(formatStepDuration(summary.durationMs));
  const tableId = $derived(`${id}-table`);
  const parts = $derived(
    [
      t.summary({ count: summary.total }),
      duration,
      summary.failed > 0 ? t.failed({ count: summary.failed }) : null,
      summary.waiting > 0 ? t.waiting({ count: summary.waiting }) : null
    ].filter((part): part is string => part !== null)
  );
</script>

<div
  class="steps-summary"
  data-testid="steps-summary"
  data-status={summary.worst ?? 'none'}
  data-expanded={expanded}
>
  <Button
    variant="ghost"
    size="sm"
    class="steps-summary__toggle"
    aria-expanded={expanded}
    aria-controls={tableId}
    data-testid="steps-summary-toggle"
    onclick={onToggle}
  >
    {#snippet leadingIcon()}
      <span class="steps-summary__dot" aria-hidden="true"></span>
    {/snippet}
    <span class="steps-summary__text">{parts.join(' · ')}</span>
    {#snippet trailingIcon()}
      <Icon icon="mdi:chevron-right" class="steps-summary__chevron" />
    {/snippet}
  </Button>

  {#if summary.errors.length > 0}
    <ul class="steps-summary__errors" data-testid="steps-summary-errors">
      {#each summary.errors as error (error.key)}
        <li class="steps-summary__error">
          <Icon icon="mdi:alert-circle" class="steps-summary__error-icon" />
          <span class="steps-summary__error-text">
            <strong>{error.label}</strong>{error.message ? `: ${error.message}` : ''}
          </span>
        </li>
      {/each}
    </ul>
  {/if}

  {#if expanded}
    <div class="steps-summary__table-wrap">
      <table id={tableId} class="steps-summary__table" aria-label={t.tableLabel}>
        <thead class="steps-summary__sr">
          <tr>
            <th scope="col">{t.columnNode}</th>
            <th scope="col">{t.columnStatus}</th>
            <th scope="col">{t.columnCount}</th>
            <th scope="col">{t.columnDuration}</th>
          </tr>
        </thead>
        <tbody>
          {#each summary.rows as row (row.key)}
            {@const rowDuration = formatStepDuration(row.durationMs)}
            <tr data-status={row.status ?? 'none'} data-nested={row.depth > 0}>
              <td class="steps-summary__node">
                <span class="steps-summary__row-dot" aria-hidden="true"></span>
                <span
                  class="steps-summary__node-label"
                  style="padding-inline-start: calc({row.depth} * var(--fd-space-md))"
                  title={[...row.path, row.label].join(' › ')}
                >
                  {row.label}
                  {#if row.detail}<span class="steps-summary__detail">{row.detail}</span>{/if}
                </span>
                {#if row.status}<span class="steps-summary__sr">{t.status[row.status]}</span>{/if}
              </td>
              <td class="steps-summary__num steps-summary__runs">
                {#if row.count > 1}
                  <span title={t.repeated({ count: row.count })}>×{row.count}</span>
                {/if}
              </td>
              <td class="steps-summary__num steps-summary__time">
                {rowDuration ??
                  (row.status && row.status !== 'completed'
                    ? t.status[row.status].toLowerCase()
                    : '—')}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .steps-summary {
    --_status: var(--fd-muted-foreground);

    margin: var(--fd-space-3xs) 0;
    padding-inline: var(--fd-msg-gutter, var(--fd-space-xl));
    min-width: 0;
  }

  .steps-summary[data-status='completed'],
  .steps-summary tr[data-status='completed'] {
    --_status: var(--fd-status-completed);
  }
  .steps-summary[data-status='running'],
  .steps-summary tr[data-status='running'] {
    --_status: var(--fd-status-running);
  }
  .steps-summary[data-status='waiting'],
  .steps-summary tr[data-status='waiting'] {
    --_status: var(--fd-status-waiting);
  }
  .steps-summary[data-status='failed'],
  .steps-summary tr[data-status='failed'] {
    --_status: var(--fd-status-failed);
  }

  /* Folded row: dot, the sentence, a chevron on the right. 28 px, a fill on hover. */
  .steps-summary :global(.steps-summary__toggle) {
    width: 100%;
    max-width: 100%;
    height: var(--fd-control-md);
    justify-content: flex-start;
    gap: var(--fd-space-xs);
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-meta);
    font-variant-numeric: tabular-nums;
    border-radius: var(--fd-control-radius);
  }

  .steps-summary :global(.steps-summary__toggle:hover:not(:disabled)),
  .steps-summary[data-expanded='true'] :global(.steps-summary__toggle) {
    background: var(--fd-subtle);
  }

  .steps-summary__dot,
  .steps-summary__row-dot {
    flex-shrink: 0;
    width: 7px;
    height: 7px;
    border-radius: var(--fd-radius-full);
    background: var(--_status);
  }

  .steps-summary__text {
    white-space: nowrap;
  }

  .steps-summary :global(.steps-summary__chevron) {
    margin-inline-start: auto;
    transition: transform var(--fd-transition-fast);
  }

  .steps-summary[data-expanded='true'] :global(.steps-summary__chevron) {
    transform: rotate(90deg);
  }

  /* A failure stays on the page while the table is folded. */
  .steps-summary__errors {
    list-style: none;
    margin: var(--fd-space-3xs) 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-3xs);
  }

  .steps-summary__error {
    display: flex;
    align-items: flex-start;
    gap: var(--fd-space-2xs);
    padding: var(--fd-space-2xs) var(--fd-space-xs);
    border-radius: var(--fd-radius-md);
    background: var(--fd-status-failed-soft);
    color: var(--fd-status-failed);
    font-size: var(--fd-text-xs);
    line-height: var(--fd-leading-normal);
  }

  :global(.steps-summary__error-icon) {
    flex-shrink: 0;
    margin-top: 0.125em;
  }

  .steps-summary__error-text {
    min-width: 0;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }

  /* Expanded: one bordered list of 28 px rows, no header row, no chips. */
  .steps-summary__table-wrap {
    margin-top: var(--fd-space-2xs);
    overflow-x: auto;
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-surface);
  }

  .steps-summary__table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--fd-text-meta);
    color: var(--fd-foreground);
  }

  .steps-summary__table td {
    height: var(--fd-control-md);
    padding: 0 var(--fd-space-md);
    text-align: start;
    vertical-align: middle;
    white-space: nowrap;
  }

  .steps-summary__table tbody tr + tr td {
    border-top: 1px solid var(--fd-border-muted);
  }

  .steps-summary__table tr[data-nested='true'] .steps-summary__node-label {
    color: var(--fd-muted-foreground);
  }

  .steps-summary__sr {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
  }

  .steps-summary__num {
    text-align: end !important;
    font-variant-numeric: tabular-nums;
  }

  .steps-summary__runs {
    color: var(--fd-muted-foreground);
  }

  .steps-summary__time {
    font-family: var(--fd-font-mono);
    font-size: var(--fd-text-2xs);
    color: var(--fd-muted-foreground);
  }

  /* max-width 0 + width 100%: the node column takes what the others leave and
     truncates, so the table never outgrows a narrow dock. */
  .steps-summary__node {
    max-width: 0;
    width: 100%;
  }

  .steps-summary__node > * {
    vertical-align: middle;
  }

  .steps-summary__row-dot {
    display: inline-block;
    margin-inline-end: var(--fd-space-xs);
  }

  .steps-summary__node-label {
    display: inline-block;
    max-width: calc(100% - 15px);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .steps-summary__detail {
    margin-inline-start: var(--fd-space-xs);
    color: var(--fd-muted-foreground);
  }
</style>
