<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import EmptyState from './EmptyState.svelte';
  import Button from './Button.svelte';

  const { Story } = defineMeta({
    title: 'Components/EmptyState',
    component: EmptyState,
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
    argTypes: { size: { control: 'select', options: ['sm', 'md'] } },
    args: {
      size: 'sm',
      title: 'No runs yet',
      description: 'Run the workflow to see its steps here.'
    }
  });

  const sizes = ['sm', 'md'] as const;
</script>

{#snippet actions()}
  <Button size="sm" variant="secondary">Run workflow</Button>
{/snippet}

<Story
  name="In the editor"
  parameters={{
    docs: {
      description: {
        story: 'The runs list uses the small size, with a title and a hint, and no icon or actions.'
      }
    }
  }}
>
  {#snippet template(args)}
    <div style="width:280px"><EmptyState {...args} /></div>
  {/snippet}
</Story>

<Story name="With icon and actions" args={{ size: 'md', icon: 'mdi:history' }}>
  {#snippet template(args)}
    <div style="width:300px"><EmptyState {...args} {actions} /></div>
  {/snippet}
</Story>

<Story name="Title only" asChild>
  <div style="width:260px"><EmptyState size="sm" title="No conversations" /></div>
</Story>

<Story name="All variants" parameters={{ layout: 'padded' }} asChild>
  <div style="display:grid; grid-template-columns:repeat(2, 280px); gap:1rem;">
    {#each sizes as size (size)}
      <div style="border:1px dashed var(--fd-border); border-radius:var(--fd-radius-lg);">
        <EmptyState {size} title="{size}: title only" />
      </div>
      <div style="border:1px dashed var(--fd-border); border-radius:var(--fd-radius-lg);">
        <EmptyState
          {size}
          icon="mdi:history"
          title="{size}: everything"
          description="Run the workflow to see its steps here."
          {actions}
        />
      </div>
    {/each}
  </div>
</Story>
