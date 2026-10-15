<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';
  import FormRangeField from './FormRangeField.svelte';
  import FieldInEditor from '../../stories/FieldInEditor.svelte';
  import { fieldSchemas } from '../../stories/formFixtures.js';

  const { Story } = defineMeta({
    title: 'Editor/Forms/Range field',
    component: FormRangeField,
    tags: ['autodocs'],
    parameters: { layout: 'padded' },
    args: { id: 'temperature', value: 0.7, min: 0, max: 2, step: 0.1, onChange: fn() }
  });
</script>

<Story
  name="In the editor"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'A number with `format: "range"`, such as a model\'s temperature. Drag the thumb; the value shows beside it.'
      }
    }
  }}
>
  <FieldInEditor schema={fieldSchemas.range} value={0.7} />
</Story>

<Story name="Read only" asChild>
  <FieldInEditor schema={{ ...fieldSchemas.range, readOnly: true }} value={1.2} />
</Story>

<Story
  name="Whole numbers"
  asChild
  parameters={{
    docs: { description: { story: 'A short scale with a step of 1.' } }
  }}
>
  <FieldInEditor
    schema={{
      type: 'integer',
      title: 'Priority',
      format: 'range',
      minimum: 1,
      maximum: 5,
      step: 1
    }}
    value={3}
  />
</Story>

<Story name="Bare slider" />
