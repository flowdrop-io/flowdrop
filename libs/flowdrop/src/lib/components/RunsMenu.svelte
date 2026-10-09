<!--
  RunsMenu — the Runs list of Test mode: a "Runs" control in the canvas toolbar
  that opens a popover listing the workflow's past runs (newest first, paged).

  Read-only apart from two actions: Re-run (a finished run) and Cancel (one
  that has not finished). Opening a run shows it on the canvas: its node
  statuses become the badges (`fd.runs.openRun`). Everything else (delete,
  generate or clear jobs, filters) lives in the host's admin; the footer link
  and the per-row link are drawn only when the host gave a URL template
  (`features.adminLinks`), so no host path is hard-coded here.

  The list is a plain `<ul>`; each row is a button that opens the run, with its
  actions beside it (shown on hover and focus, always on touch). Escape closes
  the popover and returns focus to its trigger.
-->

<script lang="ts">
  import { tick, untrack } from 'svelte';
  import Icon from '@iconify/svelte';
  import { getInstance } from '../stores/getInstance.svelte.js';
  import { getMessages } from '../messages/context.js';
  import { cancelRun, listRuns, rerunRun, runsSupport } from '../services/runsService.js';
  import {
    RUNS_MAX_LIMIT,
    RUNS_PAGE_SIZE,
    appendRuns,
    canCancelRun,
    canRerunRun,
    expandAdminUrl,
    formatRunDuration,
    formatRunTime,
    hasMoreRuns,
    isTerminalRun,
    runDurationMs,
    runPillStatus,
    type RunSummary
  } from '../utils/runsList.js';
  import { on } from 'svelte/events';
  import Button from './primitives/Button.svelte';
  import IconButton from './primitives/IconButton.svelte';
  import EmptyState from './primitives/EmptyState.svelte';

  interface Props {
    /**
     * Host URL templates for the admin pages. `{workflowId}` and `{pipelineId}`
     * are filled in. `runs` is the footer link ("Open in admin"), `run` the
     * link on each row. A link whose template is not given is not drawn.
     */
    adminLinks?: { runs?: string; run?: string };
  }

  let { adminLinks }: Props = $props();

  const fd = getInstance();
  const getMsgs = getMessages();
  const msgs = $derived(getMsgs().runsList);

  /** How often the open list re-reads while a run on it has not finished. */
  const REFRESH_MS = 4000;

  const config = $derived(fd.api.config);
  const support = $derived(runsSupport(config));
  const workflowId = $derived(fd.workflow.current?.id);
  const currentRunId = $derived(fd.runs.activeRun?.runId ?? null);

  let open = $state(false);
  /** What the trigger says of the run opened from the list. */
  let shown = $state<{ id: string; createdAt: string | null } | null>(null);
  const shownRun = $derived(
    shown && fd.runs.openedRunId === shown.id
      ? { ...shown, status: fd.runs.activeRun?.status }
      : null
  );
  let runs = $state<RunSummary[]>([]);
  let loading = $state(false);
  let loadingMore = $state(false);
  let failed = $state(false);
  let more = $state(false);
  let busyId = $state<string | null>(null);
  let actionError = $state<string | null>(null);
  let rootEl = $state<HTMLElement | null>(null);
  let listEl = $state<HTMLElement | null>(null);
  /** Bumped by each read; a slower, older read is dropped. */
  let readToken = 0;

  const listId = `fd-runs-${Math.random().toString(36).slice(2, 8)}`;
  const adminRuns = $derived(expandAdminUrl(adminLinks?.runs, { workflowId }));

  async function load(): Promise<void> {
    if (!config || !workflowId) return;
    const token = ++readToken;
    // A refresh re-reads as many as are showing, so the list does not shrink.
    const limit = Math.min(RUNS_MAX_LIMIT, Math.max(RUNS_PAGE_SIZE, runs.length));
    try {
      const page = await listRuns(config, workflowId, { offset: 0, limit }, fd.api.authProvider);
      if (token !== readToken) return;
      runs = page;
      more = hasMoreRuns(page.length, limit);
      failed = false;
    } catch {
      if (token !== readToken) return;
      failed = runs.length === 0;
    } finally {
      if (token === readToken) loading = false;
    }
  }

  async function loadMore(): Promise<void> {
    if (!config || !workflowId || loadingMore) return;
    loadingMore = true;
    const token = ++readToken;
    try {
      const page = await listRuns(
        config,
        workflowId,
        { offset: runs.length, limit: RUNS_PAGE_SIZE },
        fd.api.authProvider
      );
      if (token !== readToken) return;
      runs = appendRuns(runs, page);
      more = hasMoreRuns(page.length, RUNS_PAGE_SIZE);
    } catch {
      actionError = msgs.loadError;
    } finally {
      loadingMore = false;
    }
  }

  function show(): void {
    open = true;
    actionError = null;
    loading = runs.length === 0;
    failed = false;
    void load();
  }

  function close(returnFocus = true): void {
    if (!open) return;
    open = false;
    readToken++;
    if (returnFocus) rootEl?.querySelector<HTMLElement>('.fd-runs__trigger')?.focus();
  }

  // Outside pointer closes; the list refreshes while a run on it is going.
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
  const anyLive = $derived(runs.some((r) => !isTerminalRun(r.status)));
  $effect(() => {
    if (!open || !anyLive) return;
    const timer = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(timer);
  });

  // A different workflow is a different list.
  $effect(() => {
    void workflowId;
    untrack(() => {
      runs = [];
      more = false;
      close(false);
    });
  });

  function onKeydown(event: KeyboardEvent): void {
    // The toolbar around this control roves on the arrow keys: keep them here.
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
      event.stopPropagation();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    const rows = Array.from(listEl?.querySelectorAll<HTMLElement>('.fd-runs__open') ?? []);
    if (rows.length === 0) return;
    const at = rows.indexOf(document.activeElement as HTMLElement);
    if (at === -1) return;
    event.preventDefault();
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? rows.length - 1
          : Math.min(rows.length - 1, Math.max(0, at + (event.key === 'ArrowDown' ? 1 : -1)));
    rows[next]?.focus();
  }

  function openRun(run: RunSummary): void {
    fd.runs.openRun(run.id, run.status);
    shown = { id: run.id, createdAt: run.createdAt };
    close();
  }

  async function rerun(run: RunSummary): Promise<void> {
    if (!config || busyId) return;
    busyId = run.id;
    actionError = null;
    const result = await rerunRun(config, run.id, fd.api.authProvider);
    busyId = null;
    if (!result.ok) {
      actionError = result.message || msgs.actionFailed;
      return;
    }
    if (result.pipelineId) {
      fd.runs.openRun(result.pipelineId, result.status ?? 'running');
      shown = { id: result.pipelineId, createdAt: new Date().toISOString() };
    }
    close();
  }

  async function cancel(run: RunSummary): Promise<void> {
    if (!config || busyId) return;
    busyId = run.id;
    actionError = null;
    const result = await cancelRun(config, run.id, fd.api.authProvider);
    busyId = null;
    if (!result.ok) actionError = result.message || msgs.actionFailed;
    // Either way the run's truth is on the server now.
    await load();
    await tick();
  }

  function clearShown(): void {
    shown = null;
    fd.runs.dismissRun();
    rootEl?.querySelector<HTMLElement>('.fd-runs__trigger')?.focus();
  }

  function statusLabel(status: string): string {
    return (msgs.status as Record<string, string>)[status] ?? status;
  }

  function timeOf(run: { createdAt: string | null }): string {
    return formatRunTime(run.createdAt, new Date(), {
      today: msgs.today,
      yesterday: msgs.yesterday
    });
  }

  function adminRun(run: RunSummary): string | null {
    return expandAdminUrl(adminLinks?.run, { workflowId, pipelineId: run.id });
  }
</script>

{#if support.list && workflowId}
  <div class="fd-runs" bind:this={rootEl} onkeydown={onKeydown} role="presentation">
    <Button
      variant="ghost"
      class="fd-runs__trigger {open ? 'fd-runs__trigger--open' : ''}"
      aria-expanded={open}
      aria-controls={open ? listId : undefined}
      title={shownRun ? msgs.shownTitle : msgs.triggerTitle}
      data-testid="runs-trigger"
      onclick={() => (open ? close(false) : show())}
    >
      {#if shownRun}
        <span class="fd-runs__trigger-text" data-testid="runs-shown">
          {msgs.shown({
            status: shownRun.status ? getMsgs().runBar[shownRun.status] : '',
            time: timeOf({ createdAt: shownRun.createdAt })
          })}
        </span>
      {:else}
        <span>{msgs.trigger}</span>
      {/if}
      <Icon icon="mdi:chevron-down" aria-hidden="true" />
    </Button>
    {#if shownRun}
      <IconButton
        variant="ghost"
        size="sm"
        class="fd-runs__clear"
        ariaLabel={msgs.clearShown}
        title={msgs.clearShown}
        data-testid="runs-clear"
        onclick={clearShown}
      >
        <Icon icon="mdi:close" aria-hidden="true" />
      </IconButton>
    {/if}

    {#if open}
      <div
        class="fd-runs__popover"
        id={listId}
        role="region"
        aria-label={msgs.title}
        data-testid="runs-popover"
      >
        {#if loading}
          <p class="fd-runs__note" role="status">{msgs.loading}</p>
        {:else if failed}
          <div class="fd-runs__note" role="alert">
            <span>{msgs.loadError}</span>
            <Button variant="ghost" size="sm" onclick={() => void load()}>{msgs.retry}</Button>
          </div>
        {:else if runs.length === 0}
          <EmptyState size="sm" title={msgs.empty} description={msgs.emptyHint} />
        {:else}
          <ul class="fd-runs__list" aria-label={msgs.listLabel} bind:this={listEl}>
            {#each runs as run (run.id)}
              {@const duration = formatRunDuration(runDurationMs(run))}
              {@const time = timeOf(run)}
              {@const adminHref = adminRun(run)}
              <li class="fd-runs__row" class:fd-runs__row--current={run.id === currentRunId}>
                <Button
                  variant="ghost"
                  class="fd-runs__open"
                  aria-current={run.id === currentRunId ? 'true' : undefined}
                  aria-label={msgs.openRun({ id: run.id, status: statusLabel(run.status), time })}
                  data-testid="run-row"
                  data-run-id={run.id}
                  data-status={run.status}
                  onclick={() => openRun(run)}
                >
                  <span class="fd-runs__line">
                    <span
                      class="fd-runs__status fd-runs__status--{runPillStatus(run.status)}"
                      data-testid="run-status"
                    >
                      <span class="fd-runs__dot" aria-hidden="true"></span>
                      {statusLabel(run.status)}
                    </span>
                    <span class="fd-runs__time">
                      {time}
                      {#if run.jobSummary && run.jobSummary.failed > 0 && run.status !== 'failed'}
                        <span class="fd-runs__jobs"
                          >· {msgs.jobsFailed({ n: run.jobSummary.failed })}</span
                        >
                      {/if}
                    </span>
                    <span class="fd-runs__duration">{duration}</span>
                  </span>
                </Button>
                <span class="fd-runs__actions">
                  {#if support.cancel && canCancelRun(run.status)}
                    <Button
                      variant="ghost"
                      size="sm"
                      ariaLabel={msgs.cancelLabel({ id: run.id })}
                      loading={busyId === run.id}
                      disabled={busyId !== null && busyId !== run.id}
                      data-testid="run-cancel"
                      onclick={() => void cancel(run)}
                    >
                      {msgs.cancel}
                    </Button>
                  {/if}
                  {#if support.rerun && canRerunRun(run.status)}
                    <Button
                      variant="ghost"
                      size="sm"
                      ariaLabel={msgs.rerunLabel({ id: run.id })}
                      loading={busyId === run.id}
                      disabled={busyId !== null && busyId !== run.id}
                      data-testid="run-rerun"
                      onclick={() => void rerun(run)}
                    >
                      {msgs.rerun}
                    </Button>
                  {/if}
                  {#if adminHref}
                    <a
                      class="fd-runs__admin-row"
                      href={adminHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={msgs.openAdminRun}
                      title={msgs.openAdminRun}
                      data-testid="run-admin-link"
                    >
                      <Icon icon="heroicons:arrow-up-right-20-solid" aria-hidden="true" />
                    </a>
                  {/if}
                </span>
              </li>
            {/each}
          </ul>
          {#if more}
            <div class="fd-runs__more">
              <Button
                variant="ghost"
                size="sm"
                loading={loadingMore}
                data-testid="runs-load-more"
                onclick={() => void loadMore()}
              >
                {loadingMore ? msgs.loadingMore : msgs.loadMore}
              </Button>
            </div>
          {/if}
        {/if}

        {#if actionError}
          <p class="fd-runs__error" role="alert" data-testid="runs-error">{actionError}</p>
        {/if}

        {#if adminRuns}
          <a
            class="fd-runs__admin"
            href={adminRuns}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="runs-admin-link"
          >
            <span>{msgs.openAdmin}</span>
            <Icon icon="heroicons:arrow-up-right-20-solid" aria-hidden="true" />
          </a>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  .fd-runs {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-3xs);
  }

  .fd-runs__trigger-text {
    max-width: 16rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* A floating control of its own, like the Edit | Test switch beside it. */
  .fd-runs :global(.fd-runs__trigger) {
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-3xs);
    box-sizing: border-box;
    height: calc(var(--fd-control-md) + 4px + 2px);
    padding: 0 var(--fd-space-sm) 0 var(--fd-space-md);
    background-color: var(--fd-toolbar-segmented-bg);
    border: 1px solid var(--fd-toolbar-segmented-border);
    border-radius: var(--fd-toolbar-segmented-radius);
    box-shadow: var(--fd-elevation-float);
    color: var(--fd-muted-foreground);
    font: inherit;
    font-size: var(--fd-text-sm);
    font-weight: 500;
    cursor: pointer;
  }
  .fd-runs :global(.fd-runs__trigger:hover),
  .fd-runs :global(.fd-runs__trigger--open) {
    color: var(--fd-foreground);
  }

  .fd-runs__popover {
    position: absolute;
    top: calc(100% + var(--fd-space-xs));
    left: 0;
    z-index: 50;
    box-sizing: border-box;
    width: 340px;
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

  .fd-runs__list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .fd-runs__row {
    position: relative;
    border-radius: var(--fd-menu-item-radius);
  }
  .fd-runs__row:hover,
  .fd-runs__row:focus-within {
    background-color: var(--fd-muted);
  }
  .fd-runs__row--current {
    background-color: var(--fd-muted);
  }

  .fd-runs__row :global(.fd-runs__open) {
    height: auto;
    font-weight: 400;
    display: flex;
    justify-content: stretch;
    width: 100%;
    min-height: var(--fd-menu-item-height);
    padding: var(--fd-space-xs) var(--fd-space-sm);
    border: none;
    border-radius: inherit;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .fd-runs__row :global(.fd-runs__open .flowdrop-ui-button__label) {
    flex: 1;
    min-width: 0;
  }

  .fd-runs__line {
    display: grid;
    grid-template-columns: 5.5rem minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--fd-space-sm);
    width: 100%;
  }

  .fd-runs__status {
    --_c: var(--fd-status-skipped);
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-xs);
    font-weight: 500;
  }
  .fd-runs__status--running {
    --_c: var(--fd-status-running);
  }
  .fd-runs__status--completed {
    --_c: var(--fd-status-completed);
  }
  .fd-runs__status--waiting {
    --_c: var(--fd-status-waiting);
  }
  .fd-runs__status--failed {
    --_c: var(--fd-status-failed);
  }
  .fd-runs__dot {
    flex: none;
    width: 8px;
    height: 8px;
    border-radius: var(--fd-radius-full);
    background-color: var(--_c);
  }

  .fd-runs__time {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--fd-muted-foreground);
  }
  .fd-runs__jobs {
    color: var(--fd-status-failed);
  }
  .fd-runs__duration {
    font-family: var(--fd-font-mono);
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
  }

  /* Actions take the duration's place while the row is hovered or holds focus. */
  .fd-runs__actions {
    position: absolute;
    top: 0;
    right: var(--fd-space-2xs);
    bottom: 0;
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-3xs);
    padding-left: var(--fd-space-sm);
    background-color: var(--fd-muted);
    border-radius: var(--fd-menu-item-radius);
    opacity: 0;
    pointer-events: none;
  }
  .fd-runs__row:hover .fd-runs__actions,
  .fd-runs__row:focus-within .fd-runs__actions {
    opacity: 1;
    pointer-events: auto;
  }
  @media (hover: none) {
    .fd-runs__actions {
      opacity: 1;
      pointer-events: auto;
    }
    .fd-runs__duration {
      display: none;
    }
  }

  .fd-runs__admin-row {
    display: inline-flex;
    align-items: center;
    padding: var(--fd-space-2xs);
    color: var(--fd-muted-foreground);
  }
  .fd-runs__admin-row:hover {
    color: var(--fd-foreground);
  }

  .fd-runs__more {
    display: flex;
    justify-content: center;
    padding-top: var(--fd-space-xs);
  }

  .fd-runs__note {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--fd-space-sm);
    margin: 0;
    padding: var(--fd-space-md) var(--fd-space-sm);
    color: var(--fd-muted-foreground);
  }

  .fd-runs__error {
    margin: var(--fd-space-xs) var(--fd-space-sm) 0;
    color: var(--fd-status-failed);
    font-size: var(--fd-text-xs);
  }

  .fd-runs__admin {
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-3xs);
    margin: var(--fd-space-xs) var(--fd-space-sm) var(--fd-space-2xs);
    color: var(--fd-inspector-link-color);
    font-weight: 500;
    text-decoration: none;
  }
  .fd-runs__admin:hover {
    text-decoration: underline;
  }
</style>
