<!--
  Button — typed wrapper over the shared `.flowdrop-btn` system (base.css).

  All button styling (variants, sizes, the --fd-size-btn-min height token and the
  centralized focus ring) lives in base.css. This component is the ergonomic,
  type-safe entry point so callers pick `variant`/`size` instead of hand-writing
  class strings — the single place new buttons should route through.

  Internal for now (not exported from any public entry) so the API isn't frozen
  before GA. Existing hand-rolled buttons migrate onto it incrementally.
-->

<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** Visual style — maps to `.flowdrop-btn--{variant}` in base.css */
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    /** Size — `md` is the base `.flowdrop-btn`; `sm`/`lg` add a modifier */
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

  // 'md' is the unmodified base class; only 'sm'/'lg' need a size modifier.
  const sizeClass = $derived(size === 'md' ? '' : `flowdrop-btn--${size}`);
</script>

<button
  class="flowdrop-btn flowdrop-btn--{variant} {sizeClass} {className}"
  {type}
  {title}
  {disabled}
  aria-label={ariaLabel}
  {onclick}
>
  {@render children()}
</button>
