<!--
  @component
  The field factory without the heavy editors. It is exported as `FormField` from `@flowdrop/flowdrop/form`, and the editor's
  config form uses it. Code, markdown and template fields draw through the instance's field registry,
  or as a plain textarea with a hint when nothing is registered.

  **Use it for** rendering one field from a schema while keeping CodeMirror out of your bundle.
  **Not for** a whole form (use `SchemaForm` or `ConfigForm`).
-->

<script lang="ts">
  import FieldFactory from './FieldFactory.svelte';

  import type { FormFieldFactoryProps } from './types.js';

  let props: FormFieldFactoryProps = $props();
</script>

<!-- editors after the spread: an untyped caller cannot pass them through -->
<FieldFactory {...props} editors={undefined} />
