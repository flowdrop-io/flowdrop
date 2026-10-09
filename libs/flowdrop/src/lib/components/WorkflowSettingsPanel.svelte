<!--
  WorkflowSettingsPanel
  The workflow-settings surface: General | Interface | Playground as tabs in
  the 40px panel header (the same Tabs primitive as Nodes | AI Assistant), and
  one body per tab with the same padding on all three.

  All bodies stay mounted (toggled via `display`), so a half-edited field or a
  scroll position survives a trip to another tab.

  The three bodies are snippets: the form, the interface editor and the
  Playground settings keep their wiring in App.svelte.
-->

<script lang="ts" module>
  export type WorkflowSettingsTab = 'settings' | 'interface' | 'playground';
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from '@iconify/svelte';
  import PanelHeader from './primitives/PanelHeader.svelte';
  import Tabs, { tabId, tabPanelId } from './primitives/Tabs.svelte';
  import IconButton from './primitives/IconButton.svelte';
  import { m } from '$lib/messages/index.js';

  interface Props {
    /** Selected tab. A `playground` pick without a `playground` body falls back to General. */
    tab: WorkflowSettingsTab;
    onTabChange: (tab: WorkflowSettingsTab) => void;
    /** The workflow's id, shown with a copy button. */
    workflowId?: string;
    nodeCount: number;
    connectionCount: number;
    /** Adds the close control to the header. */
    onClose?: () => void;
    general: Snippet;
    interfaceBody: Snippet;
    /** Present only while the workflow carries Playground settings. */
    playground?: Snippet;
  }

  let {
    tab,
    onTabChange,
    workflowId,
    nodeCount,
    connectionCount,
    onClose,
    general,
    interfaceBody,
    playground
  }: Props = $props();

  const nav = $derived(m().navigation);
  const uid = $props.id();
  const idBase = `flowdrop-wf-settings-${uid}`;

  const active = $derived<WorkflowSettingsTab>(
    tab === 'playground' && !playground ? 'settings' : tab
  );

  const tabs = $derived([
    { value: 'settings', label: nav.workflowSettingsGeneralTab },
    { value: 'interface', label: nav.workflowSettingsInterfaceTab },
    ...(playground ? [{ value: 'playground', label: nav.workflowSettingsPlaygroundTab }] : [])
  ]);

  function copyId(): void {
    if (workflowId) void navigator.clipboard?.writeText(workflowId);
  }
</script>

{#snippet body(value: WorkflowSettingsTab, content: Snippet)}
  <div
    class="wf-settings__panel"
    role="tabpanel"
    id={tabPanelId(idBase, value)}
    aria-labelledby={tabId(idBase, value)}
    style:display={active === value ? 'block' : 'none'}
  >
    {@render content()}
  </div>
{/snippet}

<div class="wf-settings" data-testid="workflow-settings-panel">
  <PanelHeader class="wf-settings__header">
    {#snippet leading()}
      <Tabs
        {idBase}
        ariaLabel={nav.workflowSettingsPanelTitle}
        {tabs}
        value={active}
        onchange={(v) => onTabChange(v as WorkflowSettingsTab)}
      />
    {/snippet}
    {#snippet actions()}
      {#if onClose}
        <IconButton ariaLabel={m().layout.closeConfigPanel} onclick={onClose}>
          <Icon icon="heroicons:x-mark" />
        </IconButton>
      {/if}
    {/snippet}
  </PanelHeader>

  <div class="wf-settings__scroll">
    {#snippet generalBody()}
      <p class="wf-settings__meta" data-testid="workflow-settings-meta">
        {#if workflowId}
          <code class="wf-settings__id">{workflowId}</code>
          <IconButton
            size="sm"
            title={nav.copyId}
            ariaLabel={nav.copyId}
            onclick={copyId}
            class="wf-settings__copy"
          >
            <Icon icon="heroicons:clipboard-document" />
          </IconButton>
          <span aria-hidden="true">·</span>
        {/if}
        <span>{nav.workflowCounts({ nodes: nodeCount, connections: connectionCount })}</span>
      </p>
      {@render general()}
    {/snippet}
    {@render body('settings', generalBody)}
    {@render body('interface', interfaceBody)}
    {#if playground}
      {@render body('playground', playground)}
    {/if}
  </div>
</div>

<style>
  .wf-settings {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    background-color: var(--fd-panel-bg);
    backdrop-filter: var(--fd-panel-backdrop-filter);
  }

  .wf-settings :global(.wf-settings__header) {
    padding-inline: var(--fd-space-sm) var(--fd-space-xs);
  }

  .wf-settings__scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  /* One padding for all three tabs. */
  .wf-settings__panel {
    padding: var(--fd-space-xl);
  }

  .wf-settings__meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--fd-space-xs);
    margin: 0 0 var(--fd-space-xl);
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-xs);
  }

  .wf-settings__id {
    font-family: var(--fd-font-mono);
    font-size: inherit;
    color: var(--fd-foreground);
  }

  .wf-settings__meta :global(.wf-settings__copy) {
    margin-inline: calc(var(--fd-space-3xs) * -1) 0;
  }
</style>
