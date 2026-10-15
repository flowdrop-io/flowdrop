<!--
  @component
  The colours you use most, grouped by job. Each token shows its value for the
  skin and the light or dark scheme selected in the toolbar.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { KEY_COLOURS, type KeyGroup } from './keyTokens.js';
  import { readTokens, skinSetTokens, onSkinChange, currentScheme, type Scheme } from './probe.js';
  import './docsChrome.css';

  interface Props {
    /** Which groups to show, by title. All when empty. */
    groups?: string[];
  }

  let { groups = [] }: Props = $props();

  const shown: KeyGroup[] = $derived(
    groups.length ? KEY_COLOURS.filter((g) => groups.includes(g.title)) : KEY_COLOURS
  );
  const names = $derived(shown.flatMap((g) => g.tokens.map((t) => t.name)));

  // Values in the scheme the toolbar shows.
  let scheme: Scheme = $state('light');
  let values: Record<string, string> = $state({});
  let fromSkin: Set<string> = $state(new Set());

  function refresh() {
    scheme = currentScheme();
    values = readTokens(names, scheme);
    fromSkin = skinSetTokens();
  }

  onMount(() => {
    refresh();
    return onSkinChange(refresh);
  });
</script>

<div class="key docs-chrome">
  {#each shown as group (group.title)}
    <section class="key__group">
      <h3 class="key__title">{group.title}</h3>
      <p class="key__intro">{group.intro}</p>
      <ul class="key__list">
        {#each group.tokens as t (t.name)}
          <li class="key__row">
            <span class="key__chip" aria-hidden="true" style:background={values[t.name]}></span>
            <span class="key__text">
              <code class="key__name">{t.name}</code>
              <span class="key__use">{t.use}</span>
            </span>
            <span class="key__values">
              <span title="Value ({scheme})">{values[t.name]}</span>
              {#if fromSkin.has(t.name)}<span class="key__skin">set by skin</span>{/if}
            </span>
          </li>
        {/each}
      </ul>
    </section>
  {/each}
  <p class="key__legend">Values for the {scheme} scheme, as set in the toolbar.</p>
</div>

<style>
  .key {
    /* Its own surface: the docs page around it stays light in either scheme. */
    background: var(--docs-bg);
    border-radius: var(--fd-radius-lg);
    display: grid;
    gap: 28px;
    padding: 24px;
    max-width: 880px;
    font-family: var(--fd-font-sans);
    color: var(--docs-fg);
  }
  .key__title {
    margin: 0 0 4px;
    font-size: var(--fd-text-md);
    font-weight: 600;
  }
  .key__intro {
    margin: 0 0 12px;
    font-size: var(--fd-text-sm);
    color: var(--docs-muted-fg);
    max-width: 62ch;
  }
  .key__list {
    list-style: none;
    margin: 0;
    padding: 0;
    border: 1px solid var(--docs-border);
    border-radius: var(--fd-radius-lg);
    overflow: hidden;
  }
  .key__row {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 14px;
    padding: 10px 14px;
    background: var(--docs-bg);
  }
  .key__row + .key__row {
    border-top: 1px solid var(--docs-border-muted);
  }
  .key__chip {
    width: 28px;
    height: 28px;
    border-radius: var(--fd-radius-md);
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
    color: var(--docs-muted-fg);
  }
  .key__values {
    display: flex;
    gap: 10px;
    align-items: center;
    font-family: var(--fd-font-mono);
    font-size: var(--fd-text-2xs);
    color: var(--docs-muted-fg);
  }
  .key__skin {
    font-family: var(--fd-font-sans);
    padding: 1px 6px;
    border-radius: var(--fd-radius-full);
    background: var(--docs-accent-muted);
    color: var(--docs-accent);
  }
  .key__legend {
    margin: 0;
    font-size: var(--fd-text-xs);
    color: var(--docs-muted-fg);
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
