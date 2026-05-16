<!--
  ControlPanel Component

  Where the user talks to the flow: session switcher, orchestration controls
  (Run/Stop via ChatInput), and toolbar buttons (Pipeline toggle, Refresh,
  Logs). Owns the session chip popover; delegates input behaviour to the
  shared ChatInput primitive.
-->

<script lang="ts">
  import Icon from '@iconify/svelte';
  import ChatInput from './ChatInput.svelte';
  import {
    getCurrentSession,
    getSessions,
    getIsLoading,
    getShowLogs,
    playgroundActions
  } from '../../stores/playgroundStore.svelte.js';
  import { m } from '$lib/messages/index.js';

  interface Props {
    // Session management
    onCreateSession: () => void;
    onSelectSession: (id: string) => void;
    onDeleteSession: (id: string) => void;
    onSessionNavigate?: (id: string) => void;
    // Orchestration
    onSendMessage: (content: string) => void;
    onStopExecution: () => void;
    // Header actions
    onTogglePanel?: () => void;
    isPipelinePanelOpen?: boolean;
    onRefresh: () => void;
    isRefreshing?: boolean;
    // Input config
    showChatInput?: boolean;
    showRunButton?: boolean;
    predefinedMessage?: string;
    placeholder?: string;
    style?: string;
  }

  let {
    onCreateSession,
    onSelectSession,
    onDeleteSession,
    onSessionNavigate,
    onSendMessage,
    onStopExecution,
    onTogglePanel,
    isPipelinePanelOpen = false,
    onRefresh,
    isRefreshing = false,
    showChatInput = true,
    showRunButton = true,
    predefinedMessage,
    placeholder,
    style
  }: Props = $props();

  const cp = $derived(m().playground.controlPanel);
  const logsTitle = $derived(getShowLogs() ? cp.hideLogs : cp.showLogs);

  let sessionDropdownOpen = $state(false);
  let sessionChipEl = $state<HTMLElement | null>(null);
  let sessionPopoverEl = $state<HTMLElement | null>(null);

  $effect(() => {
    if (sessionDropdownOpen && sessionPopoverEl) {
      sessionPopoverEl.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    }
  });

  // Close popover on outside click
  $effect(() => {
    if (!sessionDropdownOpen) return;
    function handleOutside(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest('.control-panel__session-chip-wrap')) {
        sessionDropdownOpen = false;
      }
    }
    document.addEventListener('click', handleOutside);
    return () => document.removeEventListener('click', handleOutside);
  });

  function handleSelect(sessionId: string): void {
    sessionDropdownOpen = false;
    if (onSessionNavigate) {
      onSessionNavigate(sessionId);
    } else {
      onSelectSession(sessionId);
    }
  }

  function handleCreate(): void {
    sessionDropdownOpen = false;
    onCreateSession();
  }

  function handleDelete(event: Event, sessionId: string): void {
    event.stopPropagation();
    sessionDropdownOpen = false;
    onDeleteSession(sessionId);
  }
</script>

<section class="control-panel" {style}>
  <header class="control-panel__header">
    <Icon icon="mdi:message-text-outline" class="control-panel__icon" />
    <span class="control-panel__label">{cp.sessionsLabel}</span>

    <div class="control-panel__session-chip-wrap">
      <button
        type="button"
        class="control-panel__session-chip"
        class:control-panel__session-chip--open={sessionDropdownOpen}
        bind:this={sessionChipEl}
        aria-haspopup="true"
        aria-expanded={sessionDropdownOpen}
        onclick={() => (sessionDropdownOpen = !sessionDropdownOpen)}
        onkeydown={(e) => {
          if (e.key === 'Escape') sessionDropdownOpen = false;
        }}
        title={cp.switchSession}
      >
        <span class="control-panel__session-chip-name">
          {getCurrentSession()?.name ?? cp.noSession}
        </span>
        <Icon
          icon={sessionDropdownOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'}
          class="control-panel__session-chip-chevron"
        />
      </button>

      {#if sessionDropdownOpen}
        <div
          class="control-panel__session-popover"
          bind:this={sessionPopoverEl}
          role="menu"
          tabindex="-1"
          onkeydown={(e) => {
            if (e.key === 'Escape') {
              sessionDropdownOpen = false;
              sessionChipEl?.focus();
            }
          }}
        >
          <button
            type="button"
            role="menuitem"
            class="control-panel__session-popover-item control-panel__session-popover-item--new"
            disabled={getIsLoading()}
            onclick={handleCreate}
          >
            <Icon icon="mdi:plus" />
            <span>{cp.newSession}</span>
          </button>
          {#if getSessions().length > 0}
            <div class="control-panel__session-popover-divider"></div>
            {#each getSessions() as session (session.id)}
              {@const isActive = getCurrentSession()?.id === session.id}
              <div class="control-panel__session-popover-row">
                <button
                  type="button"
                  role="menuitem"
                  class="control-panel__session-popover-item"
                  class:control-panel__session-popover-item--active={isActive}
                  onclick={() => handleSelect(session.id)}
                >
                  {#if isActive}
                    <Icon icon="mdi:check" class="control-panel__session-popover-check" />
                  {:else}
                    <Icon icon="mdi:message-outline" />
                  {/if}
                  <span>{session.name}</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  class="control-panel__session-popover-delete"
                  onclick={(e) => handleDelete(e, session.id)}
                  title={cp.deleteSession}
                  aria-label={cp.deleteSession}
                >
                  <Icon icon="mdi:delete-outline" />
                </button>
              </div>
            {/each}
          {/if}
        </div>
      {/if}
    </div>

    <div class="control-panel__header-actions">
      {#if onTogglePanel}
        {@const pipelineTitle = isPipelinePanelOpen ? cp.hidePipeline : cp.showPipeline}
        <button
          type="button"
          class="control-panel__toolbar-btn"
          class:control-panel__toolbar-btn--active={isPipelinePanelOpen}
          onclick={onTogglePanel}
          title={pipelineTitle}
          aria-label={pipelineTitle}
        >
          <Icon icon="mdi:source-branch" />
          {cp.pipeline}
        </button>
      {/if}
      {#if getCurrentSession()}
        <button
          type="button"
          class="control-panel__toolbar-btn"
          class:control-panel__toolbar-btn--spinning={isRefreshing}
          onclick={onRefresh}
          disabled={isRefreshing}
          title={cp.refreshTitle}
          aria-label={cp.refreshTitle}
        >
          <Icon icon="mdi:refresh" />
          {cp.refresh}
        </button>
      {/if}
      <button
        type="button"
        class="control-panel__toolbar-btn"
        class:control-panel__toolbar-btn--active={getShowLogs()}
        onclick={() => playgroundActions.toggleShowLogs()}
        title={logsTitle}
        aria-label={logsTitle}
      >
        <Icon icon="mdi:console" />
        {cp.logs}
      </button>
    </div>
  </header>

  <ChatInput
    showTextarea={showChatInput}
    {showRunButton}
    {placeholder}
    {predefinedMessage}
    {onSendMessage}
    {onStopExecution}
  />
</section>

<style>
  .control-panel {
    display: flex;
    flex-direction: column;
    min-height: 0;
    background-color: var(--fd-background);
    border-top: 1px solid var(--fd-border);
  }

  .control-panel__header {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    padding: 0 var(--fd-space-xl);
    height: var(--fd-playground-header-height);
    min-height: var(--fd-playground-header-height);
    border-bottom: 1px solid var(--fd-border);
    flex-shrink: 0;
  }

  :global(.control-panel__icon) {
    font-size: var(--fd-text-base);
    color: var(--fd-muted-foreground);
    flex-shrink: 0;
  }

  .control-panel__label {
    font-size: var(--fd-text-sm);
    font-weight: 600;
    color: var(--fd-foreground);
    flex-shrink: 0;
  }

  .control-panel__session-chip-wrap {
    position: relative;
    flex-shrink: 0;
  }

  .control-panel__session-chip {
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-xs);
    padding: var(--fd-space-3xs) var(--fd-space-sm) var(--fd-space-3xs) var(--fd-space-xs);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-md);
    background: var(--fd-background);
    color: var(--fd-foreground);
    font-size: var(--fd-text-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--fd-transition-fast);
    max-width: 220px;
    line-height: 1;
  }

  .control-panel__session-chip :global(svg) {
    flex-shrink: 0;
    font-size: var(--fd-text-sm);
    color: var(--fd-muted-foreground);
  }

  .control-panel__session-chip:hover,
  .control-panel__session-chip--open {
    background-color: var(--fd-muted);
    border-color: var(--fd-border-strong);
  }

  .control-panel__session-chip-name {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }

  :global(.control-panel__session-chip-chevron) {
    color: var(--fd-muted-foreground);
    flex-shrink: 0;
  }

  .control-panel__session-popover {
    position: absolute;
    bottom: calc(100% + var(--fd-space-xs));
    left: 0;
    z-index: 50;
    min-width: 220px;
    max-width: 300px;
    padding: var(--fd-space-xs);
    background-color: var(--fd-background);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-lg);
    box-shadow: var(--fd-shadow-lg);
  }

  .control-panel__session-popover-divider {
    height: 1px;
    background-color: var(--fd-border-muted);
    margin: var(--fd-space-xs) 0;
  }

  .control-panel__session-popover-row {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .control-panel__session-popover-item {
    display: flex;
    align-items: center;
    gap: var(--fd-space-sm);
    flex: 1;
    min-width: 0;
    padding: var(--fd-space-sm);
    border: none;
    border-radius: var(--fd-radius-sm);
    background: transparent;
    color: var(--fd-foreground);
    font-size: var(--fd-text-sm);
    text-align: left;
    cursor: pointer;
    transition: background-color var(--fd-transition-fast);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .control-panel__session-popover-item :global(svg) {
    flex-shrink: 0;
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-sm);
  }

  .control-panel__session-popover-item span {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .control-panel__session-popover-item:hover {
    background-color: var(--fd-muted);
  }

  .control-panel__session-popover-item:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .control-panel__session-popover-item--new {
    color: var(--fd-primary);
    font-weight: 500;
    width: 100%;
  }

  .control-panel__session-popover-item--new :global(svg) {
    color: var(--fd-primary);
  }

  .control-panel__session-popover-item--active {
    font-weight: 500;
  }

  :global(.control-panel__session-popover-check) {
    color: var(--fd-primary) !important;
  }

  .control-panel__session-popover-delete {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: var(--fd-size-icon-btn);
    height: var(--fd-size-icon-btn);
    border: none;
    border-radius: var(--fd-radius-sm);
    background: transparent;
    color: var(--fd-muted-foreground);
    cursor: pointer;
    opacity: 0;
    transition: all var(--fd-transition-fast);
  }

  .control-panel__session-popover-row:hover .control-panel__session-popover-delete,
  .control-panel__session-popover-row:focus-within .control-panel__session-popover-delete {
    opacity: 1;
  }

  .control-panel__session-popover-delete:hover {
    background-color: var(--fd-error-muted);
    color: var(--fd-error);
    opacity: 1;
  }

  .control-panel__header-actions {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    margin-left: auto;
  }

  .control-panel__toolbar-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-3xs);
    padding: var(--fd-space-3xs) var(--fd-space-sm);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-md);
    background: transparent;
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-xs);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--fd-transition-fast);
    line-height: 1;
  }

  .control-panel__toolbar-btn :global(svg) {
    font-size: var(--fd-text-xs);
  }

  .control-panel__toolbar-btn:hover:not(:disabled) {
    background-color: var(--fd-muted);
    color: var(--fd-foreground);
    border-color: var(--fd-border-strong);
  }

  .control-panel__toolbar-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .control-panel__toolbar-btn--active {
    background-color: var(--fd-primary-muted);
    border-color: var(--fd-primary);
    color: var(--fd-primary);
  }

  .control-panel__toolbar-btn--spinning :global(svg) {
    animation: control-panel-spin 0.8s linear infinite;
  }

  @keyframes control-panel-spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
