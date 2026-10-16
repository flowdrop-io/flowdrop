<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';
  import TextInputPrompt from './TextInputPrompt.svelte';
  import InterruptBubble from './InterruptBubble.svelte';
  import InstanceDecorator from '../../stories/InstanceDecorator.svelte';
  import { text, seedInterrupt } from '../../stories/interruptFixtures.js';
  import { createTextConfig } from '../../stories/utils.js';

  const { Story } = defineMeta({
    title: 'Editor/Playground/Prompts/Text prompt',
    component: TextInputPrompt,
    tags: ['autodocs'],
    parameters: { layout: 'padded' },
    args: {
      config: createTextConfig(),
      isResolved: false,
      isSubmitting: false,
      onSubmit: fn()
    }
  });

  const notes = text({
    message: 'Add a note for the reviewer',
    placeholder: 'What should they look at first?',
    multiline: true,
    maxLength: 280
  });
</script>

<Story
  name="In the chat"
  asChild
  parameters={{
    docs: {
      description: {
        story: 'A run reached an Ask step and is waiting for a line of text.'
      }
    }
  }}
>
  <InstanceDecorator width="440px" setup={(fd) => seedInterrupt(fd, text())}>
    <InterruptBubble interrupt={text()} />
  </InstanceDecorator>
</Story>

<Story
  name="Longer answer"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'The step asks for several lines and sets a length limit, so the field is a text area with a counter.'
      }
    }
  }}
>
  <InstanceDecorator width="440px" setup={(fd) => seedInterrupt(fd, notes)}>
    <InterruptBubble interrupt={notes} />
  </InstanceDecorator>
</Story>

<Story
  name="Answered"
  asChild
  parameters={{
    docs: {
      description: { story: 'After the answer the card folds to one line that shows the text.' }
    }
  }}
>
  <InstanceDecorator
    width="440px"
    setup={(fd) => seedInterrupt(fd, text(), { state: 'answered', value: 'Order 4711, please' })}
  >
    <InterruptBubble interrupt={text()} />
  </InstanceDecorator>
</Story>

<Story
  name="Prompt alone"
  parameters={{ docs: { description: { story: 'The field without the card around it.' } } }}
/>

<Story
  name="Sending"
  args={{ isSubmitting: true }}
  parameters={{
    docs: { description: { story: 'The answer is on its way; the field is locked.' } }
  }}
/>
