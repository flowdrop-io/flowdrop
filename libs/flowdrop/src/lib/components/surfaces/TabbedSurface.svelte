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
  }

  const { tabs, activeId, onSelect }: Props = $props();

  // Fall back to the first tab when `activeId` doesn't match any present tab
  // (e.g. the active surface was just routed to a different host).
  const resolvedActiveId = $derived(
    tabs.some((t) => t.id === activeId) ? activeId : (tabs[0]?.id ?? '')
  );
</script>

<div class="tabbed-surface">
  {#if tabs.length > 1}
    <div class="tabbed-surface__bar" role="tablist">
      {#each tabs as tab (tab.id)}
        <button
          class="tabbed-surface__tab {tab.id === resolvedActiveId
            ? 'tabbed-surface__tab--active'
            : ''}"
          role="tab"
          aria-selected={tab.id === resolvedActiveId}
          onclick={() => onSelect(tab.id)}
        >
          {tab.label}
        </button>
      {/each}
    </div>
  {/if}

  <div class="tabbed-surface__content">
    {#each tabs as tab (tab.id)}
      <div
        class="tabbed-surface__panel"
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

  .tabbed-surface__bar {
    display: flex;
    gap: 0;
    background: var(--fd-muted);
    border-bottom: 1px solid var(--fd-border);
    flex-shrink: 0;
  }

  .tabbed-surface__tab {
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    border: none;
    border-bottom: 2px solid transparent;
    background: transparent;
    color: var(--fd-muted-foreground);
    transition: all var(--fd-transition-fast);
  }

  .tabbed-surface__tab:hover {
    color: var(--fd-foreground);
    background: var(--fd-background);
  }

  .tabbed-surface__tab--active {
    color: var(--fd-foreground);
    border-bottom-color: var(--fd-primary);
    background: var(--fd-background);
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
