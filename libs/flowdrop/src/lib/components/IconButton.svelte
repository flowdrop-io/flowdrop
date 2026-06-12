<!--
  IconButton — typed wrapper over the `.flowdrop-btn--icon` system (base.css).

  The icon-only sibling of Button.svelte: a square button that holds a single
  glyph (Icon, inline SVG, or character). All geometry, variants, sizes and the
  centralized focus ring live in base.css; this component is the ergonomic,
  type-safe entry point so callers pick `variant`/`size` instead of hand-writing
  class strings and re-declaring widths/tints in scoped styles.

  Internal for now (not exported from any public entry) so the API isn't frozen
  before GA. Existing hand-rolled square buttons migrate onto it incrementally.
  Canvas-overlay buttons keep their bespoke components (CanvasIconButton,
  NodeConfigButton) — those add absolute positioning, shadows and backdrop blur
  this primitive deliberately stays out of.
-->

<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /**
     * Visual style. `ghost` (default) is transparent until hover; `default` is a
     * flat surface with a resting border; `primary`/`danger`/`success` are quiet
     * semantic tints (muted fill + coloured border) that go solid on press.
     */
    variant?: 'ghost' | 'default' | 'primary' | 'danger' | 'success';
    /** Square size — `md` (32px) is the base; `sm` (28px) / `lg` (36px) add a modifier */
    size?: 'sm' | 'md' | 'lg';
    /** Native button type */
    type?: 'button' | 'submit' | 'reset';
    /** Tooltip text */
    title?: string;
    /** Accessible label — required, since the button is icon-only */
    ariaLabel: string;
    /** Toggle/pressed state — applies the active tint and sets `aria-pressed` */
    active?: boolean;
    /** Disabled state */
    disabled?: boolean;
    /** Extra classes appended to the root button */
    class?: string;
    /** Click handler */
    onclick?: (event: MouseEvent) => void;
    /** The glyph (icon, svg, or character) */
    children: Snippet;
  }

  let {
    variant = 'ghost',
    size = 'md',
    type = 'button',
    title,
    ariaLabel,
    active = false,
    disabled = false,
    class: className = '',
    onclick,
    children
  }: Props = $props();

  // `ghost` reuses the shared `.flowdrop-btn--ghost`; the other variants have
  // icon-specific tint classes so they don't collide with the solid text buttons.
  const variantClass = $derived(
    variant === 'ghost' ? 'flowdrop-btn--ghost' : `flowdrop-btn--icon-${variant}`
  );
  // 'md' is the unmodified base size; only 'sm'/'lg' need a size modifier.
  const sizeClass = $derived(size === 'md' ? '' : `flowdrop-btn--${size}`);
</script>

<button
  class="flowdrop-btn flowdrop-btn--icon {variantClass} {sizeClass} {className}"
  class:is-active={active}
  {type}
  {title}
  {disabled}
  aria-label={ariaLabel}
  aria-pressed={active ? true : undefined}
  {onclick}
>
  {@render children()}
</button>
