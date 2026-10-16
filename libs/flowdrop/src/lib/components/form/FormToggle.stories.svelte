<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';
  import FormToggle from './FormToggle.svelte';
  import FieldInEditor from '../../stories/FieldInEditor.svelte';
  import { fieldSchemas } from '../../stories/formFixtures.js';

  const { Story } = defineMeta({
    title: 'Editor/Forms/Toggle',
    component: FormToggle,
    tags: ['autodocs'],
    parameters: { layout: 'padded' },
    args: { id: 'stream', value: true, onChange: fn() }
  });
</script>

<Story
  name="In the editor"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          "A boolean field. The switch sits on the label's row and the help text goes underneath. The track colour is the state; there is no On or Off word."
      }
    }
  }}
>
  <FieldInEditor schema={fieldSchemas.toggle} value={true} />
</Story>

<Story name="Off" asChild>
  <FieldInEditor schema={fieldSchemas.toggle} value={false} />
</Story>

<Story name="Read only" asChild>
  <FieldInEditor schema={{ ...fieldSchemas.toggle, readOnly: true }} value={true} />
</Story>

<Story
  name="Bare switch"
  args={{ onLabel: 'Hidden', offLabel: 'Visible', value: false }}
  parameters={{
    docs: {
      description: {
        story: 'The switch alone. `onLabel` and `offLabel` change its accessible name only.'
      }
    }
  }}
/>
