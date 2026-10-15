<!--
  @component
  One design scale (type, spacing, radius, shadow or control height), drawn
  at its real size with the value the selected skin gives each step.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { SCALES, type ScaleKind } from './keyTokens.js';
  import { readTokens, skinSetTokens, onSkinChange } from './probe.js';

  interface Props {
    kind: ScaleKind;
  }

  let { kind }: Props = $props();

  const steps = $derived(SCALES[kind]);
  let values: Record<string, string> = $state({});
  let fromSkin: Set<string> = $state(new Set());

  /** `0.8125rem` → `13px`; anything else as it is. */
  function px(value: string): string {
    const rem = /^([\d.]+)rem$/.exec(value);
    return rem ? `${Math.round(parseFloat(rem[1]) * 16 * 10) / 10}px` : value;
  }

  function refresh() {
    values = readTokens(
      steps.map((s) => s.name),
      'light'
    );
    fromSkin = skinSetTokens();
  }

  onMount(() => {
    refresh();
    return onSkinChange(refresh);
  });
</script>

<ul class="scale scale--{kind}">
  {#each steps as s (s.name)}
    {@const v = values[s.name] ?? ''}
    <li class="scale__row">
      <span class="scale__sample">
        {#if kind === 'type'}
          <span style:font-size={v}>Run the workflow</span>
        {:else if kind === 'spacing'}
          <span class="scale__space"
            ><span class="scale__box"></span><span class="scale__gap" style:width={v}></span><span
              class="scale__box"
            ></span></span
          >
        {:else if kind === 'radius'}
          <span class="scale__radius" style:border-radius={v}></span>
        {:else if kind === 'shadow'}
          <span class="scale__shadow" style:box-shadow={v}></span>
        {:else}
          <span class="scale__control" style:height={v}>Button</span>
        {/if}
      </span>
      <span class="scale__text">
        <code>{s.name}</code>
        <span class="scale__use">{s.use}</span>
      </span>
      <span class="scale__value">
        {kind === 'shadow' ? '' : px(v)}
        {#if fromSkin.has(s.name)}<span class="scale__skin">set by skin</span>{/if}
      </span>
    </li>
  {/each}
</ul>

<style>
  .scale {
    /* Its own surface: the docs page around it stays light in dark mode. */
    background: var(--fd-background);
    border-radius: var(--fd-radius-lg);
    list-style: none;
    margin: 0;
    padding: 24px;
    display: grid;
    gap: 0;
    max-width: 880px;
    font-family: var(--fd-font-sans);
    color: var(--fd-foreground);
  }
  .scale__row {
    display: grid;
    grid-template-columns: minmax(180px, 1.2fr) 1fr auto;
    gap: 16px;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid var(--fd-border-muted);
  }
  .scale__sample {
    display: flex;
    align-items: center;
    min-height: 32px;
  }
  .scale__text {
    display: grid;
    gap: 2px;
  }
  .scale__text code {
    font-family: var(--fd-font-mono);
    font-size: var(--fd-text-xs);
  }
  .scale__use {
    font-size: var(--fd-text-sm);
    color: var(--fd-muted-foreground);
  }
  .scale__value {
    display: flex;
    gap: 8px;
    align-items: center;
    font-family: var(--fd-font-mono);
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
  }
  .scale__skin {
    font-family: var(--fd-font-sans);
    font-size: var(--fd-text-2xs);
    padding: 1px 6px;
    border-radius: var(--fd-radius-full);
    background: var(--fd-accent-muted);
    color: var(--fd-accent);
  }
  .scale__space {
    display: inline-flex;
    align-items: center;
  }
  .scale__box {
    width: 16px;
    height: 16px;
    border-radius: 3px;
    background: var(--fd-muted);
    box-shadow: inset 0 0 0 1px var(--fd-border-strong);
  }
  .scale__gap {
    height: 16px;
    background: var(--fd-accent-muted);
  }
  .scale__radius {
    width: 56px;
    height: 36px;
    background: var(--fd-card);
    border: 1px solid var(--fd-border-strong);
  }
  .scale__shadow {
    width: 88px;
    height: 44px;
    border-radius: var(--fd-radius-lg);
    background: var(--fd-card);
  }
  .scale--shadow .scale__row {
    padding: 18px 0;
  }
  .scale__control {
    display: inline-flex;
    align-items: center;
    padding: 0 12px;
    border-radius: var(--fd-control-radius);
    border: 1px solid var(--fd-border-strong);
    background: var(--fd-background);
    font-size: var(--fd-text-sm);
  }
  @media (max-width: 640px) {
    .scale__row {
      grid-template-columns: 1fr;
      gap: 6px;
    }
  }
</style>
