<!--
  @component
  One message of the Playground conversation. It picks the layout from the server's `display` hint, or from the
  role when there is none: `bubble` for user and assistant, `log` for steps, `notice` for system lines, `card` for
  a message that needs room.

  The skin changes how the bubble layout looks. Graphite (the editor default) uses the document layout: replies
  sit straight on the page and a light line of meta text follows. Other skins draw an avatar and a bubble.

  **Use it for** one message anywhere in the Playground.
  **Not for** a whole conversation (use `MessageStream`, which also folds steps and shows questions).
-->

<script lang="ts">
  import { resolveMessageDisplay, type PlaygroundMessage } from '../../types/playground.js';
  import ChatBubble from './ChatBubble.svelte';
  import LogRow from './LogRow.svelte';
  import MessageNotice from './MessageNotice.svelte';
  import MessageCard from './MessageCard.svelte';

  interface Props {
    /** The message to draw. */
    message: PlaygroundMessage;
    /** Show the time of the message. @default true */
    showTimestamp?: boolean;
    /** This is the newest message; a layout may mark it. @default false */
    isLast?: boolean;
    /** Draw markdown (lists, bold, code). @default true */
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
