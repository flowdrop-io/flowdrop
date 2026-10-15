<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';
  import FormArray from './FormArray.svelte';
  import FieldInEditor from '../../stories/FieldInEditor.svelte';
  import { fieldSchemas } from '../../stories/formFixtures.js';

  const { Story } = defineMeta({
    title: 'Editor/Forms/List field',
    component: FormArray,
    tags: ['autodocs'],
    parameters: { layout: 'padded' },
    args: { id: 'tags', value: ['news', 'tech'], itemSchema: { type: 'string' }, onChange: fn() }
  });
</script>

<Story
  name="In the editor"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'An array of simple values. Each item is one control. Add puts a new one at the end; the grip reorders and the cross removes.'
      }
    }
  }}
>
  <FieldInEditor schema={fieldSchemas.list} value={['news', 'tech']} />
</Story>

<Story
  name="Rows"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'An array of small objects (up to two scalar fields) draws as rows: column headings once, then one row per item.'
      }
    }
  }}
>
  <FieldInEditor
    width="30rem"
    schema={fieldSchemas.rows}
    value={[
      { name: 'X-Team', value: 'support' },
      { name: 'X-Region', value: 'eu' }
    ]}
  />
</Story>

<Story
  name="Empty"
  asChild
  parameters={{
    docs: { description: { story: 'A list with no items shows a short prompt next to Add.' } }
  }}
>
  <FieldInEditor schema={fieldSchemas.list} value={[]} />
</Story>

<Story
  name="With limits"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'With `minItems` and `maxItems`, the cross is off at the minimum and Add is off at the maximum.'
      }
    }
  }}
>
  <FieldInEditor
    schema={{ ...fieldSchemas.list, minItems: 1, maxItems: 2 }}
    value={['news', 'tech']}
  />
</Story>

<Story
  name="Read only"
  asChild
  parameters={{
    docs: {
      description: {
        story: 'The node fixes the list: the items show as plain text and nothing can be added.'
      }
    }
  }}
>
  <FieldInEditor schema={{ ...fieldSchemas.list, readOnly: true }} value={['news', 'tech']} />
</Story>
