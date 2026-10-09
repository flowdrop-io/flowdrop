<!--
  ConsoleStrip — the slim bar along the canvas's bottom edge that opens the
  Command Console. Closed, it is the whole control ("›_ Console"; the ` shortcut
  is in its tooltip); open, it
  becomes the panel's header, so the panel needs no close button of its own.
  One button: `aria-expanded` says which, `aria-controls` names the panel.
-->

<script lang="ts">
  import { getMessages } from '../../messages/context.js';
  import Button from '../primitives/Button.svelte';

  interface Props {
    /** The panel is open. */
    open?: boolean;
    /** Id of the element the strip opens, for `aria-controls`. */
    controls: string;
    /** Name of the surface the strip opens. */
    label?: string;
    /** Toggle the panel. */
    onToggle: () => void;
  }

  let { open = false, controls, label, onToggle }: Props = $props();

  const getMsgs = getMessages();
  const layout = $derived(getMsgs().layout);
</script>

<div class="console-strip-host">
  <Button
    variant="ghost"
    size="sm"
    class="console-strip {open ? 'console-strip--open' : ''}"
    aria-expanded={open}
    aria-controls={controls}
    aria-keyshortcuts="`"
    title={layout.consoleStripHint}
    data-testid="console-strip"
    onclick={onToggle}
  >
    <span class="console-strip__prompt" aria-hidden="true">›_</span>
    <span class="console-strip__label">{label ?? layout.consoleStrip}</span>
  </Button>
</div>

<style>
  /* The primitive owns the button; the strip only reshapes it into a full-width bar. */
  .console-strip-host :global(.console-strip) {
    justify-content: flex-start;
    gap: var(--fd-space-xs);
    width: 100%;
    height: var(--fd-console-strip-height);
    padding: 0 var(--fd-space-sm);
    border-radius: 0;
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-meta);
    font-weight: normal;
    text-align: left;
  }

  .console-strip-host :global(.console-strip:hover) {
    background-color: var(--fd-muted);
    color: var(--fd-foreground);
  }

  /* Open, it is a heading: the label reads at full strength. */
  .console-strip-host :global(.console-strip--open) {
    color: var(--fd-foreground);
  }

  .console-strip__prompt {
    font-family: var(--fd-font-mono);
    color: var(--fd-accent);
  }

  .console-strip__label {
    font-weight: 500;
  }
</style>
