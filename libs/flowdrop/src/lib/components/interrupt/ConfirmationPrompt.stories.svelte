<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';
  import ConfirmationPrompt from './ConfirmationPrompt.svelte';
  import InterruptBubble from './InterruptBubble.svelte';
  import InstanceDecorator from '../../stories/InstanceDecorator.svelte';
  import { confirmation, seedInterrupt } from '../../stories/interruptFixtures.js';
  import { createConfirmationConfig } from '../../stories/utils.js';

  const { Story } = defineMeta({
    title: 'Editor/Playground/Prompts/Confirmation prompt',
    component: ConfirmationPrompt,
    tags: ['autodocs'],
    parameters: { layout: 'padded' },
    args: {
      config: createConfirmationConfig(),
      isResolved: false,
      isSubmitting: false,
      onConfirm: fn(),
      onDecline: fn()
    }
  });
</script>

<Story
  name="In the chat"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'A run reached a Confirm step and is waiting for a yes or a no. The question is the card title; the two buttons use the labels the step sets.'
      }
    }
  }}
>
  <InstanceDecorator width="440px" setup={(fd) => seedInterrupt(fd, confirmation())}>
    <InterruptBubble interrupt={confirmation()} />
  </InstanceDecorator>
</Story>

<Story
  name="Answered"
  asChild
  parameters={{
    docs: {
      description: {
        story: 'After the answer the card folds to one line, e.g. "Confirmed · Send".'
      }
    }
  }}
>
  <InstanceDecorator
    width="440px"
    setup={(fd) => seedInterrupt(fd, confirmation(), { state: 'answered', value: true })}
  >
    <InterruptBubble interrupt={confirmation()} />
  </InstanceDecorator>
</Story>

<Story
  name="Declined"
  asChild
  parameters={{
    docs: { description: { story: 'The person pressed the second button.' } }
  }}
>
  <InstanceDecorator
    width="440px"
    setup={(fd) => seedInterrupt(fd, confirmation(), { state: 'answered', value: false })}
  >
    <InterruptBubble interrupt={confirmation()} />
  </InstanceDecorator>
</Story>

<Story
  name="Could not send"
  asChild
  parameters={{
    docs: {
      description: {
        story: 'The answer did not reach the server. The card shows the error and a Retry button.'
      }
    }
  }}
>
  <InstanceDecorator
    width="440px"
    setup={(fd) =>
      seedInterrupt(fd, confirmation(), {
        state: 'error',
        value: true,
        message: 'The server did not answer.'
      })}
  >
    <InterruptBubble interrupt={confirmation()} />
  </InstanceDecorator>
</Story>

<Story
  name="Prompt alone"
  parameters={{ docs: { description: { story: 'The buttons without the card around them.' } } }}
/>

<Story
  name="Sending"
  args={{ isSubmitting: true }}
  parameters={{
    docs: { description: { story: 'The answer is on its way; the buttons are locked.' } }
  }}
/>
