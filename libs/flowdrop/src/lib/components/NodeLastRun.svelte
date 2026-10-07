<!--
  NodeLastRun — the inspector's Last run tab for one node.

  What the node did in the run being shown, from its execution info
  (`fd.playground.nodeStatusFor`): status, duration, timestamps, tokens when
  the output reports them, and input, output and error. Long payloads are cut
  to a few lines with a Show all toggle. This is the one home of a node's
  duration and tokens; the canvas badge shows status only.

  `slot` below the facts is where later steps add actions (for example "Ask the
  Assistant about this run").
-->

<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { NodeExecutionInfo } from '../types/index.js';
  import { describeLastRun } from '../utils/lastRun.js';
  import { getMessages } from '../messages/context.js';
  import { formatTimestamp } from './playground/messageDisplay.js';

  interface Props {
    /** The node's execution info for the shown run; undefined when it has none. */
    info?: NodeExecutionInfo;
    /** Whether there is a run being shown at all. */
    runShown?: boolean;
    /** Extra content under the facts (actions on the run). */
    actions?: Snippet;
  }

  let { info, runShown = true, actions }: Props = $props();

  const getMsgs = getMessages();
  const msgs = $derived(getMsgs().nodeInspector);

  const view = $derived(describeLastRun(info));
  const emptyText = $derived(
    !runShown
      ? msgs.noRunShown
      : info?.status === 'running'
        ? msgs.running
        : info?.status === 'interrupted'
          ? msgs.waiting
          : msgs.notRun
  );

  /** Lines shown before a payload is cut. */
  const CUT_LINES = 8;
  const CUT_CHARS = 600;
  let expanded = $state<Record<string, boolean>>({});

  function cut(text: string): { text: string; cut: boolean } {
    const lines = text.split('\n');
    if (lines.length <= CUT_LINES && text.length <= CUT_CHARS) return { text, cut: false };
    return { text: lines.slice(0, CUT_LINES).join('\n').slice(0, CUT_CHARS), cut: true };
  }
</script>

<div class="node-last-run" data-testid="node-last-run">
  {#if !view}
    <p class="node-last-run__empty" data-testid="node-last-run-empty">{emptyText}</p>
  {:else}
    <dl class="node-last-run__facts">
      <dt>{msgs.status}</dt>
      <dd data-testid="node-last-run-status" data-status={view.status}>
        {msgs.statuses[view.status]}
      </dd>
      {#if view.durationLabel}
        <dt>{msgs.duration}</dt>
        <dd data-testid="node-last-run-duration">{view.durationLabel}</dd>
      {/if}
      {#if view.started}
        <dt>{msgs.started}</dt>
        <dd><time datetime={view.started}>{formatTimestamp(view.started)}</time></dd>
      {/if}
      {#if view.completed}
        <dt>{msgs.finished}</dt>
        <dd><time datetime={view.completed}>{formatTimestamp(view.completed)}</time></dd>
      {/if}
      {#if view.tokens !== null}
        <dt>{msgs.tokens}</dt>
        <dd data-testid="node-last-run-tokens">{view.tokens.toLocaleString('en')}</dd>
      {/if}
    </dl>

    {#if view.executions > 1}
      <p class="node-last-run__note">{msgs.executions({ n: view.executions })}</p>
    {/if}

    {#each [{ key: 'input', label: msgs.input, text: view.input }, { key: 'output', label: msgs.output, text: view.output }] as block (block.key)}
      {#if block.text}
        {@const shown = expanded[block.key] ? { text: block.text, cut: true } : cut(block.text)}
        <section class="node-last-run__block" data-testid="node-last-run-{block.key}">
          <h4 class="node-last-run__cap">{block.label}</h4>
          <pre class="node-last-run__pre">{shown.text}{shown.cut && !expanded[block.key]
              ? '…'
              : ''}</pre>
          {#if shown.cut}
            <button
              type="button"
              class="node-last-run__toggle"
              aria-expanded={!!expanded[block.key]}
              onclick={() => (expanded[block.key] = !expanded[block.key])}
            >
              {expanded[block.key] ? msgs.collapse : msgs.expand}
            </button>
          {/if}
        </section>
      {/if}
    {/each}

    {#if view.error}
      {@const errText = expanded.error ? view.error : cut(view.error).text}
      <section
        class="node-last-run__block node-last-run__block--error"
        data-testid="node-last-run-error"
      >
        <h4 class="node-last-run__cap">{msgs.error}</h4>
        <pre class="node-last-run__pre">{errText}{!expanded.error && cut(view.error).cut
            ? '…'
            : ''}</pre>
        {#if cut(view.error).cut}
          <button
            type="button"
            class="node-last-run__toggle"
            aria-expanded={!!expanded.error}
            onclick={() => (expanded.error = !expanded.error)}
          >
            {expanded.error ? msgs.collapse : msgs.expand}
          </button>
        {/if}
      </section>
    {/if}
  {/if}

  {#if actions}
    <div class="node-last-run__actions">{@render actions()}</div>
  {/if}
</div>

<style>
  .node-last-run {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-md);
    font-size: var(--fd-text-sm);
    min-width: 0;
  }

  .node-last-run__empty,
  .node-last-run__note {
    margin: 0;
    color: var(--fd-muted-foreground);
  }

  .node-last-run__facts {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    gap: var(--fd-space-2xs, 2px) var(--fd-space-md);
    margin: 0;
  }

  .node-last-run__facts dt {
    color: var(--fd-muted-foreground);
  }

  .node-last-run__facts dd {
    margin: 0;
    font-variant-numeric: tabular-nums;
  }

  .node-last-run__block {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-2xs, 2px);
    min-width: 0;
  }

  .node-last-run__cap {
    margin: 0;
    font-size: var(--fd-text-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--fd-muted-foreground);
  }

  .node-last-run__pre {
    margin: 0;
    padding: var(--fd-space-sm);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-md);
    background: var(--fd-muted);
    font-family: var(--fd-font-mono, ui-monospace, monospace);
    font-size: var(--fd-text-xs);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .node-last-run__block--error .node-last-run__pre {
    border-color: var(--fd-error, #ef4444);
    color: var(--fd-error, #ef4444);
  }

  .node-last-run__toggle {
    align-self: flex-start;
    padding: 0;
    border: 0;
    background: none;
    color: var(--fd-primary);
    font-size: var(--fd-text-xs);
    text-decoration: underline;
    cursor: pointer;
  }
</style>
