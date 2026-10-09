<!--
  Select — typed wrapper over the shared `.flowdrop-input` system (base.css).

  Renders the field shell (`.flowdrop-input .flowdrop-input--select`) plus a
  built-in chevron overlay (`.flowdrop-select-wrap`), so selects match the exact
  look of Input/Textarea. The native arrow is removed; the chevron tints to
  --fd-primary on focus. Pass <option>/<optgroup> as children. Native attributes
  (value, disabled, id, aria-*, onchange…) forward to the underlying <select>.

  Internal for now; see Button.svelte / Input.svelte for the pattern.
-->

<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLSelectAttributes } from 'svelte/elements';

  // Omit native numeric `size` so our design-token size (matching Button) wins.
  interface Props extends Omit<HTMLSelectAttributes, 'size'> {
    /** Size — `md` is the base; `sm`/`lg` add a modifier */
    size?: 'sm' | 'md' | 'lg';
    /** Renders the error-border state */
    invalid?: boolean;
    /** Extra classes appended to the <select> */
    class?: string;
    /** The <option>/<optgroup> elements */
    children: Snippet;
  }

  let { size = 'md', invalid = false, class: className = '', children, ...rest }: Props = $props();

  const selectClass = $derived(
    [
      'flowdrop-input',
      'flowdrop-input--select',
      size === 'md' ? '' : `flowdrop-input--${size}`,
      invalid ? 'flowdrop-input--invalid' : '',
      className
    ]
      .filter(Boolean)
      .join(' ')
  );
</script>

<div class="flowdrop-select-wrap">
  <select class={selectClass} {...rest}>
    {@render children()}
  </select>
  <span class="flowdrop-select-wrap__icon" aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6" />
    </svg>
  </span>
</div>
