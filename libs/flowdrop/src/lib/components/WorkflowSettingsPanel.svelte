<!--
  WorkflowSettingsPanel
  The workflow-settings surface: General | Interface | Playground as tabs in
  under a title row (title + pop-out + close, as on the node inspector) using the
  same underline Tabs primitive as Nodes | AI Assistant, and one body per tab with
  the same padding on all three.

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
  import Button from './primitives/Button.svelte';
  import { m } from '$lib/messages/index.js';
  import { portal } from '$lib/utils/portal.js';

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

  /** Popped out into a wide centred dialog (the rail then shows a placeholder), as the node inspector can. */
  let expanded = $state(false);

  function dock(): void {
    expanded = false;
  }

  function onModalKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.stopPropagation();
      dock();
    }
  }

  function onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) dock();
  }

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

{#snippet panel(popped: boolean)}
  <div class="wf-settings" data-testid={popped ? undefined : 'workflow-settings-panel'}>
    <!-- Title row, as on the node inspector: the title, then the view tabs beneath it. -->
    <PanelHeader
      class="wf-settings__header"
      title={nav.workflowButton}
      titleId="{idBase}-title"
      borderless
    >
      {#snippet actions()}
        {#if popped}
          <IconButton
            ariaLabel={m().layout.dockConfig}
            title={m().layout.dockConfigTitle}
            onclick={dock}
          >
            <Icon icon="mdi:arrow-collapse" />
          </IconButton>
        {:else}
          <IconButton
            ariaLabel={m().layout.popOutConfig}
            title={m().layout.popOutConfigTitle}
            onclick={() => (expanded = true)}
          >
            <Icon icon="mdi:arrow-expand" />
          </IconButton>
          {#if onClose}
            <IconButton ariaLabel={m().layout.closeConfigPanel} onclick={onClose}>
              <Icon icon="mdi:close" />
            </IconButton>
          {/if}
        {/if}
      {/snippet}
    </PanelHeader>
    <div class="wf-settings__bar">
      <Tabs
        {idBase}
        ariaLabel={nav.workflowSettingsPanelTitle}
        {tabs}
        value={active}
        onchange={(v) => onTabChange(v as WorkflowSettingsTab)}
      />
    </div>

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
              <Icon icon="mdi:content-copy" />
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
{/snippet}

{#if expanded}
  <!-- The content lives in the dialog while popped out; the rail keeps a placeholder. -->
  <div class="wf-settings wf-settings--popped" data-testid="workflow-settings-panel">
    <PanelHeader title={nav.workflowSettingsPanelTitle} />
    <div class="wf-settings__placeholder">
      <p>{m().layout.configPoppedOut}</p>
      <Button variant="secondary" size="sm" onclick={dock}>{m().layout.dockConfigButton}</Button>
    </div>
  </div>
{:else}
  {@render panel(false)}
{/if}

{#if expanded}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="wf-settings-modal__backdrop"
    use:portal
    onclick={onBackdropClick}
    onkeydown={onModalKeydown}
  >
    <div
      class="wf-settings-modal"
      role="dialog"
      aria-modal="true"
      aria-label={nav.workflowSettingsPanelTitle}
      tabindex="-1"
    >
      {@render panel(true)}
    </div>
  </div>
{/if}

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
    padding-inline: var(--fd-space-xl) var(--fd-space-xs);
  }

  /* The tab row under the title: full width, text on the body's left edge. */
  .wf-settings__bar {
    display: flex;
    flex: none;
    box-sizing: border-box;
    padding-inline: var(--fd-space-xl);
    border-bottom: 1px solid var(--fd-border-muted);
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

  .wf-settings-modal > :global(.wf-settings) {
    flex: 1;
    height: auto;
  }

  .wf-settings__placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--fd-space-md);
    padding: var(--fd-space-4xl) var(--fd-space-xl);
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-sm);
    text-align: center;
  }

  .wf-settings__placeholder p {
    margin: 0;
  }

  /* Pop-out dialog: portalled to body, so it restates the app font. */
  .wf-settings-modal__backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--fd-space-xl);
    font-family: var(--fd-font-sans);
    background-color: var(--fd-backdrop);
  }

  .wf-settings-modal {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 48rem;
    max-height: 90vh;
    overflow: hidden;
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-lg);
    background-color: var(--fd-panel-bg);
    box-shadow: var(--fd-shadow-lg);
  }
</style>
