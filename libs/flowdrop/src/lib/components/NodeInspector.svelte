<!--
  NodeInspector — what the inspector shows for an open node.

  Edit mode: the config form alone, no tab strip (the editor looks as it always
  has). Test mode: Config | Last run. The config form stays mounted behind the
  Last run tab so an edit in progress is not lost by looking at the last run.
-->

<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { NodeExecutionInfo } from '../types/index.js';
  import {
    nodeInspectorTabs,
    resolveNodeTab,
    type NodeInspectorTab
  } from '../utils/inspectorSurface.js';
  import { getMessages } from '../messages/context.js';
  import NodeLastRun from './NodeLastRun.svelte';

  interface Props {
    editorMode?: 'edit' | 'test';
    /** The requested tab; Edit mode always shows Config. */
    tab?: NodeInspectorTab;
    onTabChange?: (tab: NodeInspectorTab) => void;
    /** The node's execution info for the shown run. */
    info?: NodeExecutionInfo;
    runShown?: boolean;
    /** The node's config form. */
    config: Snippet;
    /** Actions under the Last run facts. */
    lastRunActions?: Snippet;
  }

  let {
    editorMode = 'edit',
    tab = 'config',
    onTabChange,
    info,
    runShown = true,
    config,
    lastRunActions
  }: Props = $props();

  const getMsgs = getMessages();
  const msgs = $derived(getMsgs().nodeInspector);

  const tabs = $derived(nodeInspectorTabs(editorMode));
  const active = $derived(resolveNodeTab(tab, editorMode));
  const labels = $derived({ config: msgs.config, lastRun: msgs.lastRun });
</script>

{#if tabs.length === 0}
  {@render config()}
{:else}
  <div class="node-inspector" data-testid="node-inspector-tabs">
    <div class="node-inspector__bar" role="tablist" aria-label={msgs.tabsLabel}>
      {#each tabs as id (id)}
        <button
          type="button"
          role="tab"
          id="node-inspector-tab-{id}"
          aria-selected={active === id}
          aria-controls="node-inspector-panel-{id}"
          class="node-inspector__tab"
          class:node-inspector__tab--active={active === id}
          onclick={() => onTabChange?.(id)}
        >
          {labels[id]}
        </button>
      {/each}
    </div>
    <div
      role="tabpanel"
      id="node-inspector-panel-config"
      aria-labelledby="node-inspector-tab-config"
      style:display={active === 'config' ? 'block' : 'none'}
    >
      {@render config()}
    </div>
    {#if active === 'lastRun'}
      <div
        role="tabpanel"
        id="node-inspector-panel-lastRun"
        aria-labelledby="node-inspector-tab-lastRun"
      >
        <NodeLastRun {info} {runShown} actions={lastRunActions} />
      </div>
    {/if}
  </div>
{/if}

<style>
  .node-inspector__bar {
    display: flex;
    gap: var(--fd-space-2xs, 2px);
    border-bottom: 1px solid var(--fd-border);
    margin-bottom: var(--fd-space-md);
  }

  .node-inspector__tab {
    padding: 0.375rem 0.75rem;
    font-size: var(--fd-text-xs);
    font-weight: 500;
    cursor: pointer;
    border: none;
    border-bottom: 2px solid transparent;
    background: transparent;
    color: var(--fd-muted-foreground);
    transition: all var(--fd-transition-fast);
  }

  .node-inspector__tab:hover {
    color: var(--fd-foreground);
  }

  .node-inspector__tab--active {
    color: var(--fd-foreground);
    border-bottom-color: var(--fd-primary);
  }
</style>
