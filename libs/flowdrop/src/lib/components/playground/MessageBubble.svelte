<!--
  MessageBubble — dispatches to a per-layout component based on the server's
  `display` hint (falling back to a role-based default via resolveMessageDisplay).

  Each layout lives in its own file:
    bubble → ChatBubble
    log    → LogRow
    notice → MessageNotice
    card   → MessageCard
-->

<script lang="ts">
  import { resolveMessageDisplay, type PlaygroundMessage } from '../../types/playground.js';
  import ChatBubble from './ChatBubble.svelte';
  import LogRow from './LogRow.svelte';
  import MessageNotice from './MessageNotice.svelte';
  import MessageCard from './MessageCard.svelte';

  interface Props {
    message: PlaygroundMessage;
    showTimestamp?: boolean;
    isLast?: boolean;
    enableMarkdown?: boolean;
    /**
     * Use compact display mode for system messages.
     * When true (default), system messages without an explicit `display`
     * default to the 'notice' layout instead of 'bubble'.
     */
    compactSystemMessages?: boolean;
  }

  let {
    message,
    showTimestamp = true,
    isLast = false,
    enableMarkdown = true,
    compactSystemMessages = true
  }: Props = $props();

  const display = $derived(resolveMessageDisplay(message, { compactSystemMessages }));
</script>

{#if display === 'log'}
  <LogRow {message} {showTimestamp} />
{:else if display === 'notice'}
  <MessageNotice {message} {showTimestamp} {isLast} />
{:else if display === 'card'}
  <MessageCard {message} {showTimestamp} {isLast} {enableMarkdown} />
{:else}
  <ChatBubble {message} {showTimestamp} {isLast} {enableMarkdown} />
{/if}
