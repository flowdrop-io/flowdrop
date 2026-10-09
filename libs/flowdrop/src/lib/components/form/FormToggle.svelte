<!--
  FormToggle Component
  Toggle switch for boolean values
  
  Features:
  - Smooth toggle animation
  - No state word on screen; the state is the track colour. On/Off labels
    stay as the switch's accessible name
  - Focus-visible states for keyboard navigation
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
    /** Whether the field is disabled (read-only) */
    disabled?: boolean;
    /** ARIA description ID */
    ariaDescribedBy?: string;
    /** Callback when value changes */
    onChange: (value: boolean) => void;
  }

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
