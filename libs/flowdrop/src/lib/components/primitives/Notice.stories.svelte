<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';
  import Notice from './Notice.svelte';
  import Button from './Button.svelte';

  const { Story } = defineMeta({
    title: 'Components/Notice',
    component: Notice,
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
    argTypes: {
      tone: { control: { type: 'select' }, options: ['info', 'success', 'warning', 'error'] },
      role: { control: { type: 'select' }, options: [undefined, 'alert', 'status', 'note'] }
    },
    args: { tone: 'info' }
  });

  const tones = ['info', 'success', 'warning', 'error'] as const;
</script>

{#snippet body()}The workflow was saved, but two nodes still need a model.{/snippet}

{#snippet actionsSnippet()}
  <Button size="sm">Fix it</Button>
  <Button size="sm" variant="ghost">Details</Button>
{/snippet}

<Story
  name="Dismissible"
  args={{ tone: 'error', title: 'Run failed', ondismiss: fn(), dismissLabel: 'Dismiss this error' }}
  parameters={{
    docs: {
      description: {
        story:
          'The doctor and run errors can be closed. `dismissLabel` is the accessible name of the x button.'
      }
    }
  }}
>
  {#snippet template(args)}
    <div style="width:420px;"><Notice {...args} children={body} /></div>
  {/snippet}
</Story>

<Story
  name="With actions"
  args={{ tone: 'info' }}
  parameters={{
    docs: {
      description: {
        story:
          'Buttons under the text, for a message the user can act on, such as opening settings.'
      }
    }
  }}
>
  {#snippet template(args)}
    <div style="width:420px;"><Notice {...args} children={body} actions={actionsSnippet} /></div>
  {/snippet}
</Story>

<Story
  name="Not announced on load"
  args={{ tone: 'warning', role: 'note' }}
  parameters={{
    docs: {
      description: {
        story:
          'A warning is normally read out at once (`role="alert"`). When it is on screen from the start, set `role="note"` so a screen reader does not interrupt the user.'
      }
    }
  }}
>
  {#snippet template(args)}
    <div style="width:420px;"><Notice {...args} children={body} /></div>
  {/snippet}
</Story>

<Story name="Title only" args={{ tone: 'success', title: 'Copied to clipboard' }}>
  {#snippet template(args)}
    <div style="width:420px;"><Notice {...args} /></div>
  {/snippet}
</Story>

<Story name="All variants" parameters={{ layout: 'padded' }} asChild>
  <div style="display:flex; flex-direction:column; gap:0.75rem; width:460px;">
    {#each tones as tone (tone)}
      <Notice {tone} title={tone} children={body} actions={actionsSnippet} ondismiss={fn()} />
      <Notice {tone} children={body} />
    {/each}
  </div>
</Story>
