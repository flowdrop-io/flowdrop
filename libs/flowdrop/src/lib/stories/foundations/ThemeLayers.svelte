<!--
  @component
  The three token layers, with two real chains from tokens.css: a raw palette
  value feeds a meaning token, which feeds the style of one editor part.
  Values are live for the skin and the light or dark scheme selected in the
  toolbar.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { readTokens, skinSetTokens, onSkinChange, currentScheme } from './probe.js';
  import './docsChrome.css';

  const LAYERS = [
    {
      title: '1 · Palette',
      prefix: '--_*',
      text: 'Raw colours. Private: they can change in any release. Never use them.'
    },
    {
      title: '2 · Meaning',
      prefix: '--fd-*',
      text: 'What a colour or size is for. This is the layer you change, and the layer skins change.'
    },
    {
      title: '3 · Editor parts',
      prefix: '--fd-node-*, --fd-edge-*, …',
      text: 'Styles of one part of the editor, built from meaning tokens. Change one only to adjust that part.'
    }
  ];

  const CHAINS = [
    {
      steps: ['--_blue-2', '--fd-primary', '--fd-checkbox-on-bg'],
      caption: 'A checked checkbox is filled with the primary colour.'
    },
    {
      steps: ['--_gray-9', '--fd-foreground', '--fd-caption-node-bg'],
      caption: 'A caption node is drawn in the main text colour, so it reads as a label.'
    }
  ];

  let values: Record<string, string> = $state({});
  let fromSkin: Set<string> = $state(new Set());

  function refresh() {
    values = readTokens(
      CHAINS.flatMap((c) => c.steps),
      currentScheme()
    );
    fromSkin = skinSetTokens();
  }

  onMount(() => {
    refresh();
    return onSkinChange(refresh);
  });
</script>

<div class="layers docs-chrome">
  <ol class="layers__cols">
    {#each LAYERS as layer (layer.title)}
      <li class="layers__col">
        <strong>{layer.title}</strong>
        <code>{layer.prefix}</code>
        <span>{layer.text}</span>
      </li>
    {/each}
  </ol>

  {#each CHAINS as chain (chain.caption)}
    <figure class="layers__chain">
      <div class="layers__steps">
        {#each chain.steps as step, i (step)}
          {#if i > 0}<span class="layers__arrow" aria-hidden="true">→</span>{/if}
          <span class="layers__step" class:layers__step--meaning={i === 1}>
            <code>{step}</code>
            <span class="layers__value">
              {#if values[step]?.match(/^(#|rgb|hsl|oklch)/)}
                <span class="layers__chip" style:background={values[step]}></span>
              {/if}
              {values[step] || '—'}
            </span>
            {#if fromSkin.has(step)}<span class="layers__skin">set by the skin</span>{/if}
          </span>
        {/each}
      </div>
      <figcaption>{chain.caption}</figcaption>
    </figure>
  {/each}
</div>

<style>
  .layers {
    /* Its own surface: the docs page around it stays light in either scheme. */
    background: var(--docs-bg);
    border-radius: var(--fd-radius-lg);
    display: grid;
    gap: 16px;
    padding: 24px;
    max-width: 900px;
    font-family: var(--fd-font-sans);
    color: var(--docs-fg);
  }
  .layers__cols {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
  .layers__col {
    display: grid;
    gap: 6px;
    align-content: start;
    padding: 14px;
    border: 1px solid var(--docs-border);
    border-radius: var(--fd-radius-lg);
    background: var(--docs-bg);
    font-size: var(--fd-text-sm);
  }
  .layers__col:nth-child(2) {
    border-color: var(--docs-accent);
    box-shadow: 0 0 0 3px var(--docs-accent-muted);
  }
  .layers__col code,
  .layers__step code {
    font-family: var(--fd-font-mono);
    font-size: var(--fd-text-xs);
  }
  .layers__col span {
    color: var(--docs-muted-fg);
  }
  .layers__chain {
    margin: 0;
    display: grid;
    gap: 6px;
  }
  .layers__chain figcaption {
    font-size: var(--fd-text-xs);
    color: var(--docs-muted-fg);
  }
  .layers__steps {
    display: grid;
    grid-template-columns: 1fr auto 1fr auto 1fr;
    gap: 8px;
    align-items: center;
  }
  .layers__step {
    display: grid;
    gap: 4px;
    padding: 10px 12px;
    border: 1px solid var(--docs-border);
    border-radius: var(--fd-radius-lg);
    background: var(--docs-bg);
    min-width: 0;
  }
  .layers__step--meaning {
    border-color: var(--docs-accent);
  }
  .layers__value {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    font-family: var(--fd-font-mono);
    font-size: var(--fd-text-2xs);
    color: var(--docs-muted-fg);
    overflow-wrap: anywhere;
  }
  .layers__chip {
    flex: none;
    width: 14px;
    height: 14px;
    border-radius: 3px;
    box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.1);
  }
  .layers__skin {
    justify-self: start;
    padding: 1px 6px;
    border-radius: var(--fd-radius-full);
    background: var(--docs-accent-muted);
    color: var(--docs-accent);
    font-size: var(--fd-text-2xs);
  }
  .layers__arrow {
    color: var(--docs-muted-fg);
  }
  @media (max-width: 720px) {
    .layers__cols,
    .layers__steps {
      grid-template-columns: 1fr;
    }
    .layers__arrow {
      transform: rotate(90deg);
      justify-self: center;
    }
  }
</style>
