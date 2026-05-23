<!--
  MessageTagStrip Component

  A flex-wrapped row of MessageTagChips. Encapsulates the layout the four
  message variants used to copy individually.
-->

<script lang="ts">
  import type { MessageTag } from '../../types/playground.js';
  import MessageTagChip from './MessageTagChip.svelte';

  interface Props {
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
