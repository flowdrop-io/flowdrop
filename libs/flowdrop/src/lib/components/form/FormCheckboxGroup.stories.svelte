<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';
  import FormCheckboxGroup from './FormCheckboxGroup.svelte';
  import FieldInEditor from '../../stories/FieldInEditor.svelte';
  import { fieldSchemas } from '../../stories/formFixtures.js';

  const { Story } = defineMeta({
    title: 'Editor/Forms/Checkbox group',
    component: FormCheckboxGroup,
    tags: ['autodocs'],
    parameters: { layout: 'padded' },
    args: {
      id: 'tools',
      options: ['search', 'calculator', 'calendar'],
      value: ['search'],
      onChange: fn()
    }
  });
</script>

<Story
  name="In the editor"
  asChild
  parameters={{
    docs: {
      description: {
        story: 'An `enum` field with `multiple: true`. The value is the list of ticked options.'
      }
    }
  }}
>
  <FieldInEditor schema={fieldSchemas.checkboxes} value={['search', 'calendar']} />
</Story>

<Story name="Nothing ticked" asChild>
  <FieldInEditor schema={fieldSchemas.checkboxes} value={[]} />
</Story>

<Story name="Read only" asChild>
  <FieldInEditor schema={{ ...fieldSchemas.checkboxes, readOnly: true }} value={['search']} />
</Story>

<Story name="Bare group" />
