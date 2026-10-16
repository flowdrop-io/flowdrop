<!--
  @component
  A wrapping row of message tags.
  The user sees it under a message that carries tags, and nothing when there are none. It holds the layout that the message types used to copy each.

  **Use it for** all the tags of one message.
  **Not for** a single tag; use `MessageTagChip` instead.
-->

<script lang="ts">
  import type { MessageTag } from '../../types/playground.js';
  import MessageTagChip from './MessageTagChip.svelte';

  interface Props {
    /** The server-sent tags to show, in order. */
    tags: MessageTag[];
  }

  let { tags }: Props = $props();
</script>

{#if tags.length > 0}
  <!-- No role/label — each chip is already labelled (via tag.type when set)
       and a one-element group adds nothing for AT users. -->
  <span class="message-tag-strip">
    {#each tags as tag (tag.id)}
      <MessageTagChip {tag} />
    {/each}
  </span>
{/if}

<style>
  .message-tag-strip {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--fd-space-2xs);
    min-width: 0;
  }
</style>
