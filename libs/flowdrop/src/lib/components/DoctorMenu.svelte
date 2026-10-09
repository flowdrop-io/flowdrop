<!--
  DoctorMenu — the Problems indicator of the navbar: "⚠ 2 problems", quiet
  (not drawn) when the draft has none, opening a popover that lists them.

  A row is a severity dot, the node's name (a link that selects the node on the
  canvas) over the server's message, and the remedies the server offered as
  buttons. A remedy applies as one undoable edit (`fd.doctor.applyRemedy`). A
  remedy that removes something asks first, inline, in the row; one that needs a
  choice (which node type to use) shows the choice in the row.

  Drawn only while the backend offers a Doctor and there is something to show.
  Remedies are offered only when the editor can edit.
-->

<script lang="ts">
  import { untrack } from 'svelte';
  import { on } from 'svelte/events';
  import Icon from '@iconify/svelte';
  import { getInstance } from '../stores/getInstance.svelte.js';
  import { getMessages } from '../messages/context.js';
  import type { DoctorProblem, DoctorRemedy, DoctorSeverity } from '../types/doctor.js';
  import Button from './primitives/Button.svelte';
  import Notice from './primitives/Notice.svelte';
  import Select from './primitives/Select.svelte';

  interface Props {
    /** The editor can change the workflow (not read-only or locked): remedies are offered. */
    canApply?: boolean;
  }

  let { canApply = true }: Props = $props();

  const fd = getInstance();
  const getMsgs = getMessages();
  const msgs = $derived(getMsgs().doctor);

  const problems = $derived(fd.doctor.problems);
  const visible = $derived(fd.doctor.supported && problems.length > 0);
  const worst = $derived<DoctorSeverity>(
    problems.some((p) => p.severity === 'error')
      ? 'error'
      : problems.some((p) => p.severity === 'warning')
        ? 'warning'
        : 'info'
  );

  let open = $state(false);
  let rootEl = $state<HTMLElement | null>(null);
  /** The remedy waiting for a yes (destructive) or for its choice. */
  let pending = $state<{ problemId: string; remedyId: string; choice: string } | null>(null);
  const popoverId = `fd-doctor-${Math.random().toString(36).slice(2, 8)}`;

  const ICONS: Record<DoctorSeverity, string> = {
    error: 'heroicons:exclamation-circle',
    warning: 'heroicons:exclamation-triangle',
    info: 'heroicons:information-circle'
  };

  function close(returnFocus = true): void {
    if (!open) return;
    open = false;
    pending = null;
    fd.doctor.dismissNotice();
    if (returnFocus) rootEl?.querySelector<HTMLElement>('.fd-doctor__trigger')?.focus();
  }

  // The last problem was fixed: nothing left to show.
  $effect(() => {
    if (!visible && untrack(() => open)) close(false);
  });

  // Outside pointer closes.
  $effect(() => {
    if (!open) return;
    return on(
      document,
      'pointerdown',
      (event) => {
        if (rootEl && !rootEl.contains(event.target as Node)) close(false);
      },
      { capture: true }
    );
  });

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  }

  function nodeName(problem: DoctorProblem): string | null {
    if (!problem.node) return null;
    const node = fd.workflow.nodes.find((n) => n.id === problem.node);
    return node?.data?.label || problem.node;
  }

  function choicesOf(remedy: DoctorRemedy) {
    const choices = remedy.params?.choices;
    return choices ? Object.entries(choices).map(([value, label]) => ({ value, label })) : null;
  }

  /** The remedy's button was pressed: apply, or open the row's confirm or choice first. */
  function choose(problem: DoctorProblem, remedy: DoctorRemedy): void {
    fd.doctor.dismissNotice();
    if (choicesOf(remedy) || remedy.destructive) {
      pending = { problemId: problem.id, remedyId: remedy.id, choice: '' };
      return;
    }
    void run(problem, remedy);
  }

  async function run(problem: DoctorProblem, remedy: DoctorRemedy, choice?: string): Promise<void> {
    pending = null;
    const choices = choicesOf(remedy);
    const params = choices && choice ? { node_type_id: choice } : undefined;
    await fd.doctor.applyRemedy(problem, remedy, params);
  }

  function noticeText(): string | null {
    const notice = fd.doctor.notice;
    if (!notice) return null;
    return notice.kind === 'failed'
      ? msgs.notice.failed({ message: notice.message })
      : msgs.notice[notice.kind];
  }

  const notice = $derived(noticeText());
  const busy = $derived(fd.doctor.applyingId !== null);
</script>

{#if visible}
  <div class="fd-doctor" bind:this={rootEl} onkeydown={onKeydown} role="presentation">
    <Button
      variant="ghost"
      class="fd-doctor__trigger fd-doctor__trigger--{worst} {open
        ? 'fd-doctor__trigger--open'
        : ''}"
      aria-expanded={open}
      aria-controls={open ? popoverId : undefined}
      title={msgs.triggerTitle}
      data-testid="doctor-trigger"
      data-severity={worst}
      onclick={() => (open ? close(false) : (open = true))}
    >
      {#snippet leadingIcon()}<Icon icon={ICONS[worst]} />{/snippet}
      {msgs.trigger({ count: problems.length })}
    </Button>

    {#if open}
      <div
        class="fd-doctor__popover"
        id={popoverId}
        role="region"
        aria-label={msgs.title}
        data-testid="doctor-popover"
      >
        {#if notice}
          <div class="fd-doctor__notice" data-testid="doctor-notice">
            <Notice
              tone={fd.doctor.notice?.kind === 'failed' ? 'error' : 'info'}
              ondismiss={() => fd.doctor.dismissNotice()}
              dismissLabel={msgs.dismissNotice}
            >
              {notice}
            </Notice>
          </div>
        {/if}
        <ul class="fd-doctor__list" aria-label={msgs.listLabel}>
          {#each problems as problem (problem.id)}
            {@const name = nodeName(problem)}
            {@const asking = pending?.problemId === problem.id ? pending : null}
            {@const askedRemedy = asking
              ? problem.remedies.find((r) => r.id === asking.remedyId)
              : undefined}
            {@const single =
              canApply &&
              problem.remedies.length === 1 &&
              !asking &&
              !choicesOf(problem.remedies[0])}
            <li
              class="fd-doctor__row fd-doctor__row--{problem.severity}"
              data-testid="doctor-problem"
              data-code={problem.code}
              data-severity={problem.severity}
            >
              <span class="fd-doctor__dot" role="img" aria-label={msgs.severity[problem.severity]}
              ></span>
              <div class="fd-doctor__text">
                {#if name && problem.node}
                  <Button
                    variant="ghost"
                    size="sm"
                    class="fd-doctor__node"
                    title={msgs.selectNode({ name })}
                    data-testid="doctor-node-link"
                    onclick={() => fd.doctor.focusNode(problem.node!)}
                  >
                    {name}
                  </Button>
                {:else}
                  <span class="fd-doctor__node-plain">{msgs.workflowWide}</span>
                {/if}
                <span class="fd-doctor__message">
                  {problem.message}
                </span>
              </div>
              {#if canApply && problem.remedies.length > 0 && !asking}
                <div class="fd-doctor__actions" class:fd-doctor__actions--side={single}>
                  {#each problem.remedies as remedy (remedy.id)}
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busy}
                      loading={fd.doctor.applyingId === problem.id}
                      title={remedy.description}
                      data-testid="doctor-remedy"
                      data-remedy={remedy.id}
                      onclick={() => choose(problem, remedy)}
                    >
                      {remedy.label}
                    </Button>
                  {/each}
                </div>
              {/if}
              {#if asking && askedRemedy}
                {@const choices = choicesOf(askedRemedy)}
                <div class="fd-doctor__ask" data-testid="doctor-ask">
                  {#if choices}
                    <Select
                      size="sm"
                      options={choices}
                      value={asking.choice}
                      placeholder={msgs.choosePlaceholder}
                      aria-label={msgs.chooseLabel}
                      data-testid="doctor-choice"
                      onValueChange={(value) => {
                        if (pending) pending = { ...pending, choice: value };
                      }}
                    />
                  {/if}
                  {#if askedRemedy.destructive}
                    <span class="fd-doctor__confirm">{msgs.confirm}</span>
                  {/if}
                  <span class="fd-doctor__ask-actions">
                    <Button
                      variant={askedRemedy.destructive ? 'danger' : 'primary'}
                      size="sm"
                      disabled={busy || (!!choices && !asking.choice)}
                      data-testid="doctor-confirm"
                      onclick={() => void run(problem, askedRemedy, asking.choice)}
                    >
                      {msgs.confirmApply}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      data-testid="doctor-cancel"
                      onclick={() => (pending = null)}
                    >
                      {msgs.confirmCancel}
                    </Button>
                  </span>
                </div>
              {/if}
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>
{/if}

<style>
  .fd-doctor {
    position: relative;
    display: inline-flex;
    align-items: center;
  }

  .fd-doctor :global(.fd-doctor__trigger) {
    --_c: var(--fd-warning);
    color: var(--_c);
    font-weight: 500;
  }
  .fd-doctor :global(.fd-doctor__trigger--error) {
    --_c: var(--fd-error);
  }
  .fd-doctor :global(.fd-doctor__trigger--info) {
    --_c: var(--fd-info);
  }
  .fd-doctor :global(.fd-doctor__trigger--open),
  .fd-doctor :global(.fd-doctor__trigger:hover) {
    color: var(--_c);
  }

  .fd-doctor__popover {
    position: absolute;
    top: calc(100% + var(--fd-space-xs));
    right: 0;
    z-index: 60;
    box-sizing: border-box;
    width: 360px;
    max-width: calc(100vw - 32px);
    max-height: min(60vh, 440px);
    overflow-y: auto;
    padding: var(--fd-space-xs);
    background-color: var(--fd-background);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-menu-radius);
    box-shadow: var(--fd-menu-shadow);
    font-family: var(--fd-font-sans);
    font-size: var(--fd-text-sm);
    color: var(--fd-foreground);
  }

  .fd-doctor__notice {
    padding-bottom: var(--fd-space-xs);
  }

  .fd-doctor__list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .fd-doctor__row {
    --_c: var(--fd-warning);
    display: grid;
    grid-template-columns: 8px minmax(0, 1fr) auto;
    column-gap: var(--fd-space-sm);
    row-gap: var(--fd-space-xs);
    align-items: start;
    padding: var(--fd-space-sm);
    border-radius: var(--fd-menu-item-radius);
  }
  .fd-doctor__row:hover {
    background-color: var(--fd-muted);
  }
  .fd-doctor__row--error {
    --_c: var(--fd-error);
  }
  .fd-doctor__row--info {
    --_c: var(--fd-info);
  }

  .fd-doctor__dot {
    width: 8px;
    height: 8px;
    margin-top: 0.4em;
    border-radius: var(--fd-radius-full);
    background-color: var(--_c);
  }

  .fd-doctor__text {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-3xs);
    min-width: 0;
  }

  .fd-doctor__text :global(.fd-doctor__node) {
    align-self: flex-start;
    justify-content: flex-start;
    height: auto;
    max-width: 100%;
    padding: 0;
    border: none;
    background: none;
    color: var(--fd-foreground);
    font-size: inherit;
    font-weight: 600;
  }
  .fd-doctor__text :global(.fd-doctor__node:hover) {
    background: none;
    text-decoration: underline;
  }
  .fd-doctor__text :global(.fd-doctor__node .flowdrop-ui-button__label) {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .fd-doctor__node-plain {
    font-weight: 600;
  }

  .fd-doctor__message {
    color: var(--fd-muted-foreground);
    overflow-wrap: anywhere;
  }

  .fd-doctor__actions,
  .fd-doctor__ask {
    grid-column: 2 / -1;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--fd-space-xs);
  }
  /* One plain remedy: its button sits beside the text, as in the mockup. */
  .fd-doctor__actions--side {
    grid-column: 3;
    grid-row: 1;
  }

  .fd-doctor__confirm {
    color: var(--fd-muted-foreground);
  }
  .fd-doctor__ask-actions {
    display: inline-flex;
    gap: var(--fd-space-xs);
  }
</style>
