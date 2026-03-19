<!--
  NodeSwapPicker Component
  Displays available node types for swapping, with search/filter and version upgrade badge.
  Reuses patterns from NodeSidebar.
  Styled with BEM syntax.
-->

<script lang="ts">
  import type {
    NodeMetadata,
    NodeCategory,
    WorkflowFormat,
    WorkflowNode,
  } from "../types/index.js";
  import Icon from "@iconify/svelte";
  import { getNodeIcon, getCategoryIcon } from "../utils/icons.js";
  import { getCategoryColorToken } from "../utils/colors.js";
  import { getCategoryLabel } from "../stores/categoriesStore.svelte.js";
  import { getVersionUpgrade } from "../utils/nodeSwap.js";


  interface Props {
    /** The node being swapped */
    currentNode: WorkflowNode;
    /** All available node types */
    availableNodes: NodeMetadata[];
    /** Active workflow format for filtering */
    activeFormat?: WorkflowFormat;
    /** Callback when a node type is selected */
    onSelect: (metadata: NodeMetadata) => void;
    /** Callback to cancel swap */
    onCancel: () => void;
  }

  const {
    currentNode,
    availableNodes,
    activeFormat,
    onSelect,
    onCancel,
  }: Props = $props();

  let searchInput = $state("");

  /** Check version upgrade availability */
  let versionUpgrade = $derived(
    getVersionUpgrade(currentNode.data.metadata, availableNodes),
  );

  /** Filter nodes compatible with active format */
  function isNodeCompatibleWithFormat(node: NodeMetadata): boolean {
    if (!activeFormat) return true;
    if (!node.formats || node.formats.length === 0) return true;
    return node.formats.includes(activeFormat);
  }

  /** Nodes filtered by format compatibility */
  let formatCompatibleNodes = $derived(
    availableNodes.filter((n) => isNodeCompatibleWithFormat(n)),
  );

  /** Apply search filter */
  let filteredNodes = $derived.by(() => {
    let nodes = formatCompatibleNodes;
    if (searchInput.trim()) {
      const query = searchInput.toLowerCase();
      nodes = nodes.filter(
        (node) =>
          node.name.toLowerCase().includes(query) ||
          node.description.toLowerCase().includes(query) ||
          node.tags?.some((tag) => tag.toLowerCase().includes(query)),
      );
    }
    return nodes;
  });

  /** Get unique categories preserving API order */
  let categories = $derived.by(() => {
    const seen = new Set<NodeCategory>();
    const ordered: NodeCategory[] = [];
    for (const node of filteredNodes) {
      if (!seen.has(node.category)) {
        seen.add(node.category);
        ordered.push(node.category);
      }
    }
    return ordered;
  });

  /** Get filtered nodes for a specific category */
  function getNodesForCategory(category: NodeCategory): NodeMetadata[] {
    return filteredNodes.filter((n) => n.category === category);
  }
</script>

<div class="swap-picker">
  <!-- Header -->
  <div class="swap-picker__header">
    <button
      class="swap-picker__back"
      onclick={onCancel}
      aria-label="Back to configuration"
    >
      <Icon icon="heroicons:arrow-left" />
    </button>
    <h2 class="swap-picker__title">Swap Node</h2>
  </div>

  <!-- Current node info -->
  <div class="swap-picker__current">
    <span class="swap-picker__current-label">Current:</span>
    <span class="swap-picker__current-name">{currentNode.data.label}</span>
  </div>

  <!-- Version upgrade banner -->
  {#if versionUpgrade}
    <button
      class="swap-picker__upgrade"
      onclick={() => onSelect(versionUpgrade!)}
    >
      <Icon icon="heroicons:arrow-up-circle" />
      <div class="swap-picker__upgrade-info">
        <span class="swap-picker__upgrade-title">Upgrade Available</span>
        <span class="swap-picker__upgrade-detail">
          v{currentNode.data.metadata.version} &rarr; v{versionUpgrade.version}
        </span>
      </div>
      <Icon icon="heroicons:chevron-right" />
    </button>
  {/if}

  <!-- Search (hidden in minimal via --fd-sidebar-search-display) -->
  <div class="swap-picker__search">
    <input
      type="text"
      placeholder="Search node types..."
      class="swap-picker__input"
      bind:value={searchInput}
    />
  </div>

  <!-- Node list -->
  <div class="swap-picker__list">
    {#if filteredNodes.length === 0}
      <div class="swap-picker__empty">
        <p>No matching node types found</p>
      </div>
    {:else}
      {#each categories as category (category)}
        {@const categoryNodes = getNodesForCategory(category)}
        {#if categoryNodes.length > 0}
          <!-- Flat style: dot + name rows (shown in minimal skin) -->
          <div class="swap-picker__flat-section">
            <div class="swap-picker__flat-category">
              {getCategoryLabel(category).toUpperCase()}
            </div>
            <div class="swap-picker__flat-list">
              {#each categoryNodes as nodeType (nodeType.id)}
                <button
                  class="swap-picker__flat-item"
                  onclick={() => onSelect(nodeType)}
                >
                  <span
                    class="swap-picker__flat-dot"
                    style="background: {getCategoryColorToken(nodeType.category)}"
                  ></span>
                  <span class="swap-picker__flat-name">{nodeType.name}</span>
                </button>
              {/each}
            </div>
          </div>

          <!-- Card style: icon + name + desc rows (shown in default skin) -->
          <div class="swap-picker__card-section">
            <div class="swap-picker__category-header">
              <span
                class="swap-picker__category-icon"
                style="--_icon-color: {getCategoryColorToken(category)}"
              >
                <Icon icon={getCategoryIcon(category)} />
              </span>
              <span class="swap-picker__category-name">
                {getCategoryLabel(category)}
              </span>
              <span class="swap-picker__category-count">
                {categoryNodes.length}
              </span>
            </div>
            <div class="swap-picker__category-items">
              {#each categoryNodes as nodeType (nodeType.id)}
                <button
                  class="swap-picker__item"
                  onclick={() => onSelect(nodeType)}
                >
                  <span
                    class="swap-picker__item-icon"
                    style="--_icon-color: {getCategoryColorToken(
                      nodeType.category,
                    )}"
                  >
                    <Icon
                      icon={getNodeIcon(nodeType.icon, nodeType.category)}
                    />
                  </span>
                  <div class="swap-picker__item-info">
                    <span class="swap-picker__item-name">{nodeType.name}</span>
                    <span class="swap-picker__item-desc">
                      {nodeType.description}
                    </span>
                  </div>
                  <Icon
                    icon="heroicons:chevron-right"
                    class="swap-picker__item-arrow"
                  />
                </button>
              {/each}
            </div>
          </div>
        {/if}
      {/each}
    {/if}
  </div>
</div>

<style>
  .swap-picker {
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: var(--fd-background);
  }

  .swap-picker__header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.875rem 1rem;
    border-bottom: 1px solid var(--fd-border);
    background-color: var(--fd-muted);
    flex-shrink: 0;
  }

  .swap-picker__back {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--fd-muted-foreground);
    padding: 0.25rem;
    border-radius: var(--fd-radius-sm);
    display: flex;
    align-items: center;
    transition:
      color var(--fd-transition-fast),
      background-color var(--fd-transition-fast);
  }

  .swap-picker__back:hover {
    color: var(--fd-foreground);
    background-color: var(--fd-subtle);
  }

  .swap-picker__title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--fd-foreground);
  }

  .swap-picker__current {
    padding: 0.5rem 1rem;
    border-bottom: 1px solid var(--fd-border-muted);
    background-color: var(--fd-muted);
    font-size: var(--fd-text-xs);
    display: flex;
    gap: 0.375rem;
    align-items: center;
  }

  .swap-picker__current-label {
    color: var(--fd-muted-foreground);
  }

  .swap-picker__current-name {
    color: var(--fd-foreground);
    font-weight: 500;
  }

  .swap-picker__upgrade {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1rem;
    border: none;
    border-bottom: 1px solid var(--fd-border-muted);
    background-color: color-mix(in srgb, var(--fd-primary) 8%, transparent);
    color: var(--fd-primary);
    cursor: pointer;
    width: 100%;
    text-align: left;
    transition: background-color var(--fd-transition-fast);
  }

  .swap-picker__upgrade:hover {
    background-color: color-mix(in srgb, var(--fd-primary) 15%, transparent);
  }

  .swap-picker__upgrade-info {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .swap-picker__upgrade-title {
    font-size: var(--fd-text-sm);
    font-weight: 600;
  }

  .swap-picker__upgrade-detail {
    font-size: var(--fd-text-xs);
    opacity: 0.8;
  }

  .swap-picker__search {
    display: var(--fd-sidebar-search-display, flex);
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--fd-border);
    flex-shrink: 0;
  }

  .swap-picker__input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--fd-border-strong);
    border-radius: var(--fd-radius-md);
    font-size: var(--fd-text-sm);
    color: var(--fd-foreground);
    background-color: var(--fd-background);
    box-sizing: border-box;
    transition:
      border-color var(--fd-transition-normal),
      box-shadow var(--fd-transition-normal);
  }

  .swap-picker__input:focus {
    outline: none;
    border-color: var(--fd-ring);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--fd-ring) 20%, transparent);
  }

  .swap-picker__input::placeholder {
    color: var(--fd-muted-foreground);
  }

  .swap-picker__list {
    flex: 1;
    overflow-y: auto;
    padding: 0.75rem;
    scrollbar-width: thin;
    scrollbar-color: var(--fd-scrollbar-thumb) var(--fd-scrollbar-track);
  }

  .swap-picker__empty {
    padding: 2rem 1rem;
    text-align: center;
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-sm);
  }

  /* Display-control token wiring for skin variants */
  .swap-picker__flat-section {
    display: var(--fd-sidebar-flat-display, none);
  }

  .swap-picker__card-section {
    display: var(--fd-sidebar-card-display, block);
    margin-bottom: 0.75rem;
  }

  /* Flat style (minimal skin) */
  .swap-picker__flat-category {
    font-size: var(--fd-text-xs);
    font-weight: 600;
    color: var(--fd-sidebar-category-color, var(--fd-muted-foreground));
    letter-spacing: 0.08em;
    padding: 1.25rem 0.75rem 0.375rem 0.75rem;
    text-transform: uppercase;
  }

  .swap-picker__flat-list {
    display: flex;
    flex-direction: column;
    gap: 1px;
    margin-bottom: 0.25rem;
  }

  .swap-picker__flat-item {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.5rem 0.75rem;
    border: none;
    border-radius: var(--fd-radius-sm);
    background: none;
    cursor: pointer;
    width: 100%;
    text-align: left;
    transition: background-color var(--fd-transition-fast);
  }

  .swap-picker__flat-item:hover {
    background-color: var(--fd-muted);
  }

  .swap-picker__flat-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    display: inline-block;
  }

  .swap-picker__flat-name {
    font-size: var(--fd-text-sm);
    color: var(--fd-sidebar-flat-item-color, var(--fd-foreground));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .swap-picker__category-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.25rem;
    margin-bottom: 0.25rem;
  }

  .swap-picker__category-icon {
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 0.25rem;
    background: color-mix(
      in srgb,
      var(--_icon-color) var(--fd-node-icon-bg-opacity),
      transparent
    );
    color: var(--fd-node-icon);
    font-size: 0.625rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .swap-picker__category-name {
    font-size: var(--fd-text-xs);
    font-weight: 600;
    color: var(--fd-muted-foreground);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    flex: 1;
  }

  .swap-picker__category-count {
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
    background-color: var(--fd-subtle);
    padding: 0.125rem 0.375rem;
    border-radius: var(--fd-radius-sm);
  }

  .swap-picker__category-items {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .swap-picker__item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    border: 1px solid transparent;
    border-radius: var(--fd-radius-md);
    background: none;
    cursor: pointer;
    width: 100%;
    text-align: left;
    transition: all var(--fd-transition-fast);
  }

  .swap-picker__item:hover {
    background-color: var(--fd-muted);
    border-color: var(--fd-border);
  }

  .swap-picker__item-icon {
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 0.375rem;
    background: color-mix(
      in srgb,
      var(--_icon-color) var(--fd-node-icon-bg-opacity),
      transparent
    );
    color: var(--fd-node-icon);
    font-size: var(--fd-text-xs);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .swap-picker__item-info {
    flex: 1;
    min-width: 0;
  }

  .swap-picker__item-name {
    display: block;
    font-size: var(--fd-text-sm);
    font-weight: 500;
    color: var(--fd-foreground);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .swap-picker__item-desc {
    display: block;
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
