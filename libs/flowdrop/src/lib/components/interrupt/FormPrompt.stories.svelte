<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';
  import FormPrompt from './FormPrompt.svelte';
  import InterruptBubble from './InterruptBubble.svelte';
  import InstanceDecorator from '../../stories/InstanceDecorator.svelte';
  import { form, formConfig, seedInterrupt } from '../../stories/interruptFixtures.js';

  const { Story } = defineMeta({
    title: 'Editor/Playground/Prompts/Form prompt',
    component: FormPrompt,
    tags: ['autodocs'],
    parameters: { layout: 'padded' },
    args: { config: formConfig, isResolved: false, isSubmitting: false, onSubmit: fn() }
  });
</script>

<Story
  name="In the chat"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          "A run reached a Form step and is waiting. The fields come from the step's schema and sit straight on the card."
      }
    }
  }}
>
  <InstanceDecorator width="440px" setup={(fd) => seedInterrupt(fd, form())}>
    <InterruptBubble interrupt={form()} />
  </InstanceDecorator>
</Story>

<Story
  name="Answered"
  asChild
  parameters={{
    docs: { description: { story: 'After the form is sent the card folds to one line.' } }
  }}
>
  <InstanceDecorator
    width="440px"
    setup={(fd) =>
      seedInterrupt(fd, form(), {
        state: 'answered',
        value: { name: 'Alex Rivera', street: 'Main St 1' }
      })}
  >
    <InterruptBubble interrupt={form()} />
  </InstanceDecorator>
</Story>

<Story
  name="Sending"
  args={{ isSubmitting: true }}
  parameters={{
    docs: { description: { story: 'The form is on its way; the fields are locked.' } }
  }}
/>
