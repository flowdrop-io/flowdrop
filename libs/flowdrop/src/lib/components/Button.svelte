<!--
  @component
  **Legacy.** Use the primitive Button (`components/primitives/Button.svelte`) instead.

  A thin wrapper over the primitive that keeps the original prop API. It maps onto the
  primitive: `outline` becomes `secondary`, and `lg` becomes `md`. So Outline looks the same
  as Secondary, and Large the same as Medium. Heights are the control tokens (sm 24px, md 28px).

  Not exported from the package. New code should use the primitive, which also has `loading`,
  icons and the `danger` variants.
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
