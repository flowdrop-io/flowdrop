<!--
  @component
  Select: a dropdown that picks one value from a list.

  One API, two renderings. Give it `options` and it chooses. A short, flat list of plain
  options (10 or fewer, no groups, no descriptions) is the browser's own `<select>`.
  A longer, grouped or described list becomes a searchable `Combobox` (type to filter, matches
  highlighted, "n of m"). `searchable` forces one or the other. Without `options`, pass
  `<option>` and `<optgroup>` children; that is always the native rendering.

  The native rendering uses the same field look as Input and Textarea (base.css), with a
  built-in chevron. Native attributes (`value`, `disabled`, `id`, `aria-*`, `onchange`) go to
  the underlying `<select>`. `onValueChange` runs with the new value in either rendering.

  **Use it for** choosing one value in a config form.
  **Not for** a list of actions; use `Menu`. Not for a two or three way mode; use `Segmented`.

  Not exported from the package; internal for now.
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
