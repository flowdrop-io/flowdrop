<!--
  Input — typed wrapper over the shared `.flowdrop-input` system (base.css).

  All control styling (surface, border, radius, sizes, focus ring, disabled =
  the only muted state) lives in base.css. This component is the ergonomic,
  type-safe entry point so callers pick `size`/`invalid`/`leading`/`trailing`
  instead of hand-writing class strings — the single place text-like fields
  should route through. Mirrors Button.svelte.

  Native attributes (type, value, placeholder, disabled, id, aria-*, oninput…)
  are forwarded verbatim to the underlying <input>.

  Internal for now (not exported from any public entry) so the API isn't frozen
  before GA. Existing hand-rolled inputs migrate onto it incrementally.
-->

<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLInputAttributes } from 'svelte/elements';

  // Omit native numeric `size` so our design-token size (matching Button) wins.
  interface Props extends Omit<HTMLInputAttributes, 'size'> {
    /** Size — `md` is the base `.flowdrop-input`; `sm`/`lg` add a modifier */
    size?: 'sm' | 'md' | 'lg';
    /** Renders the error-border state */
    invalid?: boolean;
    /** Extra classes appended to the input */
    class?: string;
    /** Optional leading affordance (e.g. a search icon) */
    leading?: Snippet;
    /** Optional trailing affordance */
    trailing?: Snippet;
  }

  let {
    size = 'md',
    invalid = false,
    class: className = '',
    leading,
    trailing,
    ...rest
  }: Props = $props();

  const inputClass = $derived(
    [
      'flowdrop-input',
      size === 'md' ? '' : `flowdrop-input--${size}`,
      invalid ? 'flowdrop-input--invalid' : '',
      leading ? 'flowdrop-input--has-leading' : '',
      trailing ? 'flowdrop-input--has-trailing' : '',
      className
    ]
      .filter(Boolean)
      .join(' ')
  );
</script>

{#if leading || trailing}
  <div class="flowdrop-input-wrap">
    {#if leading}
      <span class="flowdrop-input-wrap__icon flowdrop-input-wrap__icon--leading">
        {@render leading()}
      </span>
    {/if}
    <input class={inputClass} {...rest} />
    {#if trailing}
      <span class="flowdrop-input-wrap__icon flowdrop-input-wrap__icon--trailing">
        {@render trailing()}
      </span>
    {/if}
  </div>
{:else}
  <input class={inputClass} {...rest} />
{/if}
