<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Logo from './Logo.svelte';
  import LogoWordmark from './LogoWordmark.svelte';

  const { Story } = defineMeta({
    title: 'Components/Logo',
    component: Logo,
    tags: ['autodocs']
  });

  const sizes = [24, 48, 96];
</script>

<Story
  name="Mark"
  parameters={{
    docs: {
      description: {
        story: 'The square mark fills the box you give it. Three sizes, side by side.'
      }
    }
  }}
  asChild
>
  <div style="display: flex; gap: 1.5rem; align-items: flex-end;">
    {#each sizes as size (size)}
      <div style="display: grid; gap: 0.5rem; justify-items: center;">
        <div style="width: {size}px; height: {size}px;"><Logo /></div>
        <code style="font-size: var(--fd-text-xs);">{size}px</code>
      </div>
    {/each}
  </div>
</Story>

<Story
  name="In the editor (wordmark)"
  parameters={{
    docs: {
      description: {
        story:
          '`LogoWordmark` is the mark with the name, five times wider than tall. The navbar shows it at the top left.'
      }
    }
  }}
  asChild
>
  <div style="width: 160px; height: 32px;"><LogoWordmark /></div>
</Story>

<Story name="Wordmark sizes" asChild>
  <div style="display: grid; gap: 1rem; justify-items: start;">
    {#each [20, 32, 64] as height (height)}
      <div style="height: {height}px; width: {height * 5}px;"><LogoWordmark /></div>
    {/each}
  </div>
</Story>
