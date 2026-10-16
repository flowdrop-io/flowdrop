<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';
  import SchemaForm from './SchemaForm.svelte';
  import InstanceDecorator from '../stories/InstanceDecorator.svelte';
  import type { ConfigSchema } from '../types/index.js';

  const { Story } = defineMeta({
    title: 'Editor/Forms/Schema form',
    component: SchemaForm,
    tags: ['autodocs'],
    parameters: { layout: 'padded' },
    args: { onChange: fn(), onSave: fn(), onCancel: fn() }
  });

  const feedback: ConfigSchema = {
    type: 'object',
    properties: {
      email: { type: 'string', title: 'Email', description: 'Where we send the answer.' },
      topic: {
        type: 'string',
        title: 'Topic',
        oneOf: [
          { const: 'billing', title: 'Billing' },
          { const: 'shipping', title: 'Shipping' },
          { const: 'other', title: 'Something else' }
        ]
      },
      message: { type: 'string', title: 'Message', format: 'multiline' },
      subscribe: { type: 'boolean', title: 'Keep me updated', default: false }
    },
    required: ['email']
  };

  const model: ConfigSchema = {
    type: 'object',
    properties: {
      model: {
        type: 'string',
        title: 'AI model',
        oneOf: [
          { const: 'gpt-4o', title: 'GPT-4o' },
          { const: 'claude-sonnet', title: 'Claude Sonnet' }
        ]
      },
      temperature: {
        type: 'number',
        title: 'Temperature',
        format: 'range',
        minimum: 0,
        maximum: 2,
        step: 0.1
      },
      prompt: { type: 'string', title: 'System prompt', format: 'multiline' }
    }
  };
</script>

<script lang="ts">
  let values = $state<Record<string, unknown>>({ email: '', topic: 'shipping', subscribe: false });
</script>

<Story
  name="Interrupt form"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'How a run uses it. When a workflow pauses to ask a person for several values, the interrupt card draws its fields with `SchemaForm` and a submit button (the card relabels Save as Submit and hides Cancel). Required fields get a mark.'
      }
    }
  }}
>
  <InstanceDecorator width="26rem">
    <SchemaForm
      schema={feedback}
      {values}
      showActions
      onChange={(next) => (values = next)}
      onSave={fn()}
    />
  </InstanceDecorator>
</Story>

<Story
  name="Choices and a slider"
  args={{
    schema: model,
    values: { model: 'gpt-4o', temperature: 0.7, prompt: 'You are a helpful assistant.' }
  }}
  parameters={{
    docs: {
      description: {
        story: 'A choice, a slider and a long text. Use the controls to change the props.'
      }
    }
  }}
/>

<Story
  name="Saving"
  args={{
    schema: feedback,
    values: { email: 'ada@example.com' },
    showActions: true,
    loading: true
  }}
  parameters={{
    docs: {
      description: {
        story: 'After Save is pressed and until the answer comes back, the buttons are off.'
      }
    }
  }}
/>

<Story
  name="Answered"
  args={{
    schema: feedback,
    values: { email: 'ada@example.com', topic: 'billing', message: 'Thanks!' },
    disabled: true
  }}
  parameters={{
    docs: {
      description: {
        story: 'The form is read only, as an interrupt shows it after it has been answered.'
      }
    }
  }}
/>
