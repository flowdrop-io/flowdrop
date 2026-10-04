<!--
  FormFieldLight Component (exported as `FormField` from "@flowdrop/flowdrop/form")

  The field factory without heavy editors: code, markdown and template fields
  render through the instance's field registry, or as a plain textarea with a
  hint naming the registration call. All field resolution lives in
  FieldFactory; see its header for the order.
-->

<script lang="ts">
  import FieldFactory from './FieldFactory.svelte';

  import type { FormFieldFactoryProps } from './types.js';

  let props: FormFieldFactoryProps = $props();
</script>

<!-- editors after the spread: an untyped caller cannot pass them through -->
<FieldFactory {...props} editors={undefined} />
