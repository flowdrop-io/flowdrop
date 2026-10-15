<!--
  @component
  A switch for a true or false value. It shows no state word; the track colour is the state.
  The on and off labels are only its accessible name.

  **Use it for** on or off options. The factory picks it for `type: "boolean"`.
  **Not for** choosing several items from a list (use `FormCheckboxGroup`).
-->

<script lang="ts">
  import { m } from '$lib/messages/index.js';
  import Switch from '../primitives/Switch.svelte';

  interface Props {
    /** Field identifier */
    id: string;
    /** Current value */
    value: boolean;
    /**
     * Per-instance label for the on state (e.g. "Hidden" for a visibility
     * toggle). Falls back to the global `messages.form.toggle.enabled`.
     */
    onLabel?: string;
    /**
     * Per-instance label for the off state. Falls back to the global
     * `messages.form.toggle.disabled`.
     */
    offLabel?: string;
    /**
     * @deprecated No effect: the switch no longer renders its state word (the state is the
     * track colour; the label is the accessible name only), which is what `hideLabel` asked
     * for in 2.11.0. Accepted so existing hosts keep compiling. Removed in 3.0.
     */
    hideLabel?: boolean;
    /** Whether the field is disabled (read-only) */
    disabled?: boolean;
    /** ARIA description ID */
    ariaDescribedBy?: string;
    /** Callback when value changes */
    onChange: (value: boolean) => void;
  }

  // eslint-disable-next-line svelte/no-unused-props -- `hideLabel` is a deprecated no-op kept for hosts
  let {
    id,
    value = false,
    onLabel,
    offLabel,
    disabled = false,
    ariaDescribedBy,
    onChange
  }: Props = $props();

  const resolvedOnLabel = $derived(onLabel ?? m().form.toggle.enabled);
  const resolvedOffLabel = $derived(offLabel ?? m().form.toggle.disabled);
</script>

<Switch
  {id}
  checked={value}
  label={value ? resolvedOnLabel : resolvedOffLabel}
  {disabled}
  aria-describedby={ariaDescribedBy}
  onchange={onChange}
/>
