<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';
  import ReviewPrompt from './ReviewPrompt.svelte';
  import InterruptBubble from './InterruptBubble.svelte';
  import InstanceDecorator from '../../stories/InstanceDecorator.svelte';
  import { review, seedInterrupt } from '../../stories/interruptFixtures.js';
  import { createReviewConfig } from '../../stories/utils.js';
  import type { ReviewResolution } from '../../types/interrupt.js';

  const { Story } = defineMeta({
    title: 'Editor/Playground/Prompts/Review prompt',
    component: ReviewPrompt,
    tags: ['autodocs'],
    parameters: { layout: 'padded' },
    args: {
      config: createReviewConfig(),
      isResolved: false,
      isSubmitting: false,
      onSubmit: fn()
    }
  });

  const resolution: ReviewResolution = {
    decisions: {
      title: { accepted: true, value: 'New Title' },
      description: { accepted: false, value: 'Old description text' },
      status: { accepted: true, value: 'published' }
    },
    summary: { accepted: 2, rejected: 1, total: 3 }
  };
</script>

<Story
  name="In the chat"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'A run proposes changes to a record and waits. Each change shows before and after, and the person accepts or rejects it one by one.'
      }
    }
  }}
>
  <InstanceDecorator width="440px" setup={(fd) => seedInterrupt(fd, review())}>
    <InterruptBubble interrupt={review()} />
  </InstanceDecorator>
</Story>

<Story
  name="Answered"
  asChild
  parameters={{
    docs: { description: { story: 'After the review the card folds to one line.' } }
  }}
>
  <InstanceDecorator
    width="440px"
    setup={(fd) => seedInterrupt(fd, review(), { state: 'answered', value: resolution })}
  >
    <InterruptBubble interrupt={review()} />
  </InstanceDecorator>
</Story>

<Story
  name="Many changes"
  args={{
    config: createReviewConfig({
      message: 'Review the content updates:',
      changes: [
        {
          field: 'title',
          label: 'Title',
          original: 'Getting Started',
          proposed: 'Quick Start Guide'
        },
        {
          field: 'slug',
          label: 'URL slug',
          original: '/getting-started',
          proposed: '/quick-start-guide'
        },
        {
          field: 'description',
          label: 'Meta description',
          original: 'Learn how to get started',
          proposed: 'A quick start guide for new users'
        },
        { field: 'author', label: 'Author', original: 'admin', proposed: 'editor' },
        { field: 'status', label: 'Status', original: 'draft', proposed: 'published' }
      ]
    })
  }}
  parameters={{
    docs: { description: { story: 'A longer list. Accept all and Reject all save time.' } }
  }}
/>

<Story
  name="Prompt alone, answered"
  args={{ isResolved: true, resolvedValue: resolution, resolvedByUserName: 'Diana' }}
  parameters={{
    docs: {
      description: {
        story: 'The read-only record of the decisions, with the name of who made them.'
      }
    }
  }}
/>
