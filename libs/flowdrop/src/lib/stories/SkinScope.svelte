<!--
  @component
  Shows its children in one of the two message layouts, whatever skin the
  Storybook toolbar has picked.

  `document` is Graphite's layout (the editor's default): no bubble around a
  reply, a light line of meta text under each message. `bubbles` is the layout
  of the other skins: avatar, header and a bubble. The bubbles layout resets the
  layout tokens that `display.messages: 'document'` sets, so the message
  components fall back to their own bubble look.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { effectiveSkinTokens } from '../themes/scopedSkinCss.js';

  interface Props {
    /** Which layout to show. */
    layout: 'document' | 'bubbles';
    /** Width of the wrapper. @default '100%' */
    width?: string;
    children: Snippet;
  }

  const { layout, width = '100%', children }: Props = $props();

  const documentTokens = Object.keys(effectiveSkinTokens(undefined, { messages: 'document' }));
  // `initial` makes var(--x, fallback) use its fallback: the message components' own look.
  // svelte-ignore state_referenced_locally
  const style =
    layout === 'bubbles' ? documentTokens.map((k) => `--fd-${k}: initial`).join('; ') : '';
</script>

<div class="skin-scope" {style} style:width>
  {@render children()}
</div>

<style>
  .skin-scope {
    position: relative;
    background: var(--fd-background);
  }
</style>
