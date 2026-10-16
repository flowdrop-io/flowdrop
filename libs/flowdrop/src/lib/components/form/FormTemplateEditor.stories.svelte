<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';
  import FormTemplateEditor from './FormTemplateEditor.svelte';
  import FieldInEditor from '../../stories/FieldInEditor.svelte';
  import { agentNode, agentWorkflow, fieldSchemas } from '../../stories/formFixtures.js';

  const { Story } = defineMeta({
    title: 'Editor/Forms/Template editor',
    component: FormTemplateEditor,
    tags: ['autodocs'],
    parameters: { layout: 'padded' },
    args: { id: 'prompt', value: 'Hello {{ name }}', onChange: fn() }
  });

  const prompt = 'You are a support agent.\n\nQuestion: {{ question }}';
</script>

<Story
  name="In the editor"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'A field with `format: "template"`. Placeholders are coloured. Type `{{` to pick a value from the nodes wired into this one.'
      }
    }
  }}
>
  <FieldInEditor
    full
    width="34rem"
    schema={fieldSchemas.template}
    fieldKey="prompt"
    value={prompt}
    node={agentNode}
    nodes={agentWorkflow.nodes}
    edges={agentWorkflow.edges}
  />
</Story>

<Story name="Read only" asChild>
  <FieldInEditor
    full
    width="34rem"
    schema={{ ...fieldSchemas.template, readOnly: true }}
    fieldKey="prompt"
    value={prompt}
  />
</Story>
