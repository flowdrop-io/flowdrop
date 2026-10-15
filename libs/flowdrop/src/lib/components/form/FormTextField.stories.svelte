<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';
  import FormTextField from './FormTextField.svelte';
  import FieldInEditor from '../../stories/FieldInEditor.svelte';
  import { fieldSchemas } from '../../stories/formFixtures.js';

  const { Story } = defineMeta({
    title: 'Editor/Forms/Text field',
    component: FormTextField,
    tags: ['autodocs'],
    parameters: { layout: 'padded' },
    args: { id: 'subject', value: '', onChange: fn() }
  });
</script>

<Story
  name="In the editor"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          "A string field in a node's config form: the factory draws the label, the help text and this input."
      }
    }
  }}
>
  <FieldInEditor schema={fieldSchemas.text} value="Your order has shipped" />
</Story>

<Story
  name="Required"
  asChild
  parameters={{
    docs: {
      description: { story: 'The label gets a required mark. The input says so to screen readers.' }
    }
  }}
>
  <FieldInEditor schema={fieldSchemas.text} required />
</Story>

<Story
  name="Read only"
  asChild
  parameters={{
    docs: {
      description: {
        story: 'A schema with `readOnly: true`: the value is shown and cannot be changed.'
      }
    }
  }}
>
  <FieldInEditor schema={{ ...fieldSchemas.text, readOnly: true }} value="Set by the node type" />
</Story>

<Story
  name="Bare input"
  args={{ value: 'Hello', placeholder: 'Enter text...' }}
  parameters={{
    docs: {
      description: { story: 'The input alone, with no label. Use the controls to try the props.' }
    }
  }}
/>
