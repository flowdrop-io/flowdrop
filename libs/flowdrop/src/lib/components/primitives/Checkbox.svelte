<!--
  Checkbox — a 16px box with a check, replacing the native control.

  A real checkbox underneath (keyboard, forms, screen readers). The label is
  optional: pass `label` for visible text, or `ariaLabel` when the row around it
  already names it.

  @internal Not exported from any package entry; the API may still change.
-->

<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLInputAttributes } from 'svelte/elements';

  interface Props extends Omit<HTMLInputAttributes, 'type' | 'checked' | 'onchange' | 'class'> {
    /** Current state. */
    checked: boolean;
    /** Visible label text, as a snippet or a string. */
    label?: Snippet | string;
    /** Called with the new state. */
    onchange?: (checked: boolean) => void;
    /** Extra classes on the root. */
    class?: string;
  }

  let {
    checked = false,
    label,
    onchange,
    class: className = '',
    disabled = false,
    ...rest
  }: Props = $props();
</script>

<label class="flowdrop-ui-checkbox {className}" class:flowdrop-ui-checkbox--disabled={disabled}>
  <input
    {...rest}
    type="checkbox"
    class="flowdrop-ui-checkbox__input"
    {checked}
    {disabled}
    onchange={(event) => onchange?.(event.currentTarget.checked)}
  />
  <span class="flowdrop-ui-checkbox__box" aria-hidden="true">
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M4 8.5l2.5 2.5L12 5.5" />
    </svg>
  </span>
  {#if typeof label === 'string'}
    <span class="flowdrop-ui-checkbox__label">{label}</span>
  {:else if label}
    <span class="flowdrop-ui-checkbox__label">{@render label()}</span>
  {/if}
</label>

<style>
  .flowdrop-ui-checkbox {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-xs);
    min-width: 0;
    cursor: pointer;
    color: var(--fd-foreground);
    font-size: var(--fd-text-body);
  }

  .flowdrop-ui-checkbox--disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .flowdrop-ui-checkbox__input {
    position: absolute;
    z-index: 1;
    top: 50%;
    left: 0;
    width: var(--fd-checkbox-size);
    height: var(--fd-checkbox-size);
    margin: calc(var(--fd-checkbox-size) / -2) 0 0;
    opacity: 0;
    cursor: inherit;
  }

  .flowdrop-ui-checkbox__box {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: var(--fd-checkbox-size);
    height: var(--fd-checkbox-size);
    border: 1px solid var(--fd-field-border-color);
    border-radius: var(--fd-checkbox-radius);
    background-color: var(--fd-background);
    color: var(--fd-checkbox-on-fg);
    transition:
      background-color var(--fd-transition-fast),
      border-color var(--fd-transition-fast);
  }

  .flowdrop-ui-checkbox__box svg {
    width: 100%;
    height: 100%;
    opacity: 0;
  }

  .flowdrop-ui-checkbox__input:checked + .flowdrop-ui-checkbox__box {
    background-color: var(--fd-checkbox-on-bg);
    border-color: var(--fd-checkbox-on-bg);
  }

  .flowdrop-ui-checkbox__input:checked + .flowdrop-ui-checkbox__box svg {
    opacity: 1;
  }

  .flowdrop-ui-checkbox__input:focus-visible + .flowdrop-ui-checkbox__box {
    outline: var(--fd-ring-width) solid var(--fd-ring);
    outline-offset: var(--fd-ring-offset);
  }

  .flowdrop-ui-checkbox__label {
    min-width: 0;
    line-height: 1.4;
  }
</style>
