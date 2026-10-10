<!--
  InterfaceTag

  The `[id · Type>` glyph of a workflow-interface entry: a type swatch, the id
  in mono and the type in muted text, in a tag that points right (the canvas's
  direction of flow). One glyph for the canvas, the Ports tab and the Interface
  tab, so a published port reads the same everywhere.

  - `mismatch`: the entry declares another type than its bound port. The
    outline turns amber and the type reads "Array ≠ String".
  - `ghost`: a name being typed. Dashed outline in the ring colour; pass the
    input as `children`.
  - `compact`: far zoom (the editor sets it through the `data-fd-zoom` tier; the prop forces it). The text drops, the shape and swatch stay.

  A view only: the data stays in `workflow.interface`. Ids longer than
  `INTERFACE_TAG_MAX_ID_CHARS` are shortened; the full id is the tooltip.
  Styled with BEM syntax, from the `--fd-iface-tag-*` tokens.
-->

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { truncateInterfaceId } from '$lib/utils/interfaceTags.js';

  interface Props {
    id: string;
    /** The type text: "String", or "Array ≠ String" with `mismatch`. */
    typeText?: string;
    /** Swatch colour (a CSS colour or token reference). */
    color?: string;
    mismatch?: boolean;
    ghost?: boolean;
    compact?: boolean;
    /** Replaces the id and type text (an input, for a ghost). */
    children?: Snippet;
    title?: string;
    class?: string;
    [key: string]: unknown;
  }

  const {
    id,
    typeText,
    color,
    mismatch = false,
    ghost = false,
    compact = false,
    children,
    title,
    class: className = '',
    ...rest
  }: Props = $props();
</script>

<span
  class="fd-iface-tag {className}"
  class:fd-iface-tag--mismatch={mismatch}
  class:fd-iface-tag--ghost={ghost}
  class:fd-iface-tag--compact={compact}
  title={title ?? (typeText ? `${id} · ${typeText}` : id)}
  {...rest}
>
  <span class="fd-iface-tag__body">
    <span class="fd-iface-tag__swatch" style:--_swatch={color} aria-hidden="true"></span>
    {#if children}
      {@render children()}
    {:else}
      <span class="fd-iface-tag__id">{truncateInterfaceId(id)}</span>
      {#if typeText}<span class="fd-iface-tag__type">{typeText}</span>{/if}
    {/if}
  </span>
  <svg
    class="fd-iface-tag__tip"
    viewBox="0 0 8 18"
    preserveAspectRatio="none"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M0 .5 L7.2 9 L0 17.5" vector-effect="non-scaling-stroke" />
  </svg>
</span>

<style>
  .fd-iface-tag {
    --_stroke: var(--fd-iface-tag-border);
    --_bg: var(--fd-iface-tag-bg);
    display: inline-flex;
    flex: none;
    height: var(--fd-iface-tag-height);
    color: var(--fd-foreground);
    white-space: nowrap;
    line-height: 1;
  }

  .fd-iface-tag--mismatch {
    --_stroke: var(--fd-warning);
    --_bg: var(--fd-warning-muted);
  }

  .fd-iface-tag--ghost {
    --_stroke: var(--fd-ring);
  }

  .fd-iface-tag__body {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-3xs);
    box-sizing: border-box;
    height: 100%;
    padding: 0 var(--fd-space-3xs) 0 var(--fd-space-xs);
    background-color: var(--_bg);
    border: 1px solid var(--_stroke);
    border-right: 0;
    border-radius: var(--fd-radius-sm) 0 0 var(--fd-radius-sm);
  }

  .fd-iface-tag--ghost .fd-iface-tag__body {
    border-style: dashed;
  }

  .fd-iface-tag__swatch {
    flex: none;
    width: 6px;
    height: 6px;
    border-radius: calc(var(--fd-radius-sm) / 2);
    background-color: var(--_swatch, var(--fd-muted-foreground));
  }

  .fd-iface-tag__id {
    font-family: var(--fd-font-mono);
    font-size: var(--fd-iface-tag-id-size);
  }

  .fd-iface-tag__type {
    margin-left: var(--fd-space-3xs);
    font-size: var(--fd-iface-tag-type-size);
    color: var(--fd-muted-foreground);
  }

  .fd-iface-tag--mismatch .fd-iface-tag__type {
    color: var(--fd-foreground);
  }

  /* Far zoom: the shape and swatch stay, the text goes. The id keeps its room
     so the tag does not change width when the zoom crosses the threshold. */
  .fd-iface-tag--compact .fd-iface-tag__id,
  :global([data-fd-zoom='glyph']) .fd-iface-tag__id,
  :global([data-fd-zoom='map']) .fd-iface-tag__id {
    visibility: hidden;
  }

  .fd-iface-tag--compact .fd-iface-tag__type,
  :global([data-fd-zoom='glyph']) .fd-iface-tag__type,
  :global([data-fd-zoom='map']) .fd-iface-tag__type {
    display: none;
  }

  .fd-iface-tag__tip {
    flex: none;
    display: block;
    width: 8px;
    height: 100%;
    fill: var(--_bg);
    stroke: var(--_stroke);
    stroke-width: 1px;
    stroke-linecap: round;
    stroke-linejoin: round;
    overflow: visible;
  }

  .fd-iface-tag--ghost .fd-iface-tag__tip {
    stroke-dasharray: 3 2;
  }
</style>
