<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';
  import FormCodeEditor from './FormCodeEditor.svelte';
  import FieldInEditor from '../../stories/FieldInEditor.svelte';
  import { fieldSchemas } from '../../stories/formFixtures.js';

  const { Story } = defineMeta({
    title: 'Editor/Forms/Code editor',
    component: FormCodeEditor,
    tags: ['autodocs'],
    parameters: { layout: 'padded' },
    args: { id: 'schema', value: { type: 'object' }, onChange: fn() }
  });
</script>

<Story
  name="In the editor"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'A field with `format: "json"`. The editor colours the JSON, checks it as you type and formats it when you leave the box.'
      }
    }
  }}
>
  <FieldInEditor
    full
    width="32rem"
    schema={fieldSchemas.json}
    fieldKey="schema"
    value={{ type: 'object', properties: { answer: { type: 'string' } }, required: ['answer'] }}
  />
</Story>

<Story
  name="Invalid JSON"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'When the text is not valid JSON, the error shows under the editor and the value is not stored.'
      }
    }
  }}
>
  <FieldInEditor
    full
    width="32rem"
    schema={fieldSchemas.json}
    fieldKey="schema"
    value={'{ "type": "object", '}
  />
</Story>

<Story name="Read only" asChild>
  <FieldInEditor
    full
    width="32rem"
    schema={{ ...fieldSchemas.json, readOnly: true }}
    fieldKey="schema"
    value={{ type: 'object' }}
  />
</Story>
