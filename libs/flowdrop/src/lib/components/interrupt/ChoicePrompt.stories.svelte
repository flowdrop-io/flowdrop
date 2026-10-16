<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';
  import ChoicePrompt from './ChoicePrompt.svelte';
  import InterruptBubble from './InterruptBubble.svelte';
  import InstanceDecorator from '../../stories/InstanceDecorator.svelte';
  import { choice, seedInterrupt } from '../../stories/interruptFixtures.js';
  import { createChoiceConfig } from '../../stories/utils.js';

  const { Story } = defineMeta({
    title: 'Editor/Playground/Prompts/Choice prompt',
    component: ChoicePrompt,
    tags: ['autodocs'],
    parameters: { layout: 'padded' },
    args: {
      config: createChoiceConfig(),
      isResolved: false,
      isSubmitting: false,
      onSubmit: fn()
    }
  });

  const features = choice({
    message: 'Which features should we turn on?',
    multiple: true,
    options: [
      { value: 'auth', label: 'Authentication', description: 'User login and signup' },
      { value: 'analytics', label: 'Analytics', description: 'Usage tracking and metrics' },
      { value: 'export', label: 'Data export', description: 'CSV and JSON export' }
    ]
  });
</script>

<Story
  name="In the chat"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'A run reached a Choose step and is waiting. The Playground shows the question as the card title with the options below it.'
      }
    }
  }}
>
  <InstanceDecorator width="440px" setup={(fd) => seedInterrupt(fd, choice())}>
    <InterruptBubble interrupt={choice()} />
  </InstanceDecorator>
</Story>

<Story
  name="Pick several"
  asChild
  parameters={{
    docs: {
      description: {
        story: 'The step allows more than one answer, so the options are check boxes.'
      }
    }
  }}
>
  <InstanceDecorator width="440px" setup={(fd) => seedInterrupt(fd, features)}>
    <InterruptBubble interrupt={features} />
  </InstanceDecorator>
</Story>

<Story
  name="Answered"
  asChild
  parameters={{
    docs: {
      description: {
        story: 'After an answer the card folds to one muted line that names what was chosen.'
      }
    }
  }}
>
  <InstanceDecorator
    width="440px"
    setup={(fd) => seedInterrupt(fd, choice(), { state: 'answered', value: 'high' })}
  >
    <InterruptBubble interrupt={choice()} />
  </InstanceDecorator>
</Story>

<Story
  name="Prompt alone"
  parameters={{
    docs: {
      description: {
        story: 'The prompt without the card around it, for a host that draws its own frame.'
      }
    }
  }}
/>

<Story
  name="Sending"
  args={{ isSubmitting: true }}
  parameters={{
    docs: { description: { story: 'The answer is on its way; the controls are locked.' } }
  }}
/>
