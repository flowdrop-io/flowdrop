<!--
  SwapMappingEditor Component
  Interactive mapping editor for node swap with connections and config sections.
  Replaces the read-only SwapPreview component.
  Styled with BEM syntax.
-->

<script lang="ts">
  import type { InteractiveSwapState } from "../utils/nodeSwap.js";
  import type { PortCompatibilityChecker } from "../utils/connections.js";
  import Icon from "@iconify/svelte";
  import { getNodeIcon } from "../utils/icons.js";
  import { getCategoryColorToken } from "../utils/colors.js";
  import PortMappingRow from "./PortMappingRow.svelte";
  import ConfigMappingRow from "./ConfigMappingRow.svelte";

  interface Props {
    interactiveState: InteractiveSwapState;
    checker: PortCompatibilityChecker | null;
    onConfirm: (state: InteractiveSwapState) => void;
    onCancel: () => void;
    onBack: () => void;
  }

  const { interactiveState, checker, onConfirm, onCancel, onBack }: Props =
    $props();

  // Local mutable copy of the interactive state
  // JSON round-trip is intentional: structuredClone fails on Svelte 5 proxies
  let localState = $state<InteractiveSwapState>(
    JSON.parse(JSON.stringify(interactiveState)),
  );

  // Reinit when interactiveState changes
  $effect(() => {
    localState = JSON.parse(JSON.stringify(interactiveState));
  });

  // Derived counts
  let inputMappings = $derived(
    localState.portMappings.filter((m) => m.direction === "input"),
  );
  let outputMappings = $derived(
    localState.portMappings.filter((m) => m.direction === "output"),
  );
  let droppedCount = $derived(
    localState.portMappings.filter((m) => !m.selectedNewPortId).length,
  );
  let connectionCount = $derived(localState.portMappings.length);
  let hasDataLoss = $derived(droppedCount > 0);

  // Used port IDs per direction
  let usedInputPortIds = $derived.by(() => {
    const set = new Set<string>();
    for (const m of localState.portMappings) {
      if (m.direction === "input" && m.selectedNewPortId) {
        set.add(m.selectedNewPortId);
      }
    }
    return set;
  });

  let usedOutputPortIds = $derived.by(() => {
    const set = new Set<string>();
    for (const m of localState.portMappings) {
      if (m.direction === "output" && m.selectedNewPortId) {
        set.add(m.selectedNewPortId);
      }
    }
    return set;
  });

  // Trivial swap: no connections and no config
  let isTrivial = $derived(
    connectionCount === 0 && localState.configMappings.length === 0,
  );

  function handlePortUpdate(index: number, newPortId: string | null): void {
    const mapping = localState.portMappings[index];
    if (!mapping) return;

    // For input ports: if this port is already used by another mapping, unmap the other
    if (newPortId && mapping.direction === "input") {
      for (let i = 0; i < localState.portMappings.length; i++) {
        if (i === index) continue;
        const other = localState.portMappings[i];
        if (other.direction === "input" && other.selectedNewPortId === newPortId) {
          localState.portMappings[i] = {
            ...other,
            selectedNewPortId: null,
            matchQuality: "unmapped",
            isOverridden: true,
          };
        }
      }
    }

    localState.portMappings[index] = {
      ...mapping,
      selectedNewPortId: newPortId,
      matchQuality: newPortId ? "manual" : "unmapped",
      isOverridden: true,
    };
  }

  function handlePortReset(index: number): void {
    const mapping = localState.portMappings[index];
    if (!mapping) return;

    localState.portMappings[index] = {
      ...mapping,
      selectedNewPortId: mapping.autoSuggestedPortId,
      matchQuality: mapping.autoSuggestedPortId
        ? (interactiveState.portMappings[index]?.matchQuality ?? "type")
        : "unmapped",
      isOverridden: false,
    };
  }

  function handleConfigToggle(key: string): void {
    const idx = localState.configMappings.findIndex((m) => m.key === key);
    if (idx < 0) return;
    const mapping = localState.configMappings[idx];
    if (!mapping.isFlat) return;

    localState.configMappings[idx] = {
      ...mapping,
      carryOver: !mapping.carryOver,
    };
  }

  function handleConfirm(): void {
    onConfirm(localState);
  }
</script>

<div class="swap-editor">
  <!-- Header -->
  <div class="swap-editor__header">
    <button
      class="swap-editor__back"
      onclick={onBack}
      aria-label="Back to node selection"
    >
      <Icon icon="heroicons:arrow-left" />
    </button>
    <h2 class="swap-editor__title">Swap Mapping</h2>
  </div>

  <!-- Summary bar -->
  <div class="swap-editor__summary">
    <div class="swap-editor__node-info">
      <span class="swap-editor__label">From</span>
      <span class="swap-editor__node-name">{localState.oldNode.data.label}</span>
    </div>
    <Icon icon="heroicons:arrow-right" />
    <div class="swap-editor__node-info">
      <span class="swap-editor__label">To</span>
      <div class="swap-editor__node-target">
        <span
          class="swap-editor__node-icon"
          style="--_icon-color: {getCategoryColorToken(localState.newMetadata.category)}"
        >
          <Icon icon={getNodeIcon(localState.newMetadata.icon, localState.newMetadata.category)} />
        </span>
        <span class="swap-editor__node-name">{localState.newMetadata.name}</span>
      </div>
    </div>
  </div>

  {#if isTrivial}
    <div class="swap-editor__trivial">
      <p>No connections or config to map.</p>
    </div>
  {:else}
    <div class="swap-editor__content">
      <!-- Connections section -->
      {#if connectionCount > 0}
        <div class="swap-editor__section-heading">
          <Icon icon="heroicons:arrows-right-left" />
          Connections
        </div>

        {#if inputMappings.length > 0}
          <div class="swap-editor__section-label">Inputs</div>
          {#each inputMappings as mapping, i (mapping.edge.id)}
            {@const globalIndex = localState.portMappings.indexOf(mapping)}
            <PortMappingRow
              {mapping}
              availablePorts={localState.availableNewInputs}
              usedPortIds={usedInputPortIds}
              onUpdate={(newPortId) => handlePortUpdate(globalIndex, newPortId)}
              onReset={() => handlePortReset(globalIndex)}
            />
          {/each}
        {/if}

        {#if outputMappings.length > 0}
          <div class="swap-editor__section-label">Outputs</div>
          {#each outputMappings as mapping, i (mapping.edge.id)}
            {@const globalIndex = localState.portMappings.indexOf(mapping)}
            <PortMappingRow
              {mapping}
              availablePorts={localState.availableNewOutputs}
              usedPortIds={usedOutputPortIds}
              onUpdate={(newPortId) => handlePortUpdate(globalIndex, newPortId)}
              onReset={() => handlePortReset(globalIndex)}
            />
          {/each}
        {/if}
      {/if}

      <!-- Config section -->
      {#if localState.configMappings.length > 0}
        <div
          class="swap-editor__section-heading"
          class:swap-editor__section-heading--spaced={connectionCount > 0}
        >
          <Icon icon="heroicons:cog-6-tooth" />
          Configuration
        </div>
        <p class="swap-editor__help">
          <strong>Carry over</strong> keeps the value from your current node.
          <strong>Use default</strong> resets to the new node's default value.
        </p>

        {#each localState.configMappings as mapping (mapping.key)}
          <ConfigMappingRow {mapping} onToggle={handleConfigToggle} />
        {/each}

        {#if localState.configMappings.some((m) => !m.isFlat)}
          <div class="swap-editor__info-row">
            Dynamic port config will not be carried over.
          </div>
        {/if}
      {/if}
    </div>
  {/if}

  <!-- Warning banner -->
  {#if hasDataLoss}
    <div class="swap-editor__warning" role="alert">
      <Icon icon="heroicons:exclamation-triangle" />
      <span>{droppedCount} connection{droppedCount !== 1 ? "s" : ""} will be lost</span>
    </div>
  {/if}

  <!-- Actions -->
  <div class="swap-editor__actions">
    <button class="swap-editor__btn swap-editor__btn--cancel" onclick={onCancel} type="button">
      Cancel
    </button>
    <button
      class="swap-editor__btn swap-editor__btn--confirm"
      class:swap-editor__btn--danger={hasDataLoss}
      onclick={handleConfirm}
      type="button"
      aria-label={hasDataLoss ? `Swap anyway — ${droppedCount} connections will be lost` : "Confirm swap"}
    >
      {hasDataLoss ? "Swap Anyway" : "Confirm Swap"}
    </button>
  </div>
</div>

<style>
  .swap-editor {
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: var(--fd-background);
  }

  .swap-editor__header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.875rem 1rem;
    border-bottom: 1px solid var(--fd-border);
    background-color: var(--fd-muted);
    flex-shrink: 0;
  }

  .swap-editor__back {
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

  .swap-editor__back:hover {
    color: var(--fd-foreground);
    background-color: var(--fd-subtle);
  }

  .swap-editor__title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--fd-foreground);
  }

  .swap-editor__summary {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--fd-border);
    background-color: var(--fd-muted);
    flex-shrink: 0;
    color: var(--fd-muted-foreground);
  }

  .swap-editor__node-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
  }

  .swap-editor__label {
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
  }

  .swap-editor__node-name {
    font-size: var(--fd-text-sm);
    font-weight: 500;
    color: var(--fd-foreground);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .swap-editor__node-target {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .swap-editor__node-icon {
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 0.25rem;
    background: color-mix(
      in srgb,
      var(--_icon-color) var(--fd-node-icon-bg-opacity, 15%),
      transparent
    );
    color: var(--fd-node-icon);
    font-size: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .swap-editor__content {
    flex: 1;
    overflow-y: auto;
    padding: var(--fd-space-md);
    scrollbar-width: thin;
    scrollbar-color: var(--fd-scrollbar-thumb) var(--fd-scrollbar-track);
  }

  .swap-editor__section-heading {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--fd-foreground);
    padding: var(--fd-space-xs) 0;
    border-bottom: 1px solid var(--fd-border);
    margin-bottom: var(--fd-space-xs);
  }

  .swap-editor__section-heading :global(svg) {
    width: 1rem;
    height: 1rem;
    color: var(--fd-muted-foreground);
  }

  .swap-editor__section-heading--spaced {
    margin-top: var(--fd-space-md);
    padding-top: var(--fd-space-md);
    border-top: 1px solid var(--fd-border-muted);
  }

  .swap-editor__help {
    margin: 0 0 var(--fd-space-xs);
    font-size: var(--fd-text-xs);
    line-height: 1.5;
    color: var(--fd-muted-foreground);
  }

  .swap-editor__help strong {
    color: var(--fd-foreground);
    font-weight: 600;
  }

  .swap-editor__section-label {
    font-size: var(--fd-text-xs);
    font-weight: 600;
    color: var(--fd-muted-foreground);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: var(--fd-space-xs) 0 var(--fd-space-3xs);
    margin-bottom: var(--fd-space-3xs);
  }

  .swap-editor__section-label:first-child {
    padding-top: 0;
  }

  .swap-editor__info-row {
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
    font-style: italic;
    padding: var(--fd-space-xs) 0;
    border-top: 1px solid var(--fd-border-muted);
    margin-top: var(--fd-space-xs);
  }

  .swap-editor__trivial {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--fd-space-3xs);
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-sm);
    padding: var(--fd-space-2xl);
  }

  .swap-editor__trivial p {
    margin: 0;
  }

  .swap-editor__warning {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    padding: var(--fd-space-xs) var(--fd-space-md);
    background-color: color-mix(in srgb, var(--fd-warning) 8%, transparent);
    border-top: 1px solid color-mix(in srgb, var(--fd-warning) 25%, transparent);
    color: var(--fd-warning);
    font-size: var(--fd-text-xs);
    font-weight: 500;
    flex-shrink: 0;
  }

  .swap-editor__actions {
    display: flex;
    gap: var(--fd-space-xs);
    padding: var(--fd-space-md);
    border-top: 1px solid var(--fd-border-muted);
    flex-shrink: 0;
  }

  .swap-editor__btn {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.625rem var(--fd-space-md);
    border-radius: var(--fd-radius-lg);
    font-size: var(--fd-text-sm);
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all var(--fd-transition-normal);
  }

  .swap-editor__btn--cancel {
    background-color: var(--fd-background);
    border-color: var(--fd-border);
    color: var(--fd-foreground);
    box-shadow: var(--fd-shadow-sm);
  }

  .swap-editor__btn--cancel:hover {
    background-color: var(--fd-muted);
    border-color: var(--fd-border-strong);
  }

  .swap-editor__btn--confirm {
    background: linear-gradient(
      135deg,
      var(--fd-primary) 0%,
      var(--fd-primary-hover) 100%
    );
    color: var(--fd-primary-foreground);
    box-shadow:
      0 2px 8px rgba(59, 130, 246, 0.25),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .swap-editor__btn--confirm:hover {
    background: linear-gradient(
      135deg,
      var(--fd-primary-hover) 0%,
      var(--fd-primary) 100%
    );
    box-shadow:
      0 4px 12px rgba(59, 130, 246, 0.35),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
  }

  .swap-editor__btn--confirm:active {
    transform: translateY(0);
  }

  .swap-editor__btn--danger {
    background: linear-gradient(
      135deg,
      var(--fd-error) 0%,
      var(--fd-error-hover, var(--fd-error)) 100%
    );
    color: var(--fd-error-foreground);
    box-shadow:
      0 2px 8px color-mix(in srgb, var(--fd-error) 30%, transparent),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .swap-editor__btn--danger:hover {
    box-shadow:
      0 4px 12px color-mix(in srgb, var(--fd-error) 40%, transparent),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
  }

  .swap-editor__btn--danger:active {
    transform: translateY(0);
  }
</style>
