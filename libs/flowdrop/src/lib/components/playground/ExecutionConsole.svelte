<!--
  ExecutionConsole Component

  The running workflow's runtime surface. Renders the message feed via
  MessageStream and surfaces the flow's own UI (interrupts) inline during
  execution. This is *not* a chat — it's the console where the flow speaks
  to the user during a run. User-initiated commands live in ControlPanel.
-->

<script lang="ts">
  import Icon from '@iconify/svelte';
  import MessageStream from './MessageStream.svelte';
  import { m } from '$lib/messages/index.js';

  interface Props {
    showTimestamps?: boolean;
    autoScroll?: boolean;
    enableMarkdown?: boolean;
    /** Whether log messages can appear when the user toggle is on. Defaults to true for the execution console. */
    allowLogs?: boolean;
    compactSystemMessages?: boolean;
    onInterruptResolved?: () => void;
    /** Optional callback that, when provided, shows a "New session" CTA in the welcome state */
    onCreateSession?: () => void;
    /** Called when the user scrolls near the top to load older messages */
    onLoadOlder?: () => void | Promise<void>;
  }

  let {
    showTimestamps = true,
    autoScroll = true,
    enableMarkdown = true,
    allowLogs = true,
    compactSystemMessages = true,
    onInterruptResolved,
    onCreateSession,
    onLoadOlder
  }: Props = $props();

  const ec = $derived(m().playground.executionConsole);
</script>

<section class="execution-console">
  <header class="execution-console__header">
    <Icon icon="mdi:console-line" class="execution-console__icon" />
    <span class="execution-console__title">{ec.header}</span>
  </header>

  <MessageStream
    {showTimestamps}
    {autoScroll}
    {enableMarkdown}
    {allowLogs}
    {compactSystemMessages}
    {onInterruptResolved}
    {onLoadOlder}
    welcome={welcomeState}
    emptySession={readyState}
  />
</section>

{#snippet welcomeState()}
  <div class="execution-console__placeholder">
    <Icon icon="mdi:play-circle-outline" class="execution-console__placeholder-icon" />
    <h2 class="execution-console__placeholder-title">{ec.noExecutionTitle}</h2>
    <p class="execution-console__placeholder-text">{ec.noExecutionText}</p>
    {#if onCreateSession}
      <button type="button" class="execution-console__cta" onclick={onCreateSession}>
        <Icon icon="mdi:plus" />
        {ec.newSession}
      </button>
    {/if}
  </div>
{/snippet}

{#snippet readyState()}
  <div class="execution-console__placeholder">
    <Icon icon="mdi:play-circle-outline" class="execution-console__placeholder-icon" />
    <h2 class="execution-console__placeholder-title">{ec.readyTitle}</h2>
    <p class="execution-console__placeholder-text">{ec.readyText}</p>
  </div>
{/snippet}

<style>
  .execution-console {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background-color: var(--fd-background);
  }

  .execution-console__header {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    padding: 0 var(--fd-space-xl);
    height: var(--fd-playground-header-height);
    min-height: var(--fd-playground-header-height);
    border-bottom: 1px solid var(--fd-border);
    flex-shrink: 0;
  }

  :global(.execution-console__icon) {
    font-size: var(--fd-text-base);
    color: var(--fd-muted-foreground);
    flex-shrink: 0;
  }

  .execution-console__title {
    font-size: var(--fd-text-sm);
    font-weight: 600;
    color: var(--fd-foreground);
  }

  .execution-console__placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;
    padding: var(--fd-space-4xl);
    color: var(--fd-muted-foreground);
  }

  :global(.execution-console__placeholder-icon) {
    font-size: var(--fd-space-6xl);
    color: var(--fd-border-strong);
    margin-bottom: var(--fd-space-xl);
  }

  .execution-console__placeholder-title {
    font-size: var(--fd-text-xl);
    font-weight: 600;
    color: var(--fd-foreground);
    margin: 0 0 var(--fd-space-xs) 0;
  }

  .execution-console__placeholder-text {
    font-size: var(--fd-text-sm);
    color: var(--fd-muted-foreground);
    margin: 0;
    max-width: 360px;
  }

  .execution-console__cta {
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-xs);
    margin-top: var(--fd-space-2xl);
    padding: var(--fd-space-sm) var(--fd-space-xl);
    border: none;
    border-radius: var(--fd-radius-md);
    background: var(--fd-primary);
    color: var(--fd-primary-foreground);
    font-size: var(--fd-text-base);
    font-weight: 500;
    cursor: pointer;
    transition: opacity var(--fd-transition-fast);
  }

  .execution-console__cta:hover {
    opacity: 0.9;
  }
</style>
