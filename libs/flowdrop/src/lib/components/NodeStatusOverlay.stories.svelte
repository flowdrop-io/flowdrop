<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import NodeStatusOverlay from './NodeStatusOverlay.svelte';
  import type { NodeExecutionInfo, NodeExecutionStatus } from '../types/index.js';

  const { Story } = defineMeta({
    title: 'Patterns/Editor/NodeStatusOverlay',
    tags: ['autodocs'],
    parameters: {
      layout: 'centered'
    }
  });

  // One execution status per pill status, plus a failure with a count and an
  // error line (hover it) and a loop node with several runs.
  interface Case {
    name: string;
    status: NodeExecutionStatus;
    count: number;
    error?: string;
  }
  const cases: Case[] = [
    { name: 'Running', status: 'running', count: 1 },
    { name: 'Completed', status: 'completed', count: 1 },
    { name: 'Waiting for you', status: 'interrupted', count: 1 },
    { name: 'Failed', status: 'failed', count: 1, error: 'Connection timeout' },
    { name: 'Skipped', status: 'skipped', count: 1 },
    { name: 'Completed x3', status: 'completed', count: 3 }
  ];

  const info = (c: Case): NodeExecutionInfo => ({
    status: c.status,
    executionCount: c.count,
    isExecuting: c.status === 'running',
    lastError: c.error
  });
</script>

{#snippet node(c: Case, zoom: number, testMode: boolean)}
  <!-- The canvas scales the whole node, overlay included; so does this wrapper. -->
  <div style="width: {240 * zoom}px; height: {96 * zoom}px; margin-top: 56px;">
    <div style="width: 240px; height: 96px; transform: scale({zoom}); transform-origin: top left;">
      <div
        style="position: relative; width: 240px; height: 96px; box-sizing: border-box; border: 1.5px solid {testMode
          ? `var(--fd-status-${c.status === 'interrupted' ? 'waiting' : c.status})`
          : 'var(--fd-node-border)'}; border-radius: 10px; background: var(--fd-card); color: var(--fd-foreground); font: 13px var(--fd-font-sans); display: grid; place-items: center;"
      >
        {c.name}
        <NodeStatusOverlay nodeId={c.name} executionInfo={info(c)} {zoom} />
      </div>
    </div>
  </div>
{/snippet}

<Story name="Zoom 100%">
  <div
    style="display: grid; grid-template-columns: repeat(3, auto); gap: 24px 32px; padding: 24px;"
  >
    {#each cases as c (c.name)}
      {@render node(c, 1, false)}
    {/each}
  </div>
</Story>

<Story name="Zoom 50%">
  <div
    style="display: grid; grid-template-columns: repeat(3, auto); gap: 24px 32px; padding: 24px;"
  >
    {#each cases as c (c.name)}
      {@render node(c, 0.5, false)}
    {/each}
  </div>
</Story>

<Story name="Zoom 30%">
  <div
    style="display: grid; grid-template-columns: repeat(3, auto); gap: 24px 32px; padding: 24px;"
  >
    {#each cases as c (c.name)}
      {@render node(c, 0.3, false)}
    {/each}
  </div>
</Story>

<Story name="Test mode: border takes the status colour">
  <div
    style="display: grid; grid-template-columns: repeat(3, auto); gap: 24px 32px; padding: 24px;"
  >
    {#each cases as c (c.name)}
      {@render node(c, 1, true)}
    {/each}
  </div>
</Story>
