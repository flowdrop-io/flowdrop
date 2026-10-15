<!--
  @component
  The full token list, read from `src/lib/styles/tokens.css` at load time and
  grouped by the file's own sections. Sections are split into two tiers: the
  base tokens new UI builds with, and the tokens that restyle one part of the
  editor. Values are what the editor gets with the skin selected in the
  toolbar, in the light or dark scheme the toolbar is set to. Search by name or value;
  click a name to copy.
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
  import {
    readTokens,
    skinDeclarations,
    onSkinChange,
    currentScheme,
    type Scheme
  } from './probe.js';
  import './docsChrome.css';

  interface Props {
    /** Only tokens of these kinds. All kinds when empty. */
    categories?: TokenCategory[];
    /** Start with `@internal` tokens visible. */
    showInternal?: boolean;
    /** Start with every section closed (for the long, unfiltered list). */
    collapsed?: boolean;
  }

  let { categories = [], showInternal = false, collapsed = false }: Props = $props();

  type Tier = 'base' | 'parts';

  /**
   * Sections whose tokens any new UI may use. Every other section belongs to
   * one part of the editor (nodes, wires, navbar…), so an unknown new section
   * lands with the parts, never among the tokens we recommend.
   */
  const BASE_SECTION =
    /^(surfaces|surface tint|borders|primary|secondary|accent|status:|run status roles|spacing|border radius|shadows|font|line heights|control and panel heights|transitions)/i;

  const TIERS: Array<{ id: Tier; label: string; hint: string }> = [
    { id: 'base', label: 'Base tokens', hint: 'Use these when you build new UI.' },
    {
      id: 'parts',
      label: 'Editor parts',
      hint: 'Each one restyles one part of the editor, such as nodes, wires or the navbar. Change them in a skin; do not use them for new UI.'
    }
  ];

  // The light block declares every token; the dark block only overrides some.
  const parsed = parseTokens(tokensCss);
  const all: ParsedToken[] = parsed.filter((t) => t.theme === 'light');
  const libraryDark = new Map(
    parsed.filter((t) => t.theme === 'dark').map((t) => [t.name, t.value])
  );

  let internal = $derived(showInternal);
  let query = $state('');
  let tier: Tier = $state('base');
  // Values in the scheme the toolbar shows, as a node or panel there would get them.
  let scheme: Scheme = $state('light');
  let values: Record<string, string> = $state({});
  let skin: Record<Scheme, Record<string, string>> = $state({ light: {}, dark: {} });
  const fromSkin = $derived(new Set([...Object.keys(skin.light), ...Object.keys(skin.dark)]));
  let copied = $state('');

  function tierOf(t: ParsedToken): Tier {
    return BASE_SECTION.test(prettySection(t.section).title) ? 'base' : 'parts';
  }

  const inScope = $derived(
    all.filter((t) => categories.length === 0 || categories.includes(t.category))
  );
  const hiddenCount = $derived(inScope.filter((t) => t.visibility === 'internal').length);
  const matching = $derived.by(() => {
    const q = query.trim().toLowerCase();
    return inScope.filter(
      (t) =>
        (internal || t.visibility === 'public') &&
        (!q ||
          t.name.includes(q) ||
          declared(t).toLowerCase().includes(q) ||
          t.note.toLowerCase().includes(q) ||
          (values[t.name] ?? '').toLowerCase().includes(q))
    );
  });
  const counts = $derived({
    base: matching.filter((t) => tierOf(t) === 'base').length,
    parts: matching.filter((t) => tierOf(t) === 'parts').length
  });
  // The switch only earns its place when both tiers have tokens to show.
  const listable = $derived(inScope.filter((t) => internal || t.visibility === 'public'));
  const showTiers = $derived(
    listable.some((t) => tierOf(t) === 'base') && listable.some((t) => tierOf(t) === 'parts')
  );
  const visible = $derived(showTiers ? matching.filter((t) => tierOf(t) === tier) : matching);
  const groups = $derived(groupBySection(visible));
  const activeHint = $derived(TIERS.find((x) => x.id === tier)?.hint ?? '');

  function isColour(t: ParsedToken): boolean {
    return t.category === 'colour' || t.category === 'status';
  }

  /**
   * The value as written for the current scheme, before references resolve.
   * Both skin rules outrank tokens.css, and in dark the skin's light rule still
   * beats the library's dark block.
   */
  function declared(t: ParsedToken): string {
    if (scheme === 'light') return skin.light[t.name] ?? t.value;
    return skin.dark[t.name] ?? skin.light[t.name] ?? libraryDark.get(t.name) ?? t.value;
  }

  /** `var(--fd-gray-9)` → `--fd-gray-9`; anything else → ''. */
  function aliasOf(value: string): string {
    return /^var\(\s*(--[\w-]+)\s*\)$/.exec(value)?.[1] ?? '';
  }

  /** Look up the token a value comes from, revealing it wherever it is listed. */
  function follow(name: string) {
    const target = all.find((t) => t.name === name);
    if (target?.visibility === 'internal') internal = true;
    if (target) tier = tierOf(target);
    query = name;
  }

  async function copy(name: string) {
    try {
      await navigator.clipboard.writeText(`var(${name})`);
      copied = name;
      setTimeout(() => {
        if (copied === name) copied = '';
      }, 1200);
    } catch {
      // No clipboard (insecure context, denied permission): the name stays selectable.
    }
  }

  function refresh() {
    const names = inScope.map((t) => t.name);
    scheme = currentScheme();
    values = readTokens(names, scheme);
    skin = skinDeclarations();
  }

  onMount(() => {
    refresh();
    return onSkinChange(refresh);
  });
</script>

<div class="ref docs-chrome">
  <header class="ref__bar">
    <div class="ref__controls">
      <input
        class="ref__search"
        type="search"
        placeholder="Search by name or value, e.g. border or #fff"
        aria-label="Search tokens"
        bind:value={query}
      />
      {#if hiddenCount > 0}
        <label
          class="ref__toggle"
          title="Used inside the library only. They may change in any release."
        >
          <input type="checkbox" bind:checked={internal} />
          Show internal tokens ({hiddenCount})
        </label>
      {/if}
    </div>
    {#if showTiers}
      <div class="ref__tiers" role="group" aria-label="Token tier">
        {#each TIERS as t (t.id)}
          <button
            type="button"
            class="ref__tier"
            aria-pressed={tier === t.id}
            onclick={() => (tier = t.id)}
          >
            {t.label} <span class="ref__tier-n">{counts[t.id]}</span>
          </button>
        {/each}
      </div>
      <p class="ref__hint">{activeHint}</p>
    {/if}
    <p class="ref__legend">
      Click a name to copy <code>var(--fd-…)</code>.
      <span class="ref__skin"></span> the selected skin sets this value.
      <span class="ref__arrow">→</span> the token it takes its value from.
    </p>
  </header>

  {#each groups as group (group.section)}
    {@const head = prettySection(group.section)}
    <details class="ref__section" open={!collapsed || query.trim() !== ''}>
      <summary class="ref__summary">
        <span class="ref__title">{head.title}</span>
        {#if head.note}<span class="ref__note">{head.note}</span>{/if}
        <span class="ref__n">{group.tokens.length}</span>
      </summary>
      <div class="ref__row ref__row--head" aria-hidden="true">
        <span></span>
        <span>Token</span>
        <span>Value ({scheme})</span>
      </div>
      <ul class="ref__list">
        {#each group.tokens as t (t.name)}
          {@const written = declared(t)}
          {@const alias = aliasOf(written)}
          <li class="ref__row" class:ref__row--internal={t.visibility === 'internal'}>
            <span class="ref__preview" aria-hidden="true">
              {#if isColour(t)}
                <span class="ref__chip" style:background={values[t.name]}></span>
              {:else if t.category === 'shadow'}
                <span class="ref__shadow" style:box-shadow={values[t.name]}></span>
              {:else if t.category === 'radius'}
                <span class="ref__radius" style:border-radius={values[t.name]}></span>
              {:else if t.category === 'spacing' || t.category === 'size'}
                <span class="ref__length" style:width={values[t.name]}></span>
              {:else if t.category === 'text'}
                <span class="ref__text" style:font-size={values[t.name]}>Aa</span>
              {/if}
            </span>
            <span class="ref__main">
              <span class="ref__name-line">
                <button
                  type="button"
                  class="ref__name"
                  title="Copy var({t.name})"
                  onclick={() => copy(t.name)}>{t.name}</button
                >
                {#if copied === t.name}<span class="ref__copied" role="status">Copied</span>{/if}
                {#if fromSkin.has(t.name)}<span class="ref__skin" title="Set by the selected skin"
                  ></span>{/if}
                {#if t.visibility === 'internal'}<span class="ref__badge ref__badge--muted"
                    >internal</span
                  >{/if}
              </span>
              {#if t.note}<span class="ref__desc">{t.note}</span>{/if}
            </span>
            <span class="ref__value">
              {#if alias}
                <span class="ref__alias">
                  <span class="ref__arrow">→</span>
                  <button type="button" class="ref__alias-link" onclick={() => follow(alias)}
                    >{alias}</button
                  >
                </span>
                <code class="ref__resolved">{values[t.name]}</code>
              {:else if written.includes('var(')}
                <code>{written}</code>
                <code class="ref__resolved">{values[t.name]}</code>
              {:else}
                <code>{values[t.name] || '—'}</code>
              {/if}
            </span>
          </li>
        {/each}
      </ul>
    </details>
  {:else}
    <p class="ref__empty">
      No token matches “{query}”{#if showTiers && counts[tier === 'base' ? 'parts' : 'base'] > 0}
        here; {counts[tier === 'base' ? 'parts' : 'base']} under
        <button
          type="button"
          class="ref__alias-link"
          onclick={() => (tier = tier === 'base' ? 'parts' : 'base')}
          >{TIERS.find((x) => x.id !== tier)?.label}</button
        >{/if}.
    </p>
  {/each}
</div>

<style>
  .ref {
    background: var(--docs-bg);
    border-radius: var(--fd-radius-lg);
    display: grid;
    gap: 10px;
    padding: 24px;
    max-width: 960px;
    font-family: var(--fd-font-sans);
    color: var(--docs-fg);
  }
  .ref__bar {
    position: sticky;
    top: 0;
    z-index: 1;
    display: grid;
    gap: 10px;
    padding: 8px 0 12px;
    background: var(--docs-bg);
    border-bottom: 1px solid var(--docs-border-muted);
  }
  .ref__controls {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
  }
  .ref__search {
    flex: 1 1 260px;
    height: var(--fd-control-lg);
    padding: 0 10px;
    border: 1px solid var(--docs-border-strong);
    border-radius: var(--fd-control-radius);
    background: var(--docs-bg);
    color: var(--docs-fg);
    font: inherit;
    font-size: var(--fd-text-sm);
  }
  .ref__toggle {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    font-size: var(--fd-text-xs);
    color: var(--docs-muted-fg);
    cursor: pointer;
  }
  .ref__tiers {
    display: inline-flex;
    justify-self: start;
    padding: 2px;
    gap: 2px;
    border-radius: var(--fd-control-radius);
    background: var(--docs-subtle);
  }
  .ref__tier {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    height: var(--fd-control-md);
    padding: 0 12px;
    border: 0;
    border-radius: calc(var(--fd-control-radius) - 2px);
    background: transparent;
    color: var(--docs-muted-fg);
    font: inherit;
    font-size: var(--fd-text-sm);
    font-weight: 500;
    cursor: pointer;
  }
  .ref__tier[aria-pressed='true'] {
    background: var(--docs-bg);
    color: var(--docs-fg);
    box-shadow: var(--docs-shadow);
  }
  .ref__tier-n {
    font-size: var(--fd-text-xs);
    color: var(--docs-muted-fg);
  }
  .ref__hint,
  .ref__legend {
    margin: 0;
    font-size: var(--fd-text-xs);
    color: var(--docs-muted-fg);
  }
  .ref__hint {
    color: var(--docs-fg);
  }
  .ref__legend code {
    font-family: var(--fd-font-mono);
  }
  .ref__section {
    border: 1px solid var(--docs-border);
    border-radius: var(--fd-radius-lg);
    background: var(--docs-bg);
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
    color: var(--docs-muted-fg);
  }
  .ref__n {
    margin-left: auto;
    font-size: var(--fd-text-xs);
    color: var(--docs-muted-fg);
  }
  .ref__list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .ref__row {
    display: grid;
    grid-template-columns: 40px minmax(0, 1fr) minmax(120px, 280px);
    gap: 12px;
    align-items: center;
    padding: 8px 14px;
    border-top: 1px solid var(--docs-border-muted);
  }
  .ref__row--head {
    padding-block: 6px;
    font-size: var(--fd-text-2xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--docs-muted-fg);
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
    width: 28px;
    height: 24px;
    border-radius: var(--fd-radius-sm);
    box-shadow: inset 0 0 0 1px var(--docs-border);
  }
  .ref__shadow {
    width: 40px;
    height: 24px;
    border-radius: var(--fd-radius-sm);
    background: var(--docs-bg);
  }
  .ref__radius {
    width: 28px;
    height: 28px;
    border: 2px solid var(--docs-accent);
    border-right-color: transparent;
    border-bottom-color: transparent;
  }
  .ref__length {
    height: 8px;
    max-width: 56px;
    border-radius: 2px;
    background: var(--docs-accent);
  }
  .ref__text {
    line-height: 1;
  }
  .ref__main {
    display: grid;
    gap: 2px;
    min-width: 0;
  }
  .ref__name-line {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }
  .ref__name {
    padding: 0;
    border: 0;
    background: none;
    color: var(--docs-fg);
    font-family: var(--fd-font-mono);
    font-size: var(--fd-text-xs);
    font-weight: 600;
    text-align: left;
    overflow-wrap: anywhere;
    cursor: copy;
  }
  .ref__name:hover {
    color: var(--docs-accent);
    text-decoration: underline;
  }
  .ref__copied {
    font-size: var(--fd-text-2xs);
    color: var(--docs-success);
  }
  .ref__alias {
    display: flex;
    gap: 4px;
    align-items: baseline;
    font-size: var(--fd-text-xs);
  }
  .ref__arrow {
    color: var(--docs-muted-fg);
  }
  .ref__alias-link {
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font-family: var(--fd-font-mono);
    font-size: inherit;
    text-decoration: underline dotted;
    cursor: pointer;
  }
  .ref__alias-link:hover {
    color: var(--docs-accent);
  }
  .ref__desc {
    font-size: var(--fd-text-xs);
    color: var(--docs-muted-fg);
  }
  .ref__value {
    display: grid;
    gap: 2px;
    min-width: 0;
    font-size: var(--fd-text-2xs);
    color: var(--docs-fg);
  }
  .ref__value code {
    font-family: var(--fd-font-mono);
    overflow-wrap: anywhere;
  }
  .ref__value .ref__resolved {
    color: var(--docs-muted-fg);
  }
  .ref__skin {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: var(--fd-radius-full);
    background: var(--docs-accent);
    vertical-align: middle;
  }
  .ref__badge {
    padding: 1px 6px;
    border-radius: var(--fd-radius-full);
    background: var(--docs-accent-muted);
    color: var(--docs-accent);
    font-size: var(--fd-text-2xs);
    white-space: nowrap;
  }
  .ref__badge--muted {
    background: var(--docs-subtle);
    color: var(--docs-muted-fg);
  }
  .ref__empty {
    font-size: var(--fd-text-sm);
    color: var(--docs-muted-fg);
  }
  .ref__empty .ref__alias-link {
    font-family: inherit;
  }
  @media (max-width: 640px) {
    .ref__row {
      grid-template-columns: 40px minmax(0, 1fr);
    }
    .ref__row--head {
      display: none;
    }
    .ref__value {
      grid-column: 2;
    }
  }
</style>
