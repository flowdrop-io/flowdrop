<!--
  @component
  A small chip that names which part posted a message (engine, playground or interrupt).
  The user sees it beside a message's name. It shows nothing for user or workflow messages, or when the server sends no `origin`. Colours follow the surrounding text, so it reads on any bubble background.

  **Use it for** telling system sources apart in the feed.
  **Not for** the message text or tags; use `MessageMarkdown` or `MessageTagStrip` instead.
-->

<script lang="ts">
  import type { PlaygroundMessage } from '../../types/playground.js';
  import { getOriginBadge } from './messageDisplay.js';
  import { m } from '$lib/messages/index.js';

  interface Props {
    /** The message whose `origin` to show. */
    message: Pick<PlaygroundMessage, 'origin'>;
  }

  let { message }: Props = $props();

  const origin = $derived(getOriginBadge(message));
  const labels = $derived(m().playground.origins);
</script>

{#if origin}
  <span
    class="origin-badge origin-badge--{origin}"
    title={labels.postedBy({ origin: labels[origin] })}
    data-origin={origin}>{labels[origin]}</span
  >
{/if}

<style>
  .origin-badge {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    padding: 0 0.3125rem;
    border: 1px solid currentColor;
    border-radius: var(--fd-radius-sm);
    font-size: 0.625rem;
    font-weight: 500;
    line-height: 1.4;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    opacity: 0.6;
    color: inherit;
    background-color: transparent;
  }
</style>
