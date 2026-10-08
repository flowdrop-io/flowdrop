<!--
  Button primitive — the design-system button (variant x size x state).

  Scoped styles built only on --fd-* tokens; heights come from --fd-control-sm
  (24) / --fd-control-md (28). The focus ring is the library-wide one in
  base.css (never declared here). The legacy `components/Button.svelte` is a thin
  wrapper over this component.

  @internal Not exported from any package entry; not public API yet.
-->

<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  interface Props extends Omit<HTMLButtonAttributes, 'children' | 'class' | 'type' | 'title'> {
    /** Visual style */
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    /** Height: `sm` = --fd-control-sm (24), `md` = --fd-control-md (28) */
    size?: 'sm' | 'md';
    /** Native button type */
    type?: 'button' | 'submit' | 'reset';
    /** Disabled state */
    disabled?: boolean;
    /** Shows a spinner, sets `aria-busy` and blocks activation (stays focusable) */
    loading?: boolean;
    /** Tooltip text */
    title?: string;
    /** Accessible label (needed when the content is only an icon) */
    ariaLabel?: string;
    /** Extra classes appended to the root button */
    class?: string;
    /** Click handler */
    onclick?: (event: MouseEvent) => void;
    /** Icon rendered before the label */
    leadingIcon?: Snippet;
    /** Icon rendered after the label */
    trailingIcon?: Snippet;
    /** Button label */
    children?: Snippet;
  }

  let {
    variant = 'secondary',
    size = 'md',
    type = 'button',
    disabled = false,
    loading = false,
    title,
    ariaLabel,
    class: className = '',
    onclick,
    leadingIcon,
    trailingIcon,
    children,
    ...rest
  }: Props = $props();

  function handleClick(event: MouseEvent): void {
    if (loading) {
      event.preventDefault();
      return;
    }
    onclick?.(event);
  }
</script>

<button
  {...rest}
  class="flowdrop-ui-button flowdrop-ui-button--{variant} flowdrop-ui-button--{size} {className}"
  class:flowdrop-ui-button--loading={loading}
  {type}
  {title}
  {disabled}
  aria-label={ariaLabel}
  aria-busy={loading || undefined}
  onclick={handleClick}
>
  {#if loading}
    <span class="flowdrop-ui-button__spinner" aria-hidden="true"></span>
  {:else if leadingIcon}
    <span class="flowdrop-ui-button__icon" aria-hidden="true">{@render leadingIcon()}</span>
  {/if}
  {#if children}
    <span class="flowdrop-ui-button__label">{@render children()}</span>
  {/if}
  {#if trailingIcon}
    <span class="flowdrop-ui-button__icon" aria-hidden="true">{@render trailingIcon()}</span>
  {/if}
</button>

<style>
  .flowdrop-ui-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--fd-space-2xs);
    box-sizing: border-box;
    border: 1px solid transparent;
    border-radius: var(--fd-control-radius);
    font-family: inherit;
    font-weight: 500;
    line-height: 1;
    white-space: nowrap;
    cursor: pointer;
    user-select: none;
    transition:
      background-color var(--fd-transition-fast),
      border-color var(--fd-transition-fast),
      color var(--fd-transition-fast);
  }

  .flowdrop-ui-button--sm {
    height: var(--fd-control-sm);
    padding: 0 var(--fd-space-xs);
    font-size: var(--fd-text-xs);
  }

  .flowdrop-ui-button--md {
    height: var(--fd-control-md);
    padding: 0 var(--fd-space-md);
    font-size: var(--fd-text-sm);
  }

  .flowdrop-ui-button--primary {
    background-color: var(--fd-primary);
    border-color: var(--fd-primary);
    color: var(--fd-primary-foreground);
  }
  .flowdrop-ui-button--primary:hover:not(:disabled):not(.flowdrop-ui-button--loading) {
    background-color: var(--fd-primary-hover);
    border-color: var(--fd-primary-hover);
  }

  .flowdrop-ui-button--secondary {
    background-color: var(--fd-background);
    border-color: var(--fd-border);
    color: var(--fd-foreground);
  }
  .flowdrop-ui-button--secondary:hover:not(:disabled):not(.flowdrop-ui-button--loading) {
    background-color: var(--fd-muted);
    border-color: var(--fd-border-strong);
  }

  .flowdrop-ui-button--ghost {
    background-color: transparent;
    color: var(--fd-foreground);
  }
  .flowdrop-ui-button--ghost:hover:not(:disabled):not(.flowdrop-ui-button--loading) {
    background-color: var(--fd-muted);
  }

  .flowdrop-ui-button--danger {
    background-color: var(--fd-error);
    border-color: var(--fd-error);
    color: var(--fd-error-foreground);
  }
  .flowdrop-ui-button--danger:hover:not(:disabled):not(.flowdrop-ui-button--loading) {
    background-color: var(--fd-error-hover);
    border-color: var(--fd-error-hover);
  }

  .flowdrop-ui-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .flowdrop-ui-button--loading {
    cursor: progress;
  }

  .flowdrop-ui-button__icon {
    display: inline-flex;
    align-items: center;
  }

  .flowdrop-ui-button__spinner {
    flex: none;
    width: var(--fd-text-xs);
    height: var(--fd-text-xs);
    box-sizing: border-box;
    border: 2px solid color-mix(in srgb, currentColor 30%, transparent);
    border-top-color: currentColor;
    border-radius: var(--fd-radius-full);
    animation: flowdrop-ui-button-spin 0.8s linear infinite;
  }

  @keyframes flowdrop-ui-button-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .flowdrop-ui-button__spinner {
      animation-duration: 2s;
    }
  }
</style>
