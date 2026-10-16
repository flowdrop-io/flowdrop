<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import FormFieldset from './FormFieldset.svelte';
  import FieldInEditor from '../../stories/FieldInEditor.svelte';
  import { fieldSchemas } from '../../stories/formFixtures.js';

  const { Story } = defineMeta({
    title: 'Editor/Forms/Field group',
    component: FormFieldset,
    tags: ['autodocs'],
    parameters: { layout: 'padded' }
  });
</script>

{#snippet fields()}
  <FieldInEditor schema={fieldSchemas.number} value={10} fieldKey="max" width="100%" />
  <FieldInEditor schema={fieldSchemas.toggle} value={true} fieldKey="stream" width="100%" />
{/snippet}

<Story
  name="In the editor"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          "A `Group` in a node's UI schema. It folds open and closed; the description shows as a badge on the right."
      }
    }
  }}
>
  <div style="max-width: 24rem">
    <FormFieldset group={{ type: 'Group', label: 'Limits', description: 'Optional', elements: [] }}>
      {@render fields()}
    </FormFieldset>
  </div>
</Story>

<Story
  name="Closed at first"
  asChild
  parameters={{
    docs: { description: { story: 'With `defaultOpen: false` the group starts folded.' } }
  }}
>
  <div style="max-width: 24rem">
    <FormFieldset group={{ type: 'Group', label: 'Limits', defaultOpen: false, elements: [] }}>
      {@render fields()}
    </FormFieldset>
  </div>
</Story>

<Story
  name="Always open"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'With `collapsible: false` the group is a plain fieldset with a legend and the description under it.'
      }
    }
  }}
>
  <div style="max-width: 24rem">
    <FormFieldset
      group={{
        type: 'Group',
        label: 'Limits',
        description: 'How far a run may go.',
        collapsible: false,
        elements: []
      }}
    >
      {@render fields()}
    </FormFieldset>
  </div>
</Story>
