<!--
  FormField Component (exported as `FormFieldFull` from "@flowdrop/flowdrop/form/full")

  The field factory with every heavy editor statically bundled, so code,
  markdown and template fields work without registering anything. All field
  resolution lives in FieldFactory; this file only hands it the editors. A component
  registered on the instance's field registry still wins over these.

  It used to be a second, parallel factory. The two drifted: the light one lost
  the built-in autocomplete and readOnly handling, and since the config panel
  renders the light one, those bugs were the ones users saw.
-->

<script lang="ts">
  import FieldFactory from './FieldFactory.svelte';
  import FormCodeEditor from './FormCodeEditor.svelte';
  import FormMarkdownEditor from './FormMarkdownEditor.svelte';
  import FormTemplateEditor from './FormTemplateEditor.svelte';

  const editors = {
    'code-editor': FormCodeEditor,
    'markdown-editor': FormMarkdownEditor,
    'template-editor': FormTemplateEditor
  };

  import type { FormFieldFactoryProps } from './types.js';

  let props: FormFieldFactoryProps = $props();
</script>

<FieldFactory {...props} {editors} />
