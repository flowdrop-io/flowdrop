<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import FormFieldLight from './FormFieldLight.svelte';
  import FieldInEditor from '../../stories/FieldInEditor.svelte';
  import { fieldSchemas } from '../../stories/formFixtures.js';

  const { Story } = defineMeta({
    title: 'Editor/Forms/Field factory',
    component: FormFieldLight,
    tags: ['autodocs'],
    parameters: { layout: 'padded' }
  });

  const basic = [
    { key: 'text', label: 'Text', value: 'Your order has shipped' },
    { key: 'number', label: 'Number', value: 10 },
    { key: 'range', label: 'Range', value: 0.7 },
    { key: 'toggle', label: 'Switch', value: true },
    { key: 'select', label: 'Choice (oneOf)', value: 'gpt-4o' },
    { key: 'checkboxes', label: 'Several choices (enum, multiple)', value: ['search'] },
    { key: 'multiline', label: 'Long text', value: 'Answer briefly.' }
  ] as const;
</script>

<Story
  name="In the editor"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          "The factory reads each field's schema and picks the control: `type` and `format` decide. This is the form a node with these field kinds shows in the inspector."
      }
    }
  }}
>
  <div style="display: grid; gap: var(--fd-space-2xl); max-width: 22rem">
    {#each basic as field (field.key)}
      <FieldInEditor schema={fieldSchemas[field.key]} value={field.value} fieldKey={field.key} />
    {/each}
  </div>
</Story>

<Story
  name="Without the code editors"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'Template, JSON and Markdown fields need a heavy editor. When the host has not registered one, the factory draws a plain textarea and a hint that names the call to register it.'
      }
    }
  }}
>
  <div style="display: grid; gap: var(--fd-space-2xl); max-width: 26rem">
    <FieldInEditor schema={fieldSchemas.template} fieldKey="prompt" width="26rem" />
    <FieldInEditor schema={fieldSchemas.json} fieldKey="schema" width="26rem" />
  </div>
</Story>

<Story
  name="With the code editors"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'The full factory (`FormFieldFull`) has the editors built in, so the same schemas draw as code, Markdown and template editors.'
      }
    }
  }}
>
  <div style="display: grid; gap: var(--fd-space-2xl); max-width: 30rem">
    <FieldInEditor
      full
      width="30rem"
      schema={fieldSchemas.template}
      fieldKey="prompt"
      value={'Answer briefly.\n\n{{ question }}'}
    />
    <FieldInEditor
      full
      width="30rem"
      schema={fieldSchemas.json}
      fieldKey="schema"
      value={{ type: 'object', required: ['answer'] }}
    />
  </div>
</Story>
