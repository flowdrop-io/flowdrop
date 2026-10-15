<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';
  import FormNumberField from './FormNumberField.svelte';
  import FieldInEditor from '../../stories/FieldInEditor.svelte';
  import { fieldSchemas } from '../../stories/formFixtures.js';

  const { Story } = defineMeta({
    title: 'Editor/Forms/Number field',
    component: FormNumberField,
    tags: ['autodocs'],
    parameters: { layout: 'padded' },
    args: { id: 'max-results', value: '', onChange: fn() }
  });
</script>

<Story
  name="In the editor"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          "A number or integer field in a node's config form, with the limits from the schema (`minimum`, `maximum`)."
      }
    }
  }}
>
  <FieldInEditor schema={fieldSchemas.number} value={10} />
</Story>

<Story
  name="Empty"
  asChild
  parameters={{
    docs: { description: { story: 'A cleared box gives an empty string, not zero.' } }
  }}
>
  <FieldInEditor schema={fieldSchemas.number} />
</Story>

<Story name="Read only" asChild>
  <FieldInEditor schema={{ ...fieldSchemas.number, readOnly: true }} value={25} />
</Story>

<Story
  name="Bare input"
  args={{ value: 5, min: 0, max: 10, step: 1 }}
  parameters={{
    docs: {
      description: { story: 'The input alone, with no label. Use the controls to try the props.' }
    }
  }}
/>
