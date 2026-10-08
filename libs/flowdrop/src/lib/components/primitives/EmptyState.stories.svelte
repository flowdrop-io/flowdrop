<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import EmptyState from './EmptyState.svelte';
  import Button from './Button.svelte';

  const { Story } = defineMeta({
    title: 'Primitives/EmptyState',
    component: EmptyState,
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
    argTypes: { size: { control: 'select', options: ['sm', 'md'] } },
    args: {
      size: 'md',
      icon: 'mdi:history',
      title: 'No runs yet',
      description: 'Run the workflow to see its steps here.'
    }
  });

  const sizes = ['sm', 'md'] as const;
</script>

{#snippet actions()}
  <Button size="sm" variant="secondary">Run workflow</Button>
{/snippet}

{#snippet matrix()}
  <div style="display:grid; grid-template-columns:repeat(2, 280px); gap:1rem;">
    {#each sizes as size (size)}
      <div style="border:1px dashed var(--fd-border); border-radius:var(--fd-radius-lg);">
        <EmptyState {size} title="Title only" />
      </div>
      <div style="border:1px dashed var(--fd-border); border-radius:var(--fd-radius-lg);">
        <EmptyState
          {size}
          icon="mdi:history"
          title="No runs yet"
          description="Run the workflow to see its steps here."
          {actions}
        />
      </div>
    {/each}
  </div>
{/snippet}

<Story name="Default" asChild>
  <div style="width:300px">
    <EmptyState
      icon="mdi:history"
      title="No runs yet"
      description="Run the workflow to see its steps here."
    />
  </div>
</Story>

<Story name="WithActions" asChild>
  <div style="width:300px">
    <EmptyState
      icon="mdi:history"
      title="No runs yet"
      description="Run the workflow to see its steps here."
      {actions}
    />
  </div>
</Story>

<Story name="Small" asChild>
  <div style="width:260px">
    <EmptyState size="sm" title="No conversations" description="Start one to see it here." />
  </div>
</Story>

<Story name="Matrix" parameters={{ layout: 'padded' }} asChild>
  {@render matrix()}
</Story>

<Story name="MatrixDark" globals={{ theme: 'dark' }} parameters={{ layout: 'padded' }} asChild>
  {@render matrix()}
</Story>
