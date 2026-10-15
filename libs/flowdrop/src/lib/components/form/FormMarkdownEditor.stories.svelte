<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';
  import FormMarkdownEditor from './FormMarkdownEditor.svelte';
  import FieldInEditor from '../../stories/FieldInEditor.svelte';
  import { fieldSchemas } from '../../stories/formFixtures.js';

  const { Story } = defineMeta({
    title: 'Editor/Forms/Markdown editor',
    component: FormMarkdownEditor,
    tags: ['autodocs'],
    parameters: { layout: 'padded' },
    args: { id: 'notes', value: '# Notes', onChange: fn() }
  });

  const notes =
    '# Support flow\n\nThis workflow answers **order questions**.\n\n- Look up the order\n- Draft a reply\n';
</script>

<Story
  name="In the editor"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'A field with `format: "markdown"`: a toolbar, shortcuts, and a status bar with the word and line count.'
      }
    }
  }}
>
  <FieldInEditor full width="36rem" schema={fieldSchemas.markdown} fieldKey="notes" value={notes} />
</Story>

<Story name="Read only" asChild>
  <FieldInEditor
    full
    width="36rem"
    schema={{ ...fieldSchemas.markdown, readOnly: true }}
    fieldKey="notes"
    value={notes}
  />
</Story>
