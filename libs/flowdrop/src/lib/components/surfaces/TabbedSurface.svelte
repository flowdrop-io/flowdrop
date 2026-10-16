<!--
  TabbedSurface
  A reusable tabbed container that hosts one or more "surfaces" (config panel,
  console, AI Assistant). Promotes the bottom-panel tab strip so the same
  container can host surfaces in the sidebar, bottom panel, or a modal overlay.

  All tab bodies stay mounted (toggled via `display`) so surface state — console
  scrollback, chat history, in-progress form edits — survives tab switches. The
  tab bar hides itself when only a single surface is present, so a lone surface
  reads as a plain panel with no redundant chrome.
-->

<script lang="ts">
  import type { Snippet } from 'svelte';
  import PanelHeader from '../primitives/PanelHeader.svelte';
  import Tabs, { tabId, tabPanelId } from '../primitives/Tabs.svelte';

  /** A single hostable surface. */
  export interface SurfaceTab {
    /** Stable identifier, unique within the host. */
    id: string;
    /** Tab-strip label. */
    label: string;
    /** Body content. Rendered once — a surface has exactly one host. */
    content: Snippet;
    /**
     * `display` value applied while active. Some surfaces (the console) expect
     * to be a direct flex child of the content area and use `contents`; most
     * use `flex`. Defaults to `flex`.
     */
    display?: 'flex' | 'contents';
  }

  interface Props {
    /** Surfaces to host, in tab order. */
    tabs: SurfaceTab[];
    /** Currently active tab id. */
    activeId: string;
    /** Called when a tab is selected. */
    onSelect: (id: string) => void;
    /**
     * Right-aligned controls in the 40px panel header (e.g. the sidebar collapse
     * button). Giving it also shows the header for a lone surface, with that
     * surface's label as the title.
     */
    headerActions?: Snippet;
    /** Accessible name of the tab list. */
    ariaLabel?: string;
  }

  const { tabs, activeId, onSelect, headerActions, ariaLabel = 'Panels' }: Props = $props();

  const generatedId = $props.id();
  const idBase = `flowdrop-surface-${generatedId}`;

  // Fall back to the first tab when `activeId` doesn't match any present tab
  // (e.g. the active surface was just routed to a different host).
  const resolvedActiveId = $derived(
    tabs.some((t) => t.id === activeId) ? activeId : (tabs[0]?.id ?? '')
  );
</script>

<div class="tabbed-surface">
  {#if tabs.length > 1 || headerActions}
    <PanelHeader class="tabbed-surface__header">
      {#snippet leading()}
        {#if tabs.length > 1}
          <Tabs
            {idBase}
            {ariaLabel}
            tabs={tabs.map((t) => ({ value: t.id, label: t.label }))}
            value={resolvedActiveId}
            onchange={onSelect}
          />
        {:else}
          <h2 class="tabbed-surface__title">{tabs[0]?.label}</h2>
        {/if}
      {/snippet}
      {#snippet actions()}
        {@render headerActions?.()}
      {/snippet}
    </PanelHeader>
  {/if}

  <div class="tabbed-surface__content">
    {#each tabs as tab (tab.id)}
      <div
        class="tabbed-surface__panel"
        role={tabs.length > 1 ? 'tabpanel' : undefined}
        id={tabs.length > 1 ? tabPanelId(idBase, tab.id) : undefined}
        aria-labelledby={tabs.length > 1 ? tabId(idBase, tab.id) : undefined}
        style:display={tab.id === resolvedActiveId ? (tab.display ?? 'flex') : 'none'}
      >
        {@render tab.content()}
      </div>
    {/each}
  </div>
</div>

<style>
  .tabbed-surface {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .tabbed-surface :global(.tabbed-surface__header) {
    padding-inline: var(--fd-space-xl) var(--fd-space-xs);
  }

  /* View tabs fill the header, so the underline sits on its rule. */
  .tabbed-surface :global(.flowdrop-ui-panel-header__lead) {
    align-self: stretch;
    align-items: stretch;
  }

  .tabbed-surface :global(.flowdrop-ui-tabs__tab) {
    height: 100%;
  }

  .tabbed-surface__title {
    margin: 0;
    padding-inline: var(--fd-space-xs);
    font-size: var(--fd-text-sm);
    font-weight: 600;
  }

  .tabbed-surface__content {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .tabbed-surface__panel {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    flex-direction: column;
  }
</style>
