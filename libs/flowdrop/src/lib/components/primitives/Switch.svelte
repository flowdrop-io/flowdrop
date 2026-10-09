<!--
  Switch — an on/off control (28×16 track, round thumb).

  A real checkbox with `role="switch"`, so keyboard, form and screen-reader
  behaviour come from the browser. No state word: the on state is the track
  colour and `aria-checked`. Name it with `label` (visually hidden) or by
  putting it inside / next to a <label for={id}>.

  @internal Not exported from any package entry; the API may still change.
-->

<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  interface Props extends Omit<HTMLInputAttributes, 'type' | 'checked' | 'onchange' | 'class'> {
    /** Current state. */
    checked: boolean;
    /** Accessible name when no <label> points at the switch. Hidden visually. */
    label?: string;
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

<span class="flowdrop-ui-switch {className}">
  <input
    {...rest}
    type="checkbox"
    role="switch"
    class="flowdrop-ui-switch__input"
    {checked}
    {disabled}
    aria-checked={checked}
    aria-label={label ?? rest['aria-label']}
    onchange={(event) => onchange?.(event.currentTarget.checked)}
  />
  <span class="flowdrop-ui-switch__track" aria-hidden="true">
    <span class="flowdrop-ui-switch__thumb"></span>
  </span>
</span>

<style>
  .flowdrop-ui-switch {
    position: relative;
    display: inline-flex;
    flex-shrink: 0;
    vertical-align: middle;
  }

  /* The input covers the track so the whole switch is the hit area. */
  .flowdrop-ui-switch__input {
    position: absolute;
    inset: 0;
    z-index: 1;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }

  .flowdrop-ui-switch__input:disabled {
    cursor: not-allowed;
  }

  .flowdrop-ui-switch__track {
    position: relative;
    width: var(--fd-switch-width);
    height: var(--fd-switch-height);
    border-radius: var(--fd-radius-full);
    background-color: var(--fd-switch-off-bg);
    transition: background-color var(--fd-transition-fast);
  }

  .flowdrop-ui-switch__thumb {
    position: absolute;
    top: var(--fd-switch-inset);
    left: var(--fd-switch-inset);
    width: calc(var(--fd-switch-height) - 2 * var(--fd-switch-inset));
    height: calc(var(--fd-switch-height) - 2 * var(--fd-switch-inset));
    border-radius: var(--fd-radius-full);
    background-color: var(--fd-switch-thumb-bg);
    transition: transform var(--fd-transition-fast);
  }

  .flowdrop-ui-switch__input:checked + .flowdrop-ui-switch__track {
    background-color: var(--fd-switch-on-bg);
  }

  .flowdrop-ui-switch__input:checked + .flowdrop-ui-switch__track .flowdrop-ui-switch__thumb {
    transform: translateX(calc(var(--fd-switch-width) - var(--fd-switch-height)));
  }

  .flowdrop-ui-switch__input:disabled + .flowdrop-ui-switch__track {
    opacity: 0.5;
  }

  .flowdrop-ui-switch__input:focus-visible + .flowdrop-ui-switch__track {
    outline: var(--fd-ring-width) solid var(--fd-ring);
    outline-offset: var(--fd-ring-offset);
  }
</style>
