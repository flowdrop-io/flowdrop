<!--
  @component
  Renders design tokens straight from `src/lib/styles/tokens.css` (imported
  `?raw` and parsed at load time). Nothing here is a copy of a token value;
  computed values come from `getComputedStyle`, so they follow the light/dark
  switch in the Storybook theme toolbar.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import tokensCss from '../../styles/tokens.css?raw';
  import { parseTokens, groupBySection, type TokenCategory } from './parseTokens';

  type View =
    | 'colours'
    | 'status'
    | 'typography'
    | 'spacing'
    | 'radii'
    | 'shadows'
    | 'sizes'
    | 'other';

  interface Props {
    view: View;
    /** Start with `@internal` tokens visible. */
    showInternal?: boolean;
  }

  let { view, showInternal = false }: Props = $props();

  const VIEW_CATEGORIES: Record<View, TokenCategory[]> = {
    colours: ['colour'],
    status: ['status'],
    typography: ['text', 'leading', 'font'],
    spacing: ['spacing'],
    radii: ['radius'],
    shadows: ['shadow'],
    sizes: ['size'],
    other: ['transition', 'other']
  };

  // The light block defines every token; the dark block only overrides some.
  const all = parseTokens(tokensCss).filter((t) => t.theme === 'light');

  // Writable derived: follows the story arg, and the checkbox can still flip it.
  let internal = $derived(showInternal);
  // Bumped whenever the theme attribute changes so computed values refresh.
  let tick = $state(0);
  let root: HTMLElement | undefined = $state();
  let computed: Record<string, string> = $state({});

  const visible = $derived(
    all.filter(
      (t) => VIEW_CATEGORIES[view].includes(t.category) && (internal || t.visibility === 'public')
    )
  );
  const groups = $derived(groupBySection(visible));
  const hiddenCount = $derived(
    all.filter((t) => VIEW_CATEGORIES[view].includes(t.category) && t.visibility === 'internal')
      .length
  );

  function readComputed() {
    if (!root) return;
    const style = getComputedStyle(root);
    const next: Record<string, string> = {};
    for (const t of visible) next[t.name] = style.getPropertyValue(t.name).trim();
    computed = next;
  }

  onMount(() => {
    const observer = new MutationObserver(() => (tick += 1));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class']
    });
    return () => observer.disconnect();
  });

  $effect(() => {
    void tick;
    void visible;
    readComputed();
  });
</script>

<div class="tokens" bind:this={root}>
  <header class="tokens__bar">
    <span class="tokens__count">{visible.length} tokens from <code>tokens.css</code></span>
    <label class="tokens__toggle">
      <input type="checkbox" bind:checked={internal} />
      Show @internal ({hiddenCount})
    </label>
  </header>

  {#each groups as group (group.section)}
    <section class="tokens__section">
      <h3 class="tokens__heading">{group.section}</h3>
      <div class="tokens__grid tokens__grid--{view}">
        {#each group.tokens as t (t.name)}
          <div class="tok" class:tok--internal={t.visibility === 'internal'}>
            {#if view === 'colours' || view === 'status'}
              <div class="tok__swatch" style:background={`var(${t.name})`}></div>
            {:else if view === 'typography'}
              {#if t.name.startsWith('--fd-text-')}
                <div class="tok__sample" style:font-size={`var(${t.name})`}>
                  The quick brown fox
                </div>
              {:else if t.name.startsWith('--fd-font-')}
                <div class="tok__sample" style:font-family={`var(${t.name})`}>
                  The quick brown fox 0123456789
                </div>
              {:else}
                <div class="tok__sample tok__sample--wrap" style:line-height={`var(${t.name})`}>
                  Line height sample. The quick brown fox jumps over the lazy dog and keeps going so
                  the text wraps.
                </div>
              {/if}
            {:else if view === 'spacing'}
              <div class="tok__bar" style:width={`var(${t.name})`}></div>
            {:else if view === 'radii'}
              <div class="tok__radius" style:border-radius={`var(${t.name})`}></div>
            {:else if view === 'shadows'}
              <div class="tok__shadow" style:box-shadow={`var(${t.name})`}></div>
            {:else if view === 'sizes'}
              <div
                class="tok__size"
                style:height={`var(${t.name})`}
                style:width={`var(${t.name})`}
              ></div>
            {/if}
            <div class="tok__meta">
              <code class="tok__name">{t.name}</code>
              <span class="tok__value">{computed[t.name] || t.value}</span>
              {#if t.value !== computed[t.name] && t.value.startsWith('var(')}
                <span class="tok__ref">{t.value}</span>
              {/if}
              {#if t.note}<span class="tok__note">{t.note}</span>{/if}
              {#if t.visibility === 'internal'}<span class="tok__badge">internal</span>{/if}
            </div>
          </div>
        {/each}
      </div>
    </section>
  {:else}
    <p class="tokens__empty">
      No tokens in this group{internal ? '' : ' (try showing @internal)'}.
    </p>
  {/each}
</div>

<style>
  .tokens {
    padding: 1rem 1.25rem 2rem;
    background: var(--fd-background);
    color: var(--fd-foreground);
    font-family: var(--fd-font-sans);
    font-size: 13px;
    min-height: 100vh;
    box-sizing: border-box;
  }
  .tokens__bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--fd-border);
    color: var(--fd-muted-foreground);
  }
  .tokens__toggle {
    display: inline-flex;
    gap: 0.4rem;
    align-items: center;
    cursor: pointer;
  }
  .tokens__heading {
    margin: 1.5rem 0 0.6rem;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--fd-muted-foreground);
  }
  .tokens__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: 0.75rem;
  }
  .tokens__grid--typography,
  .tokens__grid--spacing {
    grid-template-columns: 1fr;
  }
  .tokens__grid--typography .tok,
  .tokens__grid--spacing .tok {
    flex-direction: row;
    align-items: center;
    gap: 1rem;
  }
  .tokens__grid--typography .tok__sample,
  .tokens__grid--spacing .tok__bar {
    flex: 1 1 50%;
  }
  .tokens__grid--typography .tok__meta,
  .tokens__grid--spacing .tok__meta {
    flex: 0 0 320px;
  }
  .tok {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    min-width: 0;
  }
  .tok--internal {
    opacity: 0.75;
  }
  .tok__swatch {
    height: 44px;
    border-radius: 6px;
    border: 1px solid var(--fd-border);
  }
  .tok__sample {
    line-height: 1.3;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .tok__sample--wrap {
    white-space: normal;
    max-width: 36rem;
  }
  .tok__bar {
    height: 14px;
    min-width: 1px;
    background: var(--fd-primary);
    border-radius: 2px;
  }
  .tok__radius {
    width: 72px;
    height: 48px;
    background: var(--fd-muted);
    border: 1px solid var(--fd-border-strong, var(--fd-border));
  }
  .tok__shadow {
    width: 100%;
    height: 56px;
    border-radius: 8px;
    background: var(--fd-card);
  }
  .tok__size {
    background: var(--fd-muted);
    border: 1px solid var(--fd-border);
    border-radius: 4px;
    max-width: 100%;
  }
  .tok__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.15rem 0.5rem;
    align-items: baseline;
    min-width: 0;
  }
  .tok__name {
    font-family: var(--fd-font-mono);
    font-size: 12px;
    word-break: break-all;
  }
  .tok__value,
  .tok__ref,
  .tok__note {
    color: var(--fd-muted-foreground);
    font-size: 12px;
    font-family: var(--fd-font-mono);
    overflow-wrap: anywhere;
  }
  .tok__badge {
    font-size: 10px;
    padding: 0 0.35rem;
    border: 1px solid var(--fd-border);
    border-radius: 999px;
    color: var(--fd-muted-foreground);
  }
  .tokens__empty {
    color: var(--fd-muted-foreground);
    padding: 2rem 0;
  }
</style>
