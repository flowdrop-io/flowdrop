<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import ConfirmationPrompt from './ConfirmationPrompt.svelte';
  import { fn } from 'storybook/test';
  import { createConfirmationConfig } from '../../stories/utils.js';

  const { Story } = defineMeta({
    title: 'Patterns/Interrupt/ConfirmationPrompt',
    component: ConfirmationPrompt,
    tags: ['autodocs'],
    args: {
      config: createConfirmationConfig(),
      isResolved: false,
      isSubmitting: false,
      onConfirm: fn(),
      onDecline: fn()
    }
  });
</script>

<Story name="Pending" />

<Story
  name="Custom Labels"
  args={{
    config: createConfirmationConfig({
      message: 'Deploy to production?',
      confirmLabel: 'Deploy',
      cancelLabel: 'Abort'
    })
  }}
/>

<Story
  name="Submitting"
  args={{
    isSubmitting: true
  }}
/>

<Story
  name="With Error"
  args={{
    error: 'Network error: Failed to submit response'
  }}
/>
