<!--
  PlaygroundHeader

  The docked Playground's header (Test mode), two controls and nothing else:

   - the history chip: which conversation (and run) the view is on. Its menu
     lists the Conversations (the sessions the Playground created) and the
     Runs of the open one, newest first, older-version runs marked. Picking a
     conversation opens it; picking a run shows that run (the canvas follows).
   - the ⋯ menu: Expand steps by default, JSON view (a form workflow), Refresh, Reset,
     Playground settings, and whatever a host adds through `menuItems`.

  Each fact has one home: which conversation or run is shown lives in the
  chip; the recovery actions live in the menu. No link to the standalone page.
-->

<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from '@iconify/svelte';
  import HeaderMenu from './HeaderMenu.svelte';
  import PanelHeader from '../primitives/PanelHeader.svelte';
  import { getInstance } from '../../stores/getInstance.svelte.js';
  import { m } from '$lib/messages/index.js';
  import { resolveSessionEndpoint } from '../../config/endpoints.js';
  import { historyGroups } from '../../utils/playgroundHistory.js';

  const fd = getInstance();

  interface Props {
    /** The workflow has an interface form, so the JSON view applies. */
    hasForm?: boolean;
    /** The form is shown as JSON. */
    jsonView?: boolean;
    onToggleJsonView?: () => void;
    /** Opens the workflow's Playground settings (the editor's inspector). */
    onOpenSettings?: () => void;
    /**
     * Extra entries at the end of the ⋯ menu. Render buttons with
     * `class="header-menu__item"` and `role="menuitem"`; call `close()` after
     * the action. Used by hosts that add an action to the Playground
     * (the editor's "Ask the Assistant about this run", say).
     */
    menuItems?: Snippet<[{ close: () => void }]>;
  }

  let {
    hasForm = false,
    jsonView = false,
    onToggleJsonView,
    onOpenSettings,
    menuItems
  }: Props = $props();

  const t = $derived(m().playground.header);

  const groups = $derived(
    historyGroups(
      fd.playground.sessions,
      fd.playground.currentSession?.id,
      fd.playground.sessionRuns,
      fd.playground.activeExecutionId
    )
  );

  /** The chip names the conversation, and the run too once one is picked. */
  const label = $derived.by(() => {
    const session = fd.playground.currentSession;
    const name = session?.name ?? t.noConversation;
    const pinned = fd.playground.pinnedExecutionId;
    const run = pinned ? groups.runs.find((r) => r.id === pinned) : undefined;
    return run ? `${name} · #${run.number}` : name;
  });

  const canReset = $derived(
    fd.playground.currentSession != null &&
      fd.api.config != null &&
      resolveSessionEndpoint(fd.api.config, 'reset') != null
  );

  const statusIcon: Record<string, string> = {
    completed: 'mdi:check',
    failed: 'mdi:close',
    cancelled: 'mdi:stop',
    running: 'mdi:circle-medium',
    pending: 'mdi:circle-medium',
    paused: 'mdi:pause',
    waiting: 'mdi:pause'
  };

  function runTitle(run: { number: number; message: string | null }): string {
    const text = run.message?.trim();
    const base = t.run({ number: run.number });
    if (!text) return base;
    return `${base} · ${text.length > 28 ? text.slice(0, 27) + '…' : text}`;
  }

  function runWhen(startedAt: string | null): string {
    if (!startedAt) return '';
    const date = new Date(startedAt);
    return Number.isNaN(date.getTime())
      ? ''
      : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function refreshHistory(): void {
    void fd.runs.loadSessionRuns();
  }

  function pickConversation(id: string, close: () => void): void {
    close();
    void fd.runs.selectSession(id);
  }

  function pickRun(id: string, close: () => void): void {
    close();
    fd.playground.pinExecution(id);
  }

  function act(action: () => void, close: () => void): void {
    close();
    action();
  }

  async function reset(close: () => void): Promise<void> {
    close();
    try {
      await fd.runs.resetSession();
    } catch (err) {
      fd.playground.setError(err instanceof Error ? err.message : String(err));
    }
  }
</script>

<PanelHeader data-testid="playground-header">
  {#snippet leading()}
    <HeaderMenu label={t.history} testId="playground-history" onOpen={refreshHistory}>
      {#snippet trigger()}
        <span class="playground-header__label">{label}</span>
        <Icon icon="mdi:chevron-down" />
      {/snippet}
      {#snippet children({ close })}
        <div class="header-menu__group" role="presentation">{t.conversations}</div>
        <button
          type="button"
          role="menuitem"
          class="header-menu__item"
          disabled={fd.playground.isLoading}
          onclick={() => act(() => void fd.runs.createSession(), close)}
        >
          <span class="header-menu__item-label"
            ><Icon icon="mdi:plus" /><span>{t.newConversation}</span></span
          >
          <span class="header-menu__item-hint">{t.newConversationHint}</span>
        </button>
        {#each groups.conversations as conversation (conversation.id)}
          <button
            type="button"
            role="menuitemradio"
            aria-checked={conversation.current}
            class="header-menu__item"
            data-testid="history-conversation"
            onclick={() => pickConversation(conversation.id, close)}
          >
            <span class="header-menu__item-label">
              <Icon icon={conversation.current ? 'mdi:check' : 'mdi:message-outline'} />
              <span>{conversation.name}</span>
            </span>
          </button>
        {/each}

        <div class="header-menu__divider" role="separator"></div>
        <div class="header-menu__group" role="presentation">{t.runs}</div>
        {#each groups.runs as run (run.id)}
          <button
            type="button"
            role="menuitemradio"
            aria-checked={run.shown}
            class="header-menu__item"
            data-testid="history-run"
            data-stale={run.stale ? 'true' : undefined}
            onclick={() => pickRun(run.id, close)}
          >
            <span class="header-menu__item-label">
              <Icon
                icon={run.shown ? 'mdi:check' : (statusIcon[run.status] ?? 'mdi:circle-small')}
              />
              <span>{runTitle(run)}</span>
            </span>
            <span class="header-menu__item-hint">
              {run.status}{runWhen(run.startedAt) ? ` · ${runWhen(run.startedAt)}` : ''}{run.stale
                ? ` · ${t.staleRun}`
                : ''}
            </span>
          </button>
        {:else}
          <div class="playground-header__empty">
            <span>{t.noRuns}</span>
            <span class="header-menu__item-hint">{t.noRunsHint}</span>
          </div>
        {/each}
      {/snippet}
    </HeaderMenu>
  {/snippet}
  {#snippet actions()}
    <HeaderMenu label={t.moreActions} testId="playground-more" variant="icon" align="end">
      {#snippet trigger()}
        <Icon icon="mdi:dots-horizontal" />
      {/snippet}
      {#snippet children({ close })}
        <button
          type="button"
          role="menuitemcheckbox"
          aria-checked={fd.playground.expandSteps}
          class="header-menu__item"
          onclick={() => act(() => fd.playground.toggleExpandSteps(), close)}
        >
          <span class="header-menu__item-label">
            {#if fd.playground.expandSteps}<Icon icon="mdi:check" />{/if}<span>{t.showSteps}</span>
          </span>
          <span class="header-menu__item-hint">{t.showStepsHint}</span>
        </button>
        {#if hasForm}
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={jsonView}
            class="header-menu__item"
            onclick={() => act(() => onToggleJsonView?.(), close)}
          >
            <span class="header-menu__item-label">
              {#if jsonView}<Icon icon="mdi:check" />{/if}<span>{t.jsonView}</span>
            </span>
            <span class="header-menu__item-hint">{t.jsonViewHint}</span>
          </button>
        {/if}
        {#if onOpenSettings}
          <button
            type="button"
            role="menuitem"
            class="header-menu__item"
            onclick={() => act(onOpenSettings, close)}
          >
            <span class="header-menu__item-label"><span>{t.playgroundSettings}</span></span>
            <span class="header-menu__item-hint">{t.playgroundSettingsHint}</span>
          </button>
        {/if}
        <button
          type="button"
          role="menuitem"
          class="header-menu__item"
          disabled={!fd.playground.currentSession || fd.runs.isRefreshing}
          onclick={() => act(() => void fd.runs.refresh(), close)}
        >
          <span class="header-menu__item-label"><span>{t.refresh}</span></span>
          <span class="header-menu__item-hint">{t.refreshHint}</span>
        </button>
        {#if canReset}
          <button
            type="button"
            role="menuitem"
            class="header-menu__item"
            onclick={() => void reset(close)}
          >
            <span class="header-menu__item-label"><span>{t.reset}</span></span>
            <span class="header-menu__item-hint">{t.resetHint}</span>
          </button>
        {/if}
        {@render menuItems?.({ close })}
      {/snippet}
    </HeaderMenu>
  {/snippet}
</PanelHeader>

<style>
  .playground-header__label {
    min-width: 0;
    max-width: 230px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* The chip may shrink inside the header's lead area so a long name truncates. */
  :global(.flowdrop-ui-panel-header__lead > .header-menu) {
    flex: 0 1 auto;
    min-width: 0;
  }

  .playground-header__empty {
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: var(--fd-space-sm);
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-sm);
  }
</style>
