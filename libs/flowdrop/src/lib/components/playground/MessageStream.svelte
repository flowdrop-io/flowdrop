<!--
  MessageStream Component

  Renders the playground message feed with interrupt UI inline. No input area.
  This is the shared primitive used by ChatPanel (conversational) and
  ExecutionConsole (workflow runtime surface).

  The empty/welcome state is delegated to consumers via the `welcome` and
  `emptySession` snippets so each wrapper renders context-appropriate copy.
-->

<script lang="ts">
  import { tick, untrack, type Snippet } from 'svelte';
  import MessageBubble from './MessageBubble.svelte';
  import { InterruptBubble } from '../interrupt/index.js';
  import {
    isHiddenMessage,
    resolveMessageDisplay,
    type PlaygroundMessage
  } from '../../types/playground.js';
  import StepsSummary from './StepsSummary.svelte';
  import ActivityRow from '../chat/ActivityRow.svelte';
  import { summarizeSteps, type PendingStep } from './stepSummary.js';
  import { placeVersionDividers } from '../../utils/sessionRuns.js';
  import {
    isInterruptMetadata,
    extractInterruptMetadata,
    metadataToInterrupt
  } from '../../types/interrupt.js';
  import { getInstance } from '../../stores/getInstance.svelte.js';
  import { m } from '$lib/messages/index.js';

  const fd = getInstance();

  interface Props {
    /** Whether to show timestamps on messages */
    showTimestamps?: boolean;
    /** Whether to auto-scroll to bottom on new messages */
    autoScroll?: boolean;
    /** Whether to enable markdown rendering in messages */
    enableMarkdown?: boolean;
    /**
     * Whether this surface is permitted to show log messages.
     * When true, the store's showLogs toggle takes effect.
     * When false (default), only chat messages are ever shown regardless of the toggle.
     * Set to true on execution surfaces (e.g. ExecutionConsole); leave false on pure chat surfaces.
     */
    allowLogs?: boolean;
    /** Render system messages in compact inline form */
    compactSystemMessages?: boolean;
    /** Called when an interrupt is resolved */
    onInterruptResolved?: () => void;
    /**
     * Called when the user scrolls near the top, to load older messages.
     * When omitted, scroll-up paging is disabled (e.g. view-only surfaces).
     */
    onLoadOlder?: () => void | Promise<void>;
    /** Custom render for the no-session welcome state */
    welcome?: Snippet;
    /** Custom render for the empty-session state */
    emptySession?: Snippet;
  }

  let {
    showTimestamps = true,
    autoScroll = true,
    enableMarkdown = true,
    allowLogs = false,
    compactSystemMessages = true,
    onInterruptResolved,
    onLoadOlder,
    welcome,
    emptySession
  }: Props = $props();

  const states = $derived(m().playground.states);

  /** Reference to the messages container for scrolling */
  let messagesContainer = $state<HTMLDivElement | undefined>();

  const displayMessages = $derived(
    allowLogs && fd.playground.showLogs ? fd.playground.messages : fd.playground.chatMessages
  );

  /**
   * What is actually rendered: `display: 'hidden'` rows are dropped. They stay
   * in the store (cursors, interrupt sync) — hiding is about noise, never
   * about secrecy, since the row has already reached the browser.
   */
  const visibleMessages = $derived(displayMessages.filter((msg) => !isHiddenMessage(msg)));

  /**
   * The "Saved, new version" dividers, each keyed by the visible message it
   * follows. Only the conversation (the log toggle never moves one).
   */
  const dividerAfter = $derived(
    placeVersionDividers(fd.playground.versionDividers, fd.playground.messages, visibleMessages)
  );

  /**
   * One row per turn for the node steps. A turn runs from a user message to the
   * next one; its log-layout rows leave the flow and fold into a single summary
   * where the first of them stood. A version divider that followed a folded row
   * stays where it was.
   *
   * A turn with steps also absorbs its run-lifecycle notices ("Calculator User
   * started", a sub-workflow's "completed in 59.1ms"): the steps table already
   * says that. Warnings and errors stay in the flow, and a turn without steps
   * (logs off) keeps its notices.
   */
  type StreamItem =
    | { kind: 'message'; message: PlaygroundMessage }
    | { kind: 'steps'; key: string; logs: PlaygroundMessage[]; pending: PendingStep[] }
    | { kind: 'divider'; afterId: string };

  const rows = $derived.by(() => {
    const isStep = (msg: PlaygroundMessage): boolean =>
      msg.role !== 'user' &&
      !isInterruptMessage(msg) &&
      resolveMessageDisplay(msg, { compactSystemMessages }) === 'log';
    const isLifecycleNotice = (msg: PlaygroundMessage): boolean => {
      const level = msg.metadata?.level;
      return (
        msg.role === 'system' &&
        Boolean(msg.executionId) &&
        level !== 'warning' &&
        level !== 'error' &&
        !isInterruptMessage(msg) &&
        resolveMessageDisplay(msg, { compactSystemMessages }) === 'notice'
      );
    };

    const turnsWithSteps = new Set<number>();
    let turn = 0;
    for (const msg of visibleMessages) {
      if (msg.role === 'user') turn += 1;
      else if (isStep(msg)) turnsWithSteps.add(turn);
    }

    const items: StreamItem[] = [];
    const stepsOfTurn = new Map<number, Extract<StreamItem, { kind: 'steps' }>>();
    turn = 0;
    for (const msg of visibleMessages) {
      if (msg.role === 'user') turn += 1;
      const isInterrupt = isInterruptMessage(msg);
      const step = isStep(msg);
      if (step || (turnsWithSteps.has(turn) && isLifecycleNotice(msg))) {
        let steps = stepsOfTurn.get(turn);
        if (!steps) {
          steps = { kind: 'steps', key: msg.id, logs: [], pending: [] };
          stepsOfTurn.set(turn, steps);
          items.push(steps);
        }
        if (step) steps.logs.push(msg);
        if (dividerAfter.has(msg.id)) items.push({ kind: 'divider', afterId: msg.id });
        continue;
      }
      if (isInterrupt) {
        const interrupt = getInterruptForMessage(msg);
        const steps = stepsOfTurn.get(turn);
        if (steps && interrupt?.status === 'pending') {
          steps.pending.push({
            key: msg.id,
            label: msg.metadata?.nodeLabel ?? interrupt.nodeId ?? m().playground.steps.pendingNode
          });
        }
      }
      items.push({ kind: 'message', message: msg });
    }
    return items;
  });

  /** Turns the person opened (true) or folded (false), against the default. */
  let stepsOverride = $state<Record<string, boolean>>({});

  function isStepsExpanded(key: string): boolean {
    return stepsOverride[key] ?? fd.playground.expandSteps;
  }

  function toggleSteps(key: string): void {
    stepsOverride = { ...stepsOverride, [key]: !isStepsExpanded(key) };
  }

  const lastVisibleId = $derived(visibleMessages.at(-1)?.id);

  let previousMessageCount = 0;
  let userScrolledUp = false;
  let isLoadingOlder = $state(false);
  let topSentinel = $state<HTMLDivElement | undefined>();

  function handleScroll() {
    if (!messagesContainer) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
    userScrolledUp = scrollHeight - scrollTop - clientHeight > 50;
  }

  // Load older messages when the top sentinel scrolls into view. An observer is
  // self-throttling and keeps layout reads off the scroll path; rootMargin
  // pre-fetches the next page slightly before the user reaches the very top.
  $effect(() => {
    if (!topSentinel || !messagesContainer || !onLoadOlder) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadOlder();
      },
      { root: messagesContainer, rootMargin: '300px 0px 0px 0px' }
    );
    observer.observe(topSentinel);
    return () => observer.disconnect();
  });

  /**
   * Fetch the previous page and keep the viewport pinned to the message the
   * user is reading. We anchor on a real DOM node (the first rendered message)
   * and compensate scrollTop by however far it moved — robust against the
   * loading spinner (which is out of flow) and any late reflow above it.
   * A scroll during the in-flight fetch is intentionally overridden so the
   * prepend doesn't shift the reading position.
   */
  async function loadOlder() {
    if (!onLoadOlder || !messagesContainer || isLoadingOlder || !fd.playground.hasOlder) return;

    const anchor = topSentinel?.nextElementSibling as HTMLElement | null;
    const anchorTopBefore = anchor?.getBoundingClientRect().top ?? 0;

    isLoadingOlder = true;
    try {
      await onLoadOlder();
      await tick();
      if (messagesContainer && anchor) {
        const shift = anchor.getBoundingClientRect().top - anchorTopBefore;
        messagesContainer.scrollTop += shift;
      }
    } finally {
      isLoadingOlder = false;
    }
  }

  function isFormFocused(): boolean {
    if (!messagesContainer) return false;
    const activeElement = document.activeElement;
    if (!activeElement) return false;
    const isFormControl =
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.tagName === 'SELECT' ||
      activeElement.tagName === 'BUTTON' ||
      activeElement.getAttribute('contenteditable') === 'true';
    return isFormControl && messagesContainer.contains(activeElement);
  }

  function isInterruptMessage(message: PlaygroundMessage): boolean {
    return isInterruptMetadata(message.metadata as Record<string, unknown> | undefined);
  }

  /**
   * Sync interrupt messages into the interrupt store. Runs in an effect to
   * avoid Svelte 5's state_unsafe_mutation error during render.
   */
  $effect(() => {
    const interruptMessages = displayMessages.filter(isInterruptMessage);

    for (const message of interruptMessages) {
      const existing = fd.interrupts.getByMessageId(message.id);
      if (!existing) {
        const metadata = extractInterruptMetadata(
          message.metadata as Record<string, unknown> | undefined
        );
        if (metadata) {
          const interrupt = metadataToInterrupt(metadata, message.id, message.content);
          fd.interrupts.addInterrupt(interrupt);

          if (message.status === 'completed') {
            fd.interrupts.resolveInterrupt(interrupt.id, metadata.response_value);
          }
        }
      }
    }
  });

  const interruptsByMessageId = $derived(
    new Map(
      Array.from(fd.interrupts.getMap().values())
        .filter((i) => i.messageId)
        .map((i) => [i.messageId, i])
    )
  );

  function getInterruptForMessage(message: PlaygroundMessage) {
    return interruptsByMessageId.get(message.id);
  }

  const showWelcome = $derived(!fd.playground.currentSession && visibleMessages.length === 0);
  const showEmptyChat = $derived(
    fd.playground.currentSession !== null && visibleMessages.length === 0
  );

  // Reset scroll-tracking when session changes
  $effect(() => {
    if (fd.playground.currentSession) {
      userScrolledUp = false;
    }
  });

  $effect(() => {
    const currentCount = visibleMessages.length;

    if (!autoScroll || !messagesContainer) {
      untrack(() => {
        previousMessageCount = currentCount;
      });
      return;
    }

    const hasNewMessage = currentCount > previousMessageCount;
    untrack(() => {
      previousMessageCount = currentCount;
    });

    // Don't chase the bottom while a backward page is landing — loadOlder owns
    // scroll position during a prepend and anchors it to the message in view.
    if (!hasNewMessage || userScrolledUp || isFormFocused() || isLoadingOlder) return;

    tick().then(() => {
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    });
  });
</script>

{#snippet messageRow(message: PlaygroundMessage)}
  {#if isInterruptMessage(message)}
    {@const interrupt = getInterruptForMessage(message)}
    {#if interrupt}
      <InterruptBubble
        {interrupt}
        onResolved={onInterruptResolved}
        hierarchy={message.hierarchy}
        tags={message.tags}
      />
    {/if}
  {:else}
    <MessageBubble
      {message}
      showTimestamp={showTimestamps}
      isLast={message.id === lastVisibleId}
      {enableMarkdown}
      {compactSystemMessages}
    />
  {/if}
{/snippet}

{#snippet dividerRow(afterId: string | undefined)}
  {#if afterId !== undefined && dividerAfter.has(afterId)}
    <div class="message-stream__divider" role="separator" data-testid="version-divider">
      <span>{m().playground.versionDivider}</span>
    </div>
  {/if}
{/snippet}

<div
  class="message-stream"
  role="log"
  aria-label={m().playground.controlPanel.messageStreamLabel}
  bind:this={messagesContainer}
  onscroll={handleScroll}
>
  {#if showWelcome}
    {#if welcome}
      {@render welcome()}
    {/if}
  {:else if showEmptyChat}
    {#if emptySession}
      {@render emptySession()}
    {/if}
  {:else}
    <div bind:this={topSentinel} class="message-stream__sentinel" aria-hidden="true"></div>
    {#if isLoadingOlder}
      <div class="message-stream__loading-older" aria-hidden="true">
        <span class="message-stream__loading-older-spinner"></span>
      </div>
    {/if}
    {#each rows as row (row.kind === 'steps' ? `steps:${row.key}` : row.kind === 'divider' ? `divider:${row.afterId}` : row.message.id)}
      {#if row.kind === 'steps'}
        <StepsSummary
          id="steps-{row.key}"
          summary={summarizeSteps(row.logs, row.pending)}
          expanded={isStepsExpanded(row.key)}
          onToggle={() => toggleSteps(row.key)}
        />
      {:else if row.kind === 'divider'}
        {@render dividerRow(row.afterId)}
      {:else}
        {@render messageRow(row.message)}
        {@render dividerRow(row.message.id)}
      {/if}
    {/each}

    {#if fd.playground.isExecuting}
      <div class="message-stream__typing">
        <ActivityRow status="running" label={states.processing} />
      </div>
    {/if}
  {/if}
</div>

<style>
  .message-stream {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: var(--fd-msg-stream-pad, var(--fd-space-3xl));

    /* Establish a containment context so message rows can adapt to the
       stream's actual width (not the viewport's). */
    container-type: inline-size;
    container-name: fd-message-stream;
  }

  /* "Saved, new version": a hairline with its label, between two turns. */
  .message-stream__divider {
    display: flex;
    align-items: center;
    gap: var(--fd-space-sm);
    margin: var(--fd-space-md) 0;
    font-family: var(--fd-font-mono);
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
  }

  .message-stream__divider::before,
  .message-stream__divider::after {
    content: '';
    flex: 1;
    border-top: 1px dashed var(--fd-border-strong);
  }

  /* Zero-height marker the IntersectionObserver watches to trigger
     backward pagination as it nears the top of the scroll area. */
  .message-stream__sentinel {
    height: 0;
  }

  /* Shared fade-in for newly-appended message rows. `-global-` so
     ChatBubble.svelte / MessageCard.svelte can reference it without
     redeclaring. Honour reduced-motion in the same place. */
  @keyframes -global-fd-fade-in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(.message-bubble),
    :global(.message-card) {
      animation: none;
    }
  }

  /* Overlay, out of flow — its presence must not shift message layout, or it
     would corrupt the scroll anchoring in loadOlder(). */
  .message-stream__loading-older {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--fd-space-sm) 0;
    pointer-events: none;
    z-index: 1;
  }

  .message-stream__loading-older-spinner {
    width: var(--fd-space-lg);
    height: var(--fd-space-lg);
    border: 2px solid var(--fd-border-strong);
    border-top-color: transparent;
    border-radius: var(--fd-radius-full);
    animation: message-stream-spin 0.8s linear infinite;
  }

  @keyframes message-stream-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .message-stream__loading-older-spinner {
      animation: none;
    }
  }

  /* "Processing…" is the same breathing dot + shimmering label as the Assistant's activity rows. */
  .message-stream__typing {
    padding: var(--fd-msg-typing-pad, var(--fd-space-md) var(--fd-space-xl));
    margin-top: var(--fd-space-xs);
  }

  @media (max-width: 640px) {
    .message-stream {
      padding: var(--fd-space-md) 0;
    }
  }
</style>
