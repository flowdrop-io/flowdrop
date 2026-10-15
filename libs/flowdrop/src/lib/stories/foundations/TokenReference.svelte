<!--
  @component
  The full token list, read from `src/lib/styles/tokens.css` at load time and
  grouped by the file's own sections. Values are what the editor gets with the
  skin selected in the toolbar, in light and dark. Search by name or value.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import tokensCss from '../../styles/tokens.css?raw';
  import {
    parseTokens,
    groupBySection,
    prettySection,
    type ParsedToken,
    type TokenCategory
  } from '../tokens/parseTokens.js';
  import { readTokens, skinSetTokens, onSkinChange } from './probe.js';

  interface Props {
    /** Only tokens of these kinds. All kinds when empty. */
    categories?: TokenCategory[];
    /** Start with `@internal` tokens visible. */
    showInternal?: boolean;
    /** Start with every section closed (for the long, unfiltered list). */
    collapsed?: boolean;
  }

  let { categories = [], showInternal = false, collapsed = false }: Props = $props();

  // The light block declares every token; the dark block only overrides some.
  const all: ParsedToken[] = parseTokens(tokensCss).filter((t) => t.theme === 'light');

  let internal = $derived(showInternal);
  let query = $state('');
  let light: Record<string, string> = $state({});
  let dark: Record<string, string> = $state({});
  let fromSkin: Set<string> = $state(new Set());

  const inScope = $derived(
    all.filter((t) => categories.length === 0 || categories.includes(t.category))
  );
  const hiddenCount = $derived(inScope.filter((t) => t.visibility === 'internal').length);
  const visible = $derived.by(() => {
    const q = query.trim().toLowerCase();
    return inScope.filter(
      (t) =>
        (internal || t.visibility === 'public') &&
        (!q ||
          t.name.includes(q) ||
          t.note.toLowerCase().includes(q) ||
          (light[t.name] ?? '').toLowerCase().includes(q))
    );
  });
  const groups = $derived(groupBySection(visible));

  function isColour(t: ParsedToken): boolean {
    return t.category === 'colour' || t.category === 'status';
  }

  function refresh() {
    const names = inScope.map((t) => t.name);
    light = readTokens(names, 'light');
    dark = readTokens(names, 'dark');
    fromSkin = skinSetTokens();
  }

  onMount(() => {
    refresh();
    return onSkinChange(refresh);
  });
</script>

<div class="ref">
  <header class="ref__bar">
    <input
      class="ref__search"
      type="search"
      placeholder="Search tokens by name or value"
      aria-label="Search tokens"
      bind:value={query}
    />
    <span class="ref__count">{visible.length} tokens</span>
    {#if hiddenCount > 0}
      <label class="ref__toggle">
        <input type="checkbox" bind:checked={internal} />
        Include internal ({hiddenCount})
      </label>
    {/if}
  </header>

  {#each groups as group (group.section)}
    {@const head = prettySection(group.section)}
    <details class="ref__section" open={!collapsed || query.trim() !== ''}>
      <summary class="ref__summary">
        <span class="ref__title">{head.title}</span>
        {#if head.note}<span class="ref__note">{head.note}</span>{/if}
        <span class="ref__n">{group.tokens.length}</span>
      </summary>
      <ul class="ref__list">
        {#each group.tokens as t (t.name)}
          <li class="ref__row" class:ref__row--internal={t.visibility === 'internal'}>
            <span class="ref__preview" aria-hidden="true">
              {#if isColour(t)}
                <span class="ref__chip" style:background={light[t.name]}></span>
                <span class="ref__chip" style:background={dark[t.name]}></span>
              {:else if t.category === 'shadow'}
                <span class="ref__shadow" style:box-shadow={light[t.name]}></span>
              {:else if t.category === 'radius'}
                <span class="ref__radius" style:border-radius={light[t.name]}></span>
              {:else if t.category === 'spacing' || t.category === 'size'}
                <span class="ref__bar" style:width={light[t.name]}></span>
              {:else if t.category === 'text'}
                <span class="ref__text" style:font-size={light[t.name]}>Aa</span>
              {/if}
            </span>
            <span class="ref__main">
              <code class="ref__name">{t.name}</code>
              {#if t.note}<span class="ref__desc">{t.note}</span>{/if}
            </span>
            <span class="ref__values">
              <code title="Light">{light[t.name] || '—'}</code>
              {#if isColour(t) && dark[t.name] !== light[t.name]}
                <code title="Dark">{dark[t.name]}</code>
              {/if}
              {#if fromSkin.has(t.name)}<span class="ref__badge">skin</span>{/if}
              {#if t.visibility === 'internal'}<span class="ref__badge ref__badge--muted"
                  >internal</span
                >{/if}
            </span>
          </li>
        {/each}
      </ul>
    </details>
  {:else}
    <p class="ref__empty">No token matches “{query}”.</p>
  {/each}
</div>

<style>
  .ref {
    /* Its own surface: the docs page around it stays light in dark mode. */
    background: var(--fd-background);
    border-radius: var(--fd-radius-lg);
    display: grid;
    gap: 10px;
    padding: 24px;
    max-width: 960px;
    font-family: var(--fd-font-sans);
    color: var(--fd-foreground);
  }
  .ref__bar {
    position: sticky;
    top: 0;
    z-index: 1;
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    padding: 8px 0 12px;
    background: var(--fd-background);
  }
  .ref__search {
    flex: 1 1 260px;
    height: var(--fd-control-lg);
    padding: 0 10px;
    border: 1px solid var(--fd-border-strong);
    border-radius: var(--fd-control-radius);
    background: var(--fd-background);
    color: var(--fd-foreground);
    font: inherit;
    font-size: var(--fd-text-sm);
  }
  .ref__count,
  .ref__toggle {
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
  }
  .ref__toggle {
    display: inline-flex;
    gap: 6px;
    align-items: center;
  }
  .ref__section {
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-lg);
    background: var(--fd-background);
  }
  .ref__summary {
    display: flex;
    gap: 10px;
    align-items: baseline;
    padding: 10px 14px;
    cursor: pointer;
  }
  .ref__title {
    font-weight: 600;
    font-size: var(--fd-text-sm);
  }
  .ref__note {
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
  }
  .ref__n {
    margin-left: auto;
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
  }
  .ref__list {
    list-style: none;
    margin: 0;
    padding: 0;
    border-top: 1px solid var(--fd-border-muted);
  }
  .ref__row {
    display: grid;
    grid-template-columns: 64px 1fr auto;
    gap: 12px;
    align-items: center;
    padding: 8px 14px;
  }
  .ref__row + .ref__row {
    border-top: 1px solid var(--fd-border-muted);
  }
  .ref__row--internal {
    opacity: 0.7;
  }
  .ref__preview {
    display: flex;
    align-items: center;
    min-height: 24px;
  }
  .ref__chip {
    width: 24px;
    height: 24px;
    box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.1);
  }
  .ref__chip:first-child {
    border-radius: var(--fd-radius-sm) 0 0 var(--fd-radius-sm);
  }
  .ref__chip:last-child {
    border-radius: 0 var(--fd-radius-sm) var(--fd-radius-sm) 0;
  }
  .ref__shadow {
    width: 40px;
    height: 24px;
    border-radius: var(--fd-radius-sm);
    background: var(--fd-card);
  }
  .ref__radius {
    width: 28px;
    height: 28px;
    border: 2px solid var(--fd-accent);
    border-right-color: transparent;
    border-bottom-color: transparent;
  }
  .ref__bar {
    height: 8px;
    max-width: 64px;
    border-radius: 2px;
    background: var(--fd-accent);
  }
  .ref__text {
    line-height: 1;
  }
  .ref__main {
    display: grid;
    gap: 2px;
    min-width: 0;
  }
  .ref__name {
    font-family: var(--fd-font-mono);
    font-size: var(--fd-text-xs);
    overflow-wrap: anywhere;
  }
  .ref__desc {
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
  }
  .ref__values {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 6px;
    align-items: center;
    max-width: 320px;
    font-size: var(--fd-text-2xs);
    color: var(--fd-muted-foreground);
  }
  .ref__values code {
    font-family: var(--fd-font-mono);
    overflow-wrap: anywhere;
  }
  .ref__badge {
    padding: 1px 6px;
    border-radius: var(--fd-radius-full);
    background: var(--fd-accent-muted);
    color: var(--fd-accent);
  }
  .ref__badge--muted {
    background: var(--fd-muted);
    color: var(--fd-muted-foreground);
  }
  .ref__empty {
    font-size: var(--fd-text-sm);
    color: var(--fd-muted-foreground);
  }
  @media (max-width: 640px) {
    .ref__row {
      grid-template-columns: 48px 1fr;
    }
    .ref__values {
      grid-column: 2;
      justify-content: flex-start;
    }
  }
</style>
