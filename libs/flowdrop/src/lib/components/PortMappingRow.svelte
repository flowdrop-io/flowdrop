<!--
  PortMappingRow Component
  A single row in the port mapping editor showing an old port → new port dropdown.
  Styled with BEM syntax.
-->

<script lang="ts">
  import type { NodePort } from "../types/index.js";
  import type { EditablePortMapping, MatchQuality } from "../utils/nodeSwap.js";

  interface Props {
    mapping: EditablePortMapping;
    availablePorts: NodePort[];
    usedPortIds: Set<string>;
    onUpdate: (newPortId: string | null) => void;
    onReset: () => void;
  }

  const { mapping, availablePorts, usedPortIds, onUpdate, onReset }: Props =
    $props();

  const QUALITY_LABELS: Record<MatchQuality, string> = {
    id: "ID match",
    name: "Name match",
    type: "Type match",
    manual: "Manual",
    unmapped: "No match",
  };

  const QUALITY_CLASSES: Record<MatchQuality, string> = {
    id: "port-mapping-row__badge--id",
    name: "port-mapping-row__badge--name",
    type: "port-mapping-row__badge--type",
    manual: "port-mapping-row__badge--manual",
    unmapped: "port-mapping-row__badge--unmapped",
  };

  function handleChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = select.value;
    onUpdate(value === "__drop__" ? null : value);
  }
</script>

<div class="port-mapping-row">
  <div class="port-mapping-row__info">
    <span class="port-mapping-row__port-name">{mapping.oldPort.name}</span>
    <span class="port-mapping-row__port-type">({mapping.oldPort.dataType})</span>
  </div>

  <div class="port-mapping-row__arrow">&rarr;</div>

  <div class="port-mapping-row__select-wrapper">
    <select
      class="port-mapping-row__select"
      class:port-mapping-row__select--dropped={!mapping.selectedNewPortId}
      value={mapping.selectedNewPortId ?? "__drop__"}
      onchange={handleChange}
    >
      <option value="__drop__">(Drop connection)</option>
      {#each availablePorts as port (port.id)}
        <option
          value={port.id}
          disabled={usedPortIds.has(port.id) && port.id !== mapping.selectedNewPortId}
        >
          {port.name} ({port.dataType}){usedPortIds.has(port.id) && port.id !== mapping.selectedNewPortId ? " (in use)" : ""}
        </option>
      {/each}
    </select>
  </div>

  <div class="port-mapping-row__meta">
    <span class="port-mapping-row__badge {QUALITY_CLASSES[mapping.matchQuality]}">
      {QUALITY_LABELS[mapping.matchQuality]}
    </span>
    {#if mapping.isOverridden}
      <button
        class="port-mapping-row__reset"
        onclick={onReset}
        type="button"
      >
        reset
      </button>
    {/if}
  </div>
</div>

<style>
  .port-mapping-row {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    padding: var(--fd-space-xs) 0;
    font-size: var(--fd-text-xs);
  }

  .port-mapping-row__info {
    flex: 0 0 auto;
    min-width: 0;
    display: flex;
    align-items: baseline;
    gap: var(--fd-space-3xs);
  }

  .port-mapping-row__port-name {
    font-weight: 500;
    color: var(--fd-foreground);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .port-mapping-row__port-type {
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-xs);
  }

  .port-mapping-row__arrow {
    flex-shrink: 0;
    color: var(--fd-muted-foreground);
  }

  .port-mapping-row__select-wrapper {
    flex: 1;
    min-width: 0;
  }

  .port-mapping-row__select {
    width: 100%;
    padding: 0.25rem 0.375rem;
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-sm);
    background-color: var(--fd-background);
    color: var(--fd-foreground);
    font-size: var(--fd-text-xs);
    cursor: pointer;
    transition:
      border-color var(--fd-transition-normal),
      box-shadow var(--fd-transition-normal);
  }

  .port-mapping-row__select:focus {
    outline: none;
    border-color: var(--fd-ring);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--fd-ring) 20%, transparent);
  }

  .port-mapping-row__select--dropped {
    border-color: var(--fd-warning);
    color: var(--fd-warning);
  }

  .port-mapping-row__meta {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: var(--fd-space-3xs);
  }

  .port-mapping-row__badge {
    font-size: var(--fd-text-xs);
    padding: 0.0625rem 0.375rem;
    border-radius: var(--fd-radius-sm);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    white-space: nowrap;
  }

  .port-mapping-row__badge--id {
    background-color: color-mix(in srgb, var(--fd-success) 15%, transparent);
    color: var(--fd-success);
  }

  .port-mapping-row__badge--name {
    background-color: color-mix(in srgb, var(--fd-primary) 15%, transparent);
    color: var(--fd-primary);
  }

  .port-mapping-row__badge--type {
    background-color: color-mix(in srgb, var(--fd-warning) 15%, transparent);
    color: var(--fd-warning);
  }

  .port-mapping-row__badge--manual {
    background-color: color-mix(in srgb, #a855f7 15%, transparent);
    color: #a855f7;
  }

  .port-mapping-row__badge--unmapped {
    background-color: color-mix(in srgb, var(--fd-error) 15%, transparent);
    color: var(--fd-error);
  }

  .port-mapping-row__reset {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-xs);
    text-decoration: underline;
    padding: 0;
    transition: color var(--fd-transition-fast);
  }

  .port-mapping-row__reset:hover {
    color: var(--fd-primary);
  }
</style>
