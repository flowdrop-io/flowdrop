<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Icon from '@iconify/svelte';
  import Chip from './Chip.svelte';
  import { fn } from 'storybook/test';

  const { Story } = defineMeta({
    title: 'Primitives/Chip',
    component: Chip,
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
    argTypes: {
      tone: {
        control: 'select',
        options: ['neutral', 'accent', 'info', 'success', 'warning', 'error']
      },
      size: { control: 'select', options: ['sm', 'md'] }
    },
    args: { tone: 'neutral', size: 'md', onremove: undefined }
  });

  const tones = ['neutral', 'accent', 'info', 'success', 'warning', 'error'] as const;
  const sizes = ['sm', 'md'] as const;
</script>

{#snippet matrix()}
  <div style="display: grid; gap: 0.75rem; justify-items: start;">
    {#each sizes as size (size)}
      <div style="display: flex; gap: 0.5rem; align-items: center;">
        {#each tones as tone (tone)}
          <Chip {tone} {size}>{tone}</Chip>
        {/each}
      </div>
      <div style="display: flex; gap: 0.5rem; align-items: center;">
        {#each tones as tone (tone)}
          <Chip {tone} {size}>
            {#snippet icon()}<Icon icon="mdi:circle-small" />{/snippet}
            {tone}
          </Chip>
        {/each}
      </div>
      <div style="display: flex; gap: 0.5rem; align-items: center;">
        {#each tones as tone (tone)}
          <Chip {tone} {size} onremove={fn()} removeLabel="Remove {tone}">{tone}</Chip>
        {/each}
      </div>
    {/each}
  </div>
{/snippet}

<Story name="Default" asChild>
  <Chip>Draft</Chip>
</Story>

<Story name="Removable" asChild>
  <Chip tone="info" onremove={fn()} removeLabel="Remove tag">tag</Chip>
</Story>

<Story name="Matrix" parameters={{ layout: 'padded' }} asChild>
  {@render matrix()}
</Story>

<Story name="MatrixDark" globals={{ theme: 'dark' }} parameters={{ layout: 'padded' }} asChild>
  {@render matrix()}
</Story>
