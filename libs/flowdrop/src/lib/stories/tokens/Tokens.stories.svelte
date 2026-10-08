<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import TokensView from './TokensView.svelte';

  // Everything on these pages is parsed from src/lib/styles/tokens.css at load
  // time. Switch light/dark in the toolbar: computed values follow the theme.
  const { Story } = defineMeta({
    title: 'Tokens/Overview',
    component: TokensView,
    tags: ['autodocs'],
    parameters: { layout: 'fullscreen' },
    argTypes: {
      showInternal: {
        control: 'boolean',
        description: 'Include @internal tokens (raw palette, sizes)'
      }
    }
  });

  /** Fails the story test if the parser found nothing to render. */
  async function expectTokens({ canvasElement }: { canvasElement: HTMLElement }) {
    await new Promise((r) => setTimeout(r, 50));
    if (!canvasElement.querySelector('.tok')) throw new Error('No tokens rendered from tokens.css');
  }
</script>

<Story name="Colours" args={{ view: 'colours' }} play={expectTokens} />
<Story name="Status roles" args={{ view: 'status' }} play={expectTokens} />
<Story name="Typography" args={{ view: 'typography' }} play={expectTokens} />
<Story name="Spacing" args={{ view: 'spacing' }} play={expectTokens} />
<Story name="Radii" args={{ view: 'radii' }} play={expectTokens} />
<Story name="Shadows" args={{ view: 'shadows' }} play={expectTokens} />
<Story name="Control and panel heights" args={{ view: 'sizes' }} play={expectTokens} />
<Story name="Other" args={{ view: 'other' }} play={expectTokens} />
<Story
  name="Raw palette (internal)"
  args={{ view: 'colours', showInternal: true }}
  play={expectTokens}
/>
