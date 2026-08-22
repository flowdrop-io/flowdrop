<!--
  One port's label row: shape symbol, port name, lane chip.

  The single home for a treatment that was duplicated character-for-character
  between WorkflowNode's input and output blocks, and approximated again in
  GatewayNode. Inputs read `[symbol] Name (lane)`; outputs mirror the order so
  the symbols line up as a column beside their handles.

  Layout lives here rather than on the node's scoped utility classes, because
  Svelte's scoped CSS does not reach into a child component. That is also why
  `active` is a boolean rather than a caller-supplied class name: a gateway
  passing its own `.text--active` down would hand over a class Svelte never
  scopes to this component, and the rule would silently not apply.

  The row is deliberately NOT reused by the inspector's port list (FormPorts):
  that row is a flat list item carrying reorder buttons, a bound-link marker and
  an exposure toggle, laid out by its own flex with its own gaps. It shares the
  two chips, which is the part that must agree; nesting this row inside it would
  buy an invariant it does not need (it is left-aligned) at the cost of its
  spacing.
-->

<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { PortCompatibilityChecker } from '../../utils/connections.js';
  import PortShapeSymbol from './PortShapeSymbol.svelte';
  import PortLaneChip from './PortLaneChip.svelte';

  interface Props {
    checker: PortCompatibilityChecker;
    /**
     * The port to draw. Structural rather than a `NodePort`, for the same reason
     * as PortShapeSymbol's: a gateway branch is an authored control-flow path,
     * not a port, and should not have to fabricate an id to be rendered. An
     * absent id simply never matches the reserved `error` output.
     */
    port: { id?: string; type?: string; dataType: string; name?: string; required?: boolean };
    /**
     * `left` for input rows, `right` for output rows — which mirrors the order
     * and pushes the row to the node edge.
     */
    align?: 'left' | 'right';
    /** Row text, when it is not the port's own name (a branch's label). */
    label?: string;
    /**
     * The row's path was taken in the last run — draws the label in the success
     * colour. A boolean and not a class name: see the note above.
     */
    active?: boolean;
    /** Show the required marker when the port is required. Input rows only. */
    showRequired?: boolean;
    /** Wording of the required marker, so callers keep control of it. */
    requiredLabel?: string;
    /**
     * Rendered at the row's leading edge, outside the mirrored group — an
     * execution marker, say. Stays put in both alignments, so it never lands
     * between the name and its chips.
     */
    leading?: Snippet;
  }

  let {
    checker,
    port,
    align = 'left',
    label,
    active = false,
    showRequired = false,
    requiredLabel = 'Required',
    leading
  }: Props = $props();

  const text = $derived(label ?? port.name ?? '');
</script>

<div class="fd-port-label" class:fd-port-label--right={align === 'right'}>
  {@render leading?.()}
  {#if align === 'right'}
    <PortLaneChip {checker} {port} />
    <span class="fd-port-label__name" class:fd-port-label__name--active={active}>{text}</span>
    <PortShapeSymbol {checker} {port} />
  {:else}
    <PortShapeSymbol {checker} {port} />
    <span class="fd-port-label__name" class:fd-port-label__name--active={active}>{text}</span>
    <PortLaneChip {checker} {port} />
    {#if showRequired && port.required}
      <span class="flowdrop-badge flowdrop-badge--sm fd-port-label__required">{requiredLabel}</span>
    {/if}
  {/if}
</div>

<style>
  /* One 20px canvas grid row, so the handle positioned at that offset lines
     up with the label. Harmless where there is no grid (the inspector). */
  .fd-port-label {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    min-width: 0;
    min-height: var(--fd-node-port-row-height);
  }

  .fd-port-label--right {
    justify-content: flex-end;
  }

  /* Ellipsize a long port name rather than widen the node. The name absorbs
     the row's slack, which is what puts the shape symbol and the lane chip at
     opposite ends: the symbols read as one column against the node edge beside
     their handles, the chips as a second column against the node's inside. */
  .fd-port-label__name {
    flex: 1 1 auto;
    min-width: 0;
    font-size: var(--fd-text-xs);
    line-height: 16px;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .fd-port-label__name--active {
    color: var(--fd-success);
    font-weight: 600;
  }

  /* Matches the solid error badge the node components already drew. */
  .fd-port-label__required {
    flex: none;
    background-color: var(--fd-error);
    color: var(--fd-error-foreground);
  }
</style>
