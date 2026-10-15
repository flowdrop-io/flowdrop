<!--
  @component
  The five run status roles: what each means, its strong and soft colour, and
  the real StatusPill the canvas draws with it. Colours are for the light or
  dark scheme the toolbar is set to.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import StatusPill, { type StatusPillStatus } from '../../components/primitives/StatusPill.svelte';
  import { STATUS_ROLES } from './keyTokens.js';
  import { readTokens, onSkinChange, currentScheme } from './probe.js';
  import './docsChrome.css';

  const roles = STATUS_ROLES.map((r) => ({
    ...r,
    status: r.name.replace('--fd-status-', '') as StatusPillStatus,
    soft: `${r.name}-soft`
  }));

  // Values in the scheme the toolbar shows.
  let values: Record<string, string> = $state({});

  function refresh() {
    const names = roles.flatMap((r) => [r.name, r.soft]);
    values = readTokens(names, currentScheme());
  }

  onMount(() => {
    refresh();
    return onSkinChange(refresh);
  });
</script>

<ul class="roles docs-chrome">
  {#each roles as r (r.name)}
    <li class="roles__row">
      <span class="roles__pill"><StatusPill status={r.status} /></span>
      <span class="roles__text">
        <code>{r.name}</code>
        <span class="roles__use">{r.use}</span>
      </span>
      <span class="roles__chips" aria-hidden="true">
        <span title="Strong" class="roles__chip" style:background={values[r.name]}></span>
        <span title="Soft" class="roles__chip" style:background={values[r.soft]}></span>
      </span>
    </li>
  {/each}
</ul>

<style>
  .roles {
    /* Its own surface: the docs page around it stays light in either scheme. */
    background: var(--docs-bg);
    border-radius: var(--fd-radius-lg);
    list-style: none;
    margin: 0;
    padding: 24px;
    max-width: 880px;
    font-family: var(--fd-font-sans);
    color: var(--docs-fg);
  }
  .roles__row {
    display: grid;
    grid-template-columns: 160px 1fr auto;
    gap: 16px;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid var(--docs-border-muted);
  }
  .roles__text {
    display: grid;
    gap: 2px;
  }
  .roles__text code {
    font-family: var(--fd-font-mono);
    font-size: var(--fd-text-xs);
  }
  .roles__use {
    font-size: var(--fd-text-sm);
    color: var(--docs-muted-fg);
  }
  .roles__chips {
    display: inline-flex;
    gap: 4px;
  }
  .roles__chip {
    width: 20px;
    height: 20px;
    border-radius: var(--fd-radius-sm);
    box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.1);
  }
  @media (max-width: 640px) {
    .roles__row {
      grid-template-columns: 1fr;
      gap: 6px;
    }
  }
</style>
