<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';
  import Notice from './Notice.svelte';

  const { Story } = defineMeta({
    title: 'Primitives/Notice',
    component: Notice,
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
    argTypes: {
      tone: { control: { type: 'select' }, options: ['info', 'success', 'warning', 'error'] }
    },
    args: { tone: 'info' }
  });

  const tones = ['info', 'success', 'warning', 'error'] as const;
</script>

{#snippet body()}The workflow was saved, but two nodes still need a model.{/snippet}

{#snippet actionsSnippet()}
  <button type="button" style="font:inherit; padding:var(--fd-space-3xs) var(--fd-space-xs);"
    >Fix it</button
  >
  <button type="button" style="font:inherit; padding:var(--fd-space-3xs) var(--fd-space-xs);"
    >Details</button
  >
{/snippet}

<Story name="Info" args={{ tone: 'info', title: 'Heads up' }}>
  {#snippet template(args)}
    <div style="width:420px;"><Notice {...args} children={body} /></div>
  {/snippet}
</Story>
<Story name="Success" args={{ tone: 'success', title: 'Saved' }}>
  {#snippet template(args)}
    <div style="width:420px;"><Notice {...args} children={body} /></div>
  {/snippet}
</Story>
<Story name="Warning" args={{ tone: 'warning', title: 'Incomplete' }}>
  {#snippet template(args)}
    <div style="width:420px;"><Notice {...args} children={body} /></div>
  {/snippet}
</Story>
<Story name="Error" args={{ tone: 'error', title: 'Run failed' }}>
  {#snippet template(args)}
    <div style="width:420px;"><Notice {...args} children={body} /></div>
  {/snippet}
</Story>
<Story name="Body only" args={{ tone: 'info' }}>
  {#snippet template(args)}
    <div style="width:420px;"><Notice {...args} children={body} /></div>
  {/snippet}
</Story>
<Story name="Title only" args={{ tone: 'success', title: 'Copied to clipboard' }}>
  {#snippet template(args)}
    <div style="width:420px;"><Notice {...args} /></div>
  {/snippet}
</Story>
<Story name="With actions" args={{ tone: 'warning', title: 'Incomplete' }}>
  {#snippet template(args)}
    <div style="width:420px;"><Notice {...args} children={body} actions={actionsSnippet} /></div>
  {/snippet}
</Story>
<Story name="Dismissible" args={{ tone: 'error', title: 'Run failed', ondismiss: fn() }}>
  {#snippet template(args)}
    <div style="width:420px;"><Notice {...args} children={body} /></div>
  {/snippet}
</Story>

<Story name="Matrix" asChild>
  <div style="display:flex; flex-direction:column; gap:0.75rem; width:460px;">
    {#each tones as tone (tone)}
      <Notice {tone} title={tone} children={body} actions={actionsSnippet} ondismiss={() => {}} />
      <Notice {tone} children={body} />
    {/each}
  </div>
</Story>

<Story name="Matrix (dark)" globals={{ theme: 'dark' }} asChild>
  <div style="display:flex; flex-direction:column; gap:0.75rem; width:460px;">
    {#each tones as tone (tone)}
      <Notice {tone} title={tone} children={body} actions={actionsSnippet} ondismiss={() => {}} />
    {/each}
  </div>
</Story>
