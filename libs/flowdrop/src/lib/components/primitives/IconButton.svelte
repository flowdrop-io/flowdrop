<!--
  IconButton primitive — square, icon-only button (variant x size x state).

  `ariaLabel` is required because there is no visible text. `active` renders a
  toggle (aria-pressed). Heights/widths come from --fd-control-sm / -md. The
  legacy `components/IconButton.svelte` is untouched.

  @internal Not exported from any package entry; not public API yet.
-->

<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  interface Props extends Omit<HTMLButtonAttributes, 'children' | 'class' | 'type' | 'title'> {
    /** Visual style */
    variant?: 'ghost' | 'secondary' | 'primary' | 'danger';
    /** Square size: `sm` = 24, `md` = 28 */
    size?: 'sm' | 'md';
    /** Native button type */
    type?: 'button' | 'submit' | 'reset';
    /** Accessible label (required: the button has no visible text) */
    ariaLabel: string;
    /** Toggle state; when set (true or false) the button exposes `aria-pressed` */
    active?: boolean;
    /** Disabled state */
    disabled?: boolean;
    /** Tooltip text */
    title?: string;
    /** Extra classes appended to the root button */
    class?: string;
    /** Click handler */
    onclick?: (event: MouseEvent) => void;
    /** The glyph (icon, inline SVG or character) */
    children: Snippet;
  }

  let {
    variant = 'ghost',
    size = 'md',
    type = 'button',
    ariaLabel,
    active,
    disabled = false,
    title,
    class: className = '',
    onclick,
    children,
    ...rest
  }: Props = $props();
</script>

<button
  {...rest}
  class="flowdrop-ui-icon-button flowdrop-ui-icon-button--{variant} flowdrop-ui-icon-button--{size} {className}"
  class:flowdrop-ui-icon-button--active={active}
  {type}
  {title}
  {disabled}
  aria-label={ariaLabel}
  aria-pressed={active === undefined ? undefined : active}
  {onclick}
>
  {@render children()}
</button>

<style>
  .flowdrop-ui-icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    box-sizing: border-box;
    padding: 0;
    border: 1px solid transparent;
    border-radius: var(--fd-control-radius);
    font-family: inherit;
    line-height: 1;
    cursor: pointer;
    transition:
      background-color var(--fd-transition-fast),
      border-color var(--fd-transition-fast),
      color var(--fd-transition-fast);
  }

  .flowdrop-ui-icon-button--sm {
    width: var(--fd-control-sm);
    height: var(--fd-control-sm);
    font-size: var(--fd-text-xs);
  }

  .flowdrop-ui-icon-button--md {
    width: var(--fd-control-md);
    height: var(--fd-control-md);
    font-size: var(--fd-text-sm);
  }

  .flowdrop-ui-icon-button--ghost {
    background-color: transparent;
    color: var(--fd-muted-foreground);
  }
  .flowdrop-ui-icon-button--ghost:hover:not(:disabled) {
    background-color: var(--fd-muted);
    color: var(--fd-foreground);
  }
  .flowdrop-ui-icon-button--ghost.flowdrop-ui-icon-button--active {
    background-color: var(--fd-primary-muted);
    color: var(--fd-primary);
  }

  .flowdrop-ui-icon-button--secondary {
    background-color: var(--fd-background);
    border-color: var(--fd-border);
    color: var(--fd-foreground);
  }
  .flowdrop-ui-icon-button--secondary:hover:not(:disabled) {
    background-color: var(--fd-muted);
    border-color: var(--fd-border-strong);
  }
  .flowdrop-ui-icon-button--secondary.flowdrop-ui-icon-button--active {
    background-color: var(--fd-primary-muted);
    border-color: var(--fd-primary);
    color: var(--fd-primary);
  }

  .flowdrop-ui-icon-button--primary {
    background-color: var(--fd-primary);
    border-color: var(--fd-primary);
    color: var(--fd-primary-foreground);
  }
  .flowdrop-ui-icon-button--primary:hover:not(:disabled) {
    background-color: var(--fd-primary-hover);
    border-color: var(--fd-primary-hover);
  }
  .flowdrop-ui-icon-button--primary.flowdrop-ui-icon-button--active {
    background-color: var(--fd-primary-hover);
    border-color: var(--fd-primary-hover);
  }

  .flowdrop-ui-icon-button--danger {
    background-color: transparent;
    color: var(--fd-error);
  }
  .flowdrop-ui-icon-button--danger:hover:not(:disabled) {
    background-color: var(--fd-error-muted);
  }
  .flowdrop-ui-icon-button--danger.flowdrop-ui-icon-button--active {
    background-color: var(--fd-error);
    color: var(--fd-error-foreground);
  }

  .flowdrop-ui-icon-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
