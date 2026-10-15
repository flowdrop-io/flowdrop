<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import InterruptBubble from './InterruptBubble.svelte';
  import InstanceDecorator from '../../stories/InstanceDecorator.svelte';
  import {
    choice,
    confirmation,
    form,
    review,
    seedInterrupt,
    text
  } from '../../stories/interruptFixtures.js';
  import type { MessageHierarchyItem, MessageTag } from '../../types/playground.js';

  const { Story } = defineMeta({
    title: 'Editor/Playground/Interrupt bubble',
    component: InterruptBubble,
    tags: ['autodocs'],
    parameters: { layout: 'padded' }
  });

  const hierarchy: MessageHierarchyItem[] = [
    { id: 'support-flow', label: 'Support flow', icon: 'mdi:graph' },
    { id: 'approve-reply', label: 'Approve reply', icon: 'mdi:check-decagram' }
  ];
  const tags: MessageTag[] = [
    { id: 'run', label: 'Run #142', icon: 'mdi:play-circle', color: 'info', variant: 'subtle' }
  ];

  const all = [confirmation(), choice(), text(), form(), review()];
</script>

<Story
  name="In the chat"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'A run paused to ask something. The question is the card title, the prompt follows, and the footer says which step asked.'
      }
    }
  }}
>
  <InstanceDecorator width="440px" setup={(fd) => seedInterrupt(fd, confirmation())}>
    <InterruptBubble interrupt={confirmation()} {hierarchy} {tags} />
  </InstanceDecorator>
</Story>

<Story
  name="Cancel button"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'When the step lets the person walk away, a Cancel button sits at the end of the title line. Yes or no questions never show it.'
      }
    }
  }}
>
  <InstanceDecorator width="440px" setup={(fd) => seedInterrupt(fd, text())}>
    <InterruptBubble interrupt={text()} />
  </InstanceDecorator>
</Story>

<Story
  name="Cancelled"
  asChild
  parameters={{
    docs: { description: { story: 'The person cancelled. The card folds to one line.' } }
  }}
>
  <InstanceDecorator
    width="440px"
    setup={(fd) => seedInterrupt(fd, text(), { state: 'cancelled' })}
  >
    <InterruptBubble interrupt={text()} />
  </InstanceDecorator>
</Story>

<Story
  name="Answered by someone else"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'A teammate answered while this chat was open. The folded line names them (the server sends their name).'
      }
    }
  }}
>
  <InstanceDecorator
    width="440px"
    setup={(fd) =>
      seedInterrupt(fd, confirmation(undefined, { metadata: { resolvedByUserName: 'Diana' } }), {
        state: 'answered',
        value: true
      })}
  >
    <InterruptBubble
      interrupt={confirmation(undefined, { metadata: { resolvedByUserName: 'Diana' } })}
    />
  </InstanceDecorator>
</Story>

<Story
  name="All types"
  asChild
  parameters={{
    docs: { description: { story: 'The five kinds of question, one after the other.' } }
  }}
>
  <InstanceDecorator width="440px" setup={(fd) => all.forEach((i) => seedInterrupt(fd, i))}>
    {#each all as interrupt (interrupt.id)}
      <InterruptBubble {interrupt} />
    {/each}
  </InstanceDecorator>
</Story>
