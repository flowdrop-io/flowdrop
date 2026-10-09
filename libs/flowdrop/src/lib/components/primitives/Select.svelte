<!--
  Select — typed wrapper over the shared `.flowdrop-input` system (base.css).

  One API, two renderings. Give it `options` and it picks: a short, flat list of
  plain options (10 or fewer, no groups, no descriptions) is the browser's own
  `<select>`; anything longer, grouped or described is a searchable `Combobox`
  (filter as you type, highlighted matches, "n of m", grouped). `searchable`
  forces one rendering or the other. See `utils/selectOptions.ts`.

  Native rendering: the field shell (`.flowdrop-input .flowdrop-input--select`)
  plus a built-in chevron overlay (`.flowdrop-select-wrap`), so selects match the
  exact look of Input/Textarea. Where the browser supports
  `appearance: base-select` its list is styled to match (base.css); elsewhere
  it keeps the platform's list, which follows the editor's `color-scheme`.
  Native attributes (value, disabled, id, aria-*, onchange…) forward to the
  underlying <select>.

  Without `options`, pass <option>/<optgroup> as children: that is always the
  native rendering (there is nothing to search).

  Internal for now; see Button.svelte / Input.svelte for the pattern.
-->

<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLSelectAttributes } from 'svelte/elements';
  import Combobox from './Combobox.svelte';
  import { selectRendering, type SelectOption } from '../../utils/selectOptions.js';

  // Omit native numeric `size` so our design-token size (matching Button) wins.
  interface Props extends Omit<HTMLSelectAttributes, 'size' | 'children' | 'value'> {
    /** Size — `md` is the base; `sm`/`lg` add a modifier */
    size?: 'sm' | 'md' | 'lg';
    /** Renders the error-border state */
    invalid?: boolean;
    /** Extra classes appended to the <select> */
    class?: string;
    /** The <option>/<optgroup> elements (when `options` is not given) */
    children?: Snippet;
    /** The options as data; lets the Select choose its rendering. */
    options?: SelectOption[];
    /** Force the searchable rendering (true) or the native one (false). Default: from the options. */
    searchable?: boolean;
    /** Selected value. */
    value?: HTMLSelectAttributes['value'];
    /** Runs with the new value when the user picks an option (either rendering). */
    onValueChange?: (value: string) => void;
    /** Shown in the closed field when nothing is selected. */
    placeholder?: string;
  }

  let {
    size = 'md',
    invalid = false,
    class: className = '',
    children,
    options,
    searchable,
    value,
    onValueChange,
    placeholder,
    ...rest
  }: Props = $props();

  const rendering = $derived(options ? selectRendering(options, searchable) : 'native');
  const hasValue = $derived(options?.some((o) => o.value === value) ?? false);

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

{#if options && rendering === 'combobox'}
  <Combobox
    {options}
    value={value == null ? '' : String(value)}
    {onValueChange}
    {size}
    {invalid}
    {placeholder}
    class={className}
    id={rest.id ?? undefined}
    name={rest.name ?? undefined}
    disabled={rest.disabled ?? false}
    aria-label={rest['aria-label'] ?? undefined}
    aria-labelledby={rest['aria-labelledby'] ?? undefined}
    aria-describedby={rest['aria-describedby'] ?? undefined}
    aria-required={rest['aria-required'] ?? undefined}
  />
{:else}
  <div class="flowdrop-select-wrap">
    <select
      class={selectClass}
      {...rest}
      {...value !== undefined ? { value } : {}}
      onchange={(event) => {
        // `rest.onchange` is the caller's handler (an event handler, or a list of them).
        const handler = rest.onchange as ((e: Event) => void) | null | undefined;
        handler?.(event);
        onValueChange?.(event.currentTarget.value);
      }}
    >
      {#if options}
        {#if placeholder !== undefined && !hasValue}
          <option value="" disabled hidden selected>{placeholder}</option>
        {/if}
        {#each options as option (option.value)}
          <option value={option.value} disabled={option.disabled} selected={option.value === value}>
            {option.label}
          </option>
        {/each}
      {:else}
        {@render children?.()}
      {/if}
    </select>
    <span class="flowdrop-select-wrap__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6" />
      </svg>
    </span>
  </div>
{/if}
