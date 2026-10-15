<!--
  @component
  The colours you use most, grouped by job. Each token shows its light and dark
  value side by side, read from the skin selected in the toolbar.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { KEY_COLOURS, type KeyGroup } from './keyTokens.js';
  import { readTokens, skinSetTokens, onSkinChange } from './probe.js';

  interface Props {
    /** Which groups to show, by title. All when empty. */
    groups?: string[];
  }

  let { groups = [] }: Props = $props();

  const shown: KeyGroup[] = $derived(
    groups.length ? KEY_COLOURS.filter((g) => groups.includes(g.title)) : KEY_COLOURS
  );
  const names = $derived(shown.flatMap((g) => g.tokens.map((t) => t.name)));

  let light: Record<string, string> = $state({});
  let dark: Record<string, string> = $state({});
  let fromSkin: Set<string> = $state(new Set());

  function refresh() {
    light = readTokens(names, 'light');
    dark = readTokens(names, 'dark');
    fromSkin = skinSetTokens();
  }

  onMount(() => {
    refresh();
    return onSkinChange(refresh);
  });
</script>

<div class="key">
  {#each shown as group (group.title)}
    <section class="key__group">
      <h3 class="key__title">{group.title}</h3>
      <p class="key__intro">{group.intro}</p>
      <ul class="key__list">
        {#each group.tokens as t (t.name)}
          <li class="key__row">
            <span class="key__pair" aria-hidden="true">
              <span class="key__chip" style:background={light[t.name]}></span>
              <span class="key__chip" style:background={dark[t.name]}></span>
            </span>
            <span class="key__text">
              <code class="key__name">{t.name}</code>
              <span class="key__use">{t.use}</span>
            </span>
            <span class="key__values">
              <span title="Light">{light[t.name]}</span>
              <span title="Dark">{dark[t.name]}</span>
              {#if fromSkin.has(t.name)}<span class="key__skin">set by skin</span>{/if}
            </span>
          </li>
        {/each}
      </ul>
    </section>
  {/each}
  <p class="key__legend">Left chip light, right chip dark.</p>
</div>

<style>
  .key {
    /* Its own surface: the docs page around it stays light in dark mode. */
    background: var(--fd-background);
    border-radius: var(--fd-radius-lg);
    display: grid;
    gap: 28px;
    padding: 24px;
    max-width: 880px;
    font-family: var(--fd-font-sans);
    color: var(--fd-foreground);
  }
  .key__title {
    margin: 0 0 4px;
    font-size: var(--fd-text-md);
    font-weight: 600;
  }
  .key__intro {
    margin: 0 0 12px;
    font-size: var(--fd-text-sm);
    color: var(--fd-muted-foreground);
    max-width: 62ch;
  }
  .key__list {
    list-style: none;
    margin: 0;
    padding: 0;
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-lg);
    overflow: hidden;
  }
  .key__row {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 14px;
    padding: 10px 14px;
    background: var(--fd-background);
  }
  .key__row + .key__row {
    border-top: 1px solid var(--fd-border-muted);
  }
  .key__pair {
    display: inline-flex;
    border-radius: var(--fd-radius-md);
    overflow: hidden;
    box-shadow: inset 0 0 0 1px var(--fd-border);
  }
  .key__chip {
    width: 28px;
    height: 28px;
    box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.08);
  }
  .key__text {
    display: grid;
    gap: 2px;
    min-width: 0;
  }
  .key__name {
    font-family: var(--fd-font-mono);
    font-size: var(--fd-text-xs);
  }
  .key__use {
    font-size: var(--fd-text-sm);
    color: var(--fd-muted-foreground);
  }
  .key__values {
    display: flex;
    gap: 10px;
    align-items: center;
    font-family: var(--fd-font-mono);
    font-size: var(--fd-text-2xs);
    color: var(--fd-muted-foreground);
  }
  .key__skin {
    font-family: var(--fd-font-sans);
    padding: 1px 6px;
    border-radius: var(--fd-radius-full);
    background: var(--fd-accent-muted);
    color: var(--fd-accent);
  }
  .key__legend {
    margin: 0;
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
  }
  @media (max-width: 640px) {
    .key__row {
      grid-template-columns: auto 1fr;
    }
    .key__values {
      grid-column: 2;
    }
  }
</style>
