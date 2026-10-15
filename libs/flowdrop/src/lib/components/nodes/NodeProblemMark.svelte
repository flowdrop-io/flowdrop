<!--
  @component
  The Doctor's finding on a node, as a status glyph in the card header after the title.

  The tooltip lists the problems; the count is in the accessible name. In the glyph and map
  zoom tiers the header is gone, so the mark moves to the card's top-right corner and is
  scaled up (to 2.2x) to stay visible.

  It reads the node's problems from the `UniversalNode` context (or `problem`) and claims
  them, so `UniversalNode` does not draw its own corner mark.

  **Use it for** a node component that draws its own header.
  **Not for** run status; use `NodeStatusOverlay`.
-->

<script lang="ts">
  import Icon from '@iconify/svelte';
  import { getNodeProblem, type NodeProblem } from '../../utils/nodeProblem.js';

  interface Props {
    /** Overrides the context (UniversalNode's fallback mark). */
    problem?: NodeProblem;
  }

  let { problem: given }: Props = $props();

  const inherited = getNodeProblem();
  const problem = $derived(given ?? inherited);

  const ICONS = {
    error: 'mdi:alert-circle',
    warning: 'mdi:alert',
    info: 'mdi:information'
  } as const;

  $effect(() => {
    if (!problem || given) return;
    problem.claimed = true;
    return () => {
      problem.claimed = false;
    };
  });
</script>

{#if problem?.severity}
  <span
    class="fd-node-problem fd-node-problem--{problem.severity}"
    class:fd-node-problem--corner={!!given}
    role="img"
    aria-label={problem.label}
    title={problem.tooltip}
    data-testid="node-problem"
    data-severity={problem.severity}
  >
    <Icon icon={ICONS[problem.severity]} class="fd-node-problem__icon" />
  </span>
{/if}

<style>
  .fd-node-problem {
    --_c: var(--fd-warning);
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--fd-node-problem-size);
    height: var(--fd-node-problem-size);
    color: var(--_c);
    cursor: default;
  }
  .fd-node-problem--error {
    --_c: var(--fd-error);
  }
  .fd-node-problem--info {
    --_c: var(--fd-info);
  }

  .fd-node-problem :global(.fd-node-problem__icon) {
    width: 100%;
    height: 100%;
  }

  /* A node that draws no header of its own: the mark sits in its top-right corner. */
  .fd-node-problem--corner {
    position: absolute;
    top: var(--fd-space-xs);
    right: var(--fd-space-xs);
    z-index: 999;
  }

  /* Zoom tiers: a fixed multiplier per tier (no zoom maths), so the mark stays
     legible. Outline keeps the mark in the header; glyph and map have no header,
     so it sits in the corner of the card. */
  :global([data-fd-zoom='outline']) .fd-node-problem {
    scale: var(--fd-node-zoom-mark-scale-outline);
    transform-origin: right center;
  }

  :global([data-fd-zoom='glyph']) .fd-node-problem,
  :global([data-fd-zoom='map']) .fd-node-problem {
    position: absolute;
    top: var(--_pm-inset, var(--fd-space-xs));
    right: var(--_pm-inset, var(--fd-space-xs));
    z-index: 999;
    transform-origin: top right;
  }

  :global([data-fd-zoom='glyph']) .fd-node-problem {
    scale: var(--fd-node-zoom-mark-scale-glyph);
  }

  :global([data-fd-zoom='map']) .fd-node-problem {
    scale: var(--fd-node-zoom-mark-scale-map);
  }
</style>
