<!--
  NodeTip

  The tooltip and popover of a node card: a port's name, type and help, or the
  full title with the node's description. It is portalled to <body> and placed
  from the anchor's screen rectangle, so it keeps its size at any canvas zoom
  and is never clipped by the node or the canvas transform.

  `tip` variant: an inverted chip for short port help. `pop` variant: a
  surface with a rule, for the node description.
-->

<script lang="ts">
  import { portal } from '../../utils/portal.js';

  interface Props {
    /** The anchor's rectangle on screen. */
    anchor: DOMRect;
    /** Which end of the anchor the tip lines up with. */
    align?: 'start' | 'end';
    variant?: 'tip' | 'pop';
    title: string;
    /** Mono text next to the title (a type, or "kind · id"). */
    code?: string;
    body?: string;
    note?: string;
  }

  let { anchor, align = 'start', variant = 'tip', title, code, body, note }: Props = $props();

  const left = $derived(align === 'start' ? anchor.left : anchor.right);
</script>

<div
  use:portal
  class="fd-node-tip fd-node-tip--{variant}"
  class:fd-node-tip--end={align === 'end'}
  style:left="{left}px"
  style:top="{anchor.bottom + 8}px"
  role="tooltip"
>
  <div class="fd-node-tip__head">
    <b>{title}</b>
    {#if code}<code>{code}</code>{/if}
  </div>
  {#if body}<div class="fd-node-tip__body">{body}</div>{/if}
  {#if note}<small>{note}</small>{/if}
</div>

<style>
  .fd-node-tip {
    position: fixed;
    z-index: 1000;
    max-width: 260px;
    padding: var(--fd-space-xs) var(--fd-space-md);
    border-radius: var(--fd-radius-md);
    box-shadow: var(--fd-shadow-lg);
    font-size: var(--fd-text-meta);
    line-height: 1.45;
    pointer-events: none;
    background: var(--fd-foreground);
    color: var(--fd-background);
  }

  .fd-node-tip--end {
    transform: translateX(-100%);
  }

  .fd-node-tip--pop {
    max-width: 300px;
    padding: var(--fd-space-md);
    background: var(--fd-card);
    color: var(--fd-foreground);
    border: 1px solid var(--fd-border);
  }

  .fd-node-tip b {
    font-weight: 600;
  }

  .fd-node-tip code {
    margin-left: var(--fd-space-xs);
    font-family: var(--fd-font-mono);
    font-size: var(--fd-text-meta);
    opacity: 0.7;
  }

  .fd-node-tip--pop code {
    display: block;
    margin: 0;
  }

  .fd-node-tip__body {
    margin-top: var(--fd-space-3xs, 2px);
  }

  .fd-node-tip small {
    display: block;
    margin-top: var(--fd-space-2xs);
    font-size: var(--fd-text-meta);
    opacity: 0.7;
  }
</style>
