<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Icon from '@iconify/svelte';
  import Chip from './Chip.svelte';
  import { fn } from 'storybook/test';

  const { Story } = defineMeta({
    title: 'Components/Chip',
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

<Story name="Default" asChild>
  <Chip>Draft</Chip>
</Story>

<Story name="Tones" asChild>
  <div style="display: flex; gap: 0.5rem; align-items: center;">
    {#each tones as tone (tone)}
      <Chip {tone}>{tone}</Chip>
    {/each}
  </div>
</Story>

<Story name="With icon" asChild>
  <Chip tone="success">
    {#snippet icon()}<Icon icon="mdi:check-circle-outline" />{/snippet}
    Published
  </Chip>
</Story>

<Story
  name="Removable"
  parameters={{
    docs: {
      description: {
        story: 'With `onremove` the chip gets a trailing x button. Set `removeLabel`.'
      }
    }
  }}
  asChild
>
  <Chip tone="info" onremove={fn()} removeLabel="Remove tag">support</Chip>
</Story>

<Story name="All variants" parameters={{ layout: 'padded' }} asChild>
  <div style="display: grid; gap: 0.75rem; justify-items: start;">
    {#each sizes as size (size)}
      <div style="display: flex; gap: 0.5rem; align-items: center;">
        <code style="font-size: var(--fd-text-xs);">{size}</code>
        {#each tones as tone (tone)}
          <Chip {tone} {size}>{tone}</Chip>
        {/each}
      </div>
      <div style="display: flex; gap: 0.5rem; align-items: center;">
        <code style="font-size: var(--fd-text-xs);">{size} removable</code>
        {#each tones as tone (tone)}
          <Chip {tone} {size} onremove={fn()} removeLabel="Remove {tone}">{tone}</Chip>
        {/each}
      </div>
    {/each}
  </div>
</Story>
