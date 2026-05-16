/**
 * FlowDrop Form Autocomplete Module
 *
 * Re-exports the built-in `FormAutocomplete` component so consumers can wrap
 * it in custom field components (for example a dependent-autocomplete that
 * needs to read sibling form values) without reimplementing type-ahead,
 * debouncing, and label caching themselves.
 *
 * @module form/autocomplete
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import FormAutocomplete from "@flowdrop/flowdrop/form/autocomplete";
 * </script>
 * ```
 */

export { default } from '../components/form/FormAutocomplete.svelte';
export { default as FormAutocomplete } from '../components/form/FormAutocomplete.svelte';
