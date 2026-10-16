<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';
  import FormSelect from './FormSelect.svelte';
  import FieldInEditor from '../../stories/FieldInEditor.svelte';
  import { fieldSchemas } from '../../stories/formFixtures.js';

  const { Story } = defineMeta({
    title: 'Editor/Forms/Select',
    component: FormSelect,
    tags: ['autodocs'],
    parameters: { layout: 'padded' },
    args: { id: 'model', value: 'gpt-4o', onChange: fn() }
  });
</script>

<Story
  name="In the editor"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'A field with `oneOf` (a value and a title for each choice). The person sees the titles and the node stores the values.'
      }
    }
  }}
>
  <FieldInEditor schema={fieldSchemas.select} value="gpt-4o" />
</Story>

<Story
  name="Plain values"
  asChild
  parameters={{
    docs: { description: { story: 'A field with `enum`: the values are also the labels.' } }
  }}
>
  <FieldInEditor
    schema={{ type: 'string', title: 'Method', enum: ['GET', 'POST', 'PUT', 'DELETE'] }}
    value="GET"
  />
</Story>

<Story name="Read only" asChild>
  <FieldInEditor schema={{ ...fieldSchemas.select, readOnly: true }} value="claude-sonnet" />
</Story>

<Story
  name="Bare select"
  args={{ options: ['Option A', 'Option B', 'Option C'], value: 'Option A' }}
  parameters={{
    docs: {
      description: {
        story: 'The dropdown alone. Options can be strings or `{ value, label }` pairs.'
      }
    }
  }}
/>
