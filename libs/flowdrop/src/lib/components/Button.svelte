<!--
  Button — typed wrapper over the Button primitive (`primitives/Button.svelte`).

  Keeps the original public prop API (variants primary/secondary/outline/ghost,
  sizes sm/md/lg) so existing callers are untouched; everything maps onto the
  primitive:  outline -> secondary (bordered surface),  lg -> md.  Heights are
  now the control tokens (sm 24px, md 28px), not the old 28/40/48.

  Internal for now (not exported from any public entry) so the API isn't frozen
  before GA. New code should use the primitive directly.
-->

<script lang="ts">
  import type { Snippet } from 'svelte';
  import PrimitiveButton from './primitives/Button.svelte';

  interface Props {
    /** Visual style — `outline` is mapped onto the primitive's `secondary` */
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    /** Size — `lg` is mapped onto the primitive's `md` */
    size?: 'sm' | 'md' | 'lg';
    /** Native button type */
    type?: 'button' | 'submit' | 'reset';
    /** Tooltip text */
    title?: string;
    /** Accessible label (use when the button is icon-only) */
    ariaLabel?: string;
    /** Disabled state */
    disabled?: boolean;
    /** Extra classes appended to the root button */
    class?: string;
    /** Click handler */
    onclick?: (event: MouseEvent) => void;
    /** Button contents (icon, label, or both) */
    children: Snippet;
  }

  let {
    variant = 'secondary',
    size = 'md',
    type = 'button',
    title,
    ariaLabel,
    disabled = false,
    class: className = '',
    onclick,
    children
  }: Props = $props();

  const mappedVariant = $derived(variant === 'outline' ? 'secondary' : variant);
  const mappedSize = $derived(size === 'sm' ? 'sm' : 'md');
</script>

<PrimitiveButton
  variant={mappedVariant}
  size={mappedSize}
  {type}
  {title}
  {ariaLabel}
  {disabled}
  class={className}
  {onclick}
>
  {@render children()}
</PrimitiveButton>
