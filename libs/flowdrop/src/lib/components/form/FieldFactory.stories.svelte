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

<Story
  name="Nullable fields"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'A field whose type array or enum lists `null` gets a "null" toggle on its label row. The first column is off (the field holds a value), the second is on (the config holds `null`). A required field marked `when_missing: skip` also says it is skipped when empty.'
      }
    }
  }}
>
  <div style="display: grid; gap: var(--fd-space-2xl); max-width: 22rem">
    <FieldInEditor
      schema={{ type: ['string', 'null'], title: 'Subject (off)' }}
      value="Your order has shipped"
      fieldKey="subject_off"
    />
    <FieldInEditor
      schema={{ type: ['string', 'null'], title: 'Subject (on)' }}
      value={null}
      fieldKey="subject_on"
    />
    <FieldInEditor
      schema={{ type: ['integer', 'null'], title: 'Max retries (off)' }}
      value={3}
      fieldKey="retries_off"
    />
    <FieldInEditor
      schema={{ type: 'string', enum: ['fast', 'slow', null], title: 'Mode (on)' }}
      value={null}
      fieldKey="mode_on"
    />
    <FieldInEditor
      schema={{ type: 'string', title: 'Recipient', when_missing: 'skip' }}
      value=""
      required
      fieldKey="recipient"
    />
  </div>
</Story>

<Story
  name="No type"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'A field with no `type` accepts any JSON value, so the full factory edits it as JSON rather than as a text field.'
      }
    }
  }}
>
  <div style="display: grid; gap: var(--fd-space-2xl); max-width: 30rem">
    <FieldInEditor
      full
      width="30rem"
      schema={{ title: 'Payload' }}
      fieldKey="payload"
      value={{ id: 1 }}
    />
  </div>
</Story>
