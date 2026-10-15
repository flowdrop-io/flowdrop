<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';
  import FormTextarea from './FormTextarea.svelte';
  import FieldInEditor from '../../stories/FieldInEditor.svelte';
  import { fieldSchemas } from '../../stories/formFixtures.js';

  const { Story } = defineMeta({
    title: 'Editor/Forms/Textarea',
    component: FormTextarea,
    tags: ['autodocs'],
    parameters: { layout: 'padded' },
    args: { id: 'instructions', value: '', rows: 4, onChange: fn() }
  });
</script>

<Story
  name="In the editor"
  asChild
  parameters={{
    docs: {
      description: {
        story: 'A string field with `format: "multiline"`. The box can be resized.'
      }
    }
  }}
>
  <FieldInEditor
    schema={fieldSchemas.multiline}
    value="Answer in the customer's language. Keep it under 80 words."
  />
</Story>

<Story name="Empty" asChild>
  <FieldInEditor schema={fieldSchemas.multiline} />
</Story>

<Story name="Read only" asChild>
  <FieldInEditor
    schema={{ ...fieldSchemas.multiline, readOnly: true }}
    value="Fixed by the node."
  />
</Story>

<Story
  name="Bare textarea"
  args={{ rows: 6, placeholder: 'Type here...' }}
  parameters={{
    docs: { description: { story: 'The box alone. `rows` sets its height.' } }
  }}
/>
