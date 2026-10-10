<!--
  NodeInspector — what the inspector shows for an open node.

  A 40px tab row under the meta lines: Config | Ports | Execution, plus Last run
  in Test mode. The form tabs come from the form itself (ConfigForm reports the
  sections it has through the inspector context), so a node without ports or an
  Execution group simply has fewer tabs, and a node with a single tab shows no
  strip at all. The form stays mounted behind every tab, so an edit in progress
  survives looking at another tab or at the last run.

  The external-workflow link ("Runs Calculator ↗") is a row above the tabs.
-->

<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { NodeExecutionInfo } from '../types/index.js';
  import type { NodeInspectorTab } from '../utils/inspectorSurface.js';
  import type { FormSection } from '../utils/inspectorSections.js';
  import { provideInspectorContext, type ExternalLinkInfo } from '../utils/inspectorContext.js';
  import { getMessages } from '../messages/context.js';
  import NodeLastRun from './NodeLastRun.svelte';
  import ExternalLinkRow from './ExternalLinkRow.svelte';
  import Tabs from './primitives/Tabs.svelte';

  interface Props {
    editorMode?: 'edit' | 'test';
    /** `lastRun` shows the Last run tab (Test mode); anything else shows the form tabs. */
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

  /** The form tab last picked (kept while Last run is shown). */
  let formTab = $state<FormSection>('config');
  let sections = $state<FormSection[]>(['config']);
  let external = $state<ExternalLinkInfo | null>(null);

  const showLastRun = $derived(editorMode === 'test');
  const lastRunActive = $derived(showLastRun && tab === 'lastRun');
  const activeForm = $derived<FormSection>(sections.includes(formTab) ? formTab : 'config');
  const active = $derived(lastRunActive ? 'lastRun' : activeForm);

  provideInspectorContext({
    get section() {
      // Nothing matches while Last run is up, so every form tab is hidden.
      return (lastRunActive ? '' : activeForm) as FormSection;
    },
    report(next, link) {
      if (next.join() !== sections.join()) sections = next.length ? next : ['config'];
      external = link;
    }
  });

  const labels = $derived({
    config: msgs.config,
    ports: msgs.ports,
    execution: msgs.execution,
    lastRun: msgs.lastRun
  });
  const tabs = $derived([
    ...sections.map((id) => ({ value: id, label: labels[id] })),
    ...(showLastRun ? [{ value: 'lastRun', label: labels.lastRun }] : [])
  ]);

  function select(value: string): void {
    if (value === 'lastRun') {
      onTabChange?.('lastRun');
      return;
    }
    formTab = value as FormSection;
    if (tab !== 'config') onTabChange?.('config');
  }
</script>

<div class="node-inspector">
  {#if external}
    <div class="node-inspector__external">
      <ExternalLinkRow {...external} />
    </div>
  {/if}
  {#if tabs.length > 1}
    <div class="node-inspector__bar" data-testid="node-inspector-tabs">
      <Tabs
        idBase="node-inspector"
        ariaLabel={msgs.tabsLabel}
        {tabs}
        value={active}
        onchange={select}
      />
    </div>
  {/if}
  <div class="node-inspector__form" style:display={lastRunActive ? 'none' : 'block'}>
    {@render config()}
  </div>
  {#if lastRunActive}
    <div
      role="tabpanel"
      id="node-inspector-panel-lastRun"
      aria-labelledby="node-inspector-tab-lastRun"
    >
      <NodeLastRun {info} {runShown} actions={lastRunActions} />
    </div>
  {/if}
</div>

<style>
  .node-inspector__external {
    margin-bottom: var(--fd-space-md);
  }

  /* The tab row: 40px, full width, stuck under the header once the meta lines
     have scrolled away. Its text lines up with the content's left edge. */
  .node-inspector__bar {
    position: sticky;
    top: 0;
    z-index: 1;
    display: flex;
    align-items: center;
    box-sizing: border-box;
    height: var(--fd-space-5xl);
    margin: 0 calc(-1 * var(--fd-inspector-pad-x, var(--fd-space-xl))) var(--fd-space-xl);
    padding: 0 var(--fd-inspector-pad-x, var(--fd-space-xl));
    background-color: var(--fd-panel-bg, var(--fd-background));
    border-bottom: 1px solid var(--fd-border-muted);
  }

  .node-inspector__bar :global(.flowdrop-ui-tabs) {
    align-self: stretch;
  }

  .node-inspector__bar :global(.flowdrop-ui-tabs__tab) {
    height: 100%;
  }
</style>
