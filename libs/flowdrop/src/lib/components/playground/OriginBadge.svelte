<!--
  OriginBadge — small, subtle chip naming which component posted a message
  (engine, playground, interrupt). Renders nothing for user/workflow rows or
  rows from servers that do not send `origin`. Colours come from currentColor
  so the chip reads on any bubble background (user bubbles are primary-bg).
-->

<script lang="ts">
  import type { PlaygroundMessage } from '../../types/playground.js';
  import { getOriginBadge } from './messageDisplay.js';
  import { m } from '$lib/messages/index.js';

  interface Props {
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
