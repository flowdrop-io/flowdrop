<!--
  @component
  The field factory with every editor built in. Give it a field schema and a value and it draws the right control
  inside a `FormFieldWrapper`: text, number, switch, select, range, checkboxes, code, markdown or template.

  It is exported as `FormFieldFull` from `@flowdrop/flowdrop/form/full`. The editor itself uses the lighter `FormFieldLight`.
  A component registered on the instance's field registry wins over the built-in ones.

  **Use it for** rendering one field from a schema when you want code, markdown and template editors without registering anything.
  **Not for** a whole form (use `SchemaForm` or `ConfigForm`).
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
