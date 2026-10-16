<!--
  PortMappingRow Component
  A single row in the port mapping editor showing an old port → new port dropdown.
  Styled with BEM syntax.
-->

<script lang="ts">
  import type { NodePort } from '../types/index.js';
  import Select from './primitives/Select.svelte';
  import type { SelectOption } from '../utils/selectOptions.js';
  import type { EditablePortMapping, MatchQuality } from '../utils/nodeSwap.js';

  interface Props {
    mapping: EditablePortMapping;
    availablePorts: NodePort[];
    usedPortIds: Set<string>;
    onUpdate: (newPortId: string | null) => void;
    onReset: () => void;
  }

  const { mapping, availablePorts, usedPortIds, onUpdate, onReset }: Props = $props();

  const QUALITY_LABELS: Record<MatchQuality, string> = {
    id: 'ID match',
    name: 'Name match',
    type: 'Type match',
    manual: 'Manual',
    unmapped: 'No match'
  };

  const QUALITY_CLASSES: Record<MatchQuality, string> = {
    id: 'port-mapping-row__badge--id',
    name: 'port-mapping-row__badge--name',
    type: 'port-mapping-row__badge--type',
    manual: 'port-mapping-row__badge--manual',
    unmapped: 'port-mapping-row__badge--unmapped'
  };

  const DROP = '__drop__';

  const options = $derived<SelectOption[]>([
    { value: DROP, label: '(Drop connection)' },
    ...availablePorts.map((port) => {
      const inUse = usedPortIds.has(port.id) && port.id !== mapping.selectedNewPortId;
      return {
        value: port.id,
        label: `${port.name} (${port.dataType})${inUse ? ' (in use)' : ''}`,
        disabled: inUse
      };
    })
  ]);
</script>

<div class="port-mapping-row">
  <div class="port-mapping-row__info">
    <span class="port-mapping-row__port-name">{mapping.oldPort.name}</span>
    <span class="port-mapping-row__port-type">({mapping.oldPort.dataType})</span>
  </div>

  <div class="port-mapping-row__arrow">&rarr;</div>

  <div
    class="port-mapping-row__select-wrapper"
    class:port-mapping-row__select-wrapper--dropped={!mapping.selectedNewPortId}
  >
    <Select
      size="sm"
      aria-label={`New port for ${mapping.oldPort.name}`}
      {options}
      value={mapping.selectedNewPortId ?? DROP}
      onValueChange={(value) => onUpdate(value === DROP ? null : value)}
    />
  </div>

  <div class="port-mapping-row__meta">
    <span class="port-mapping-row__badge {QUALITY_CLASSES[mapping.matchQuality]}">
      {QUALITY_LABELS[mapping.matchQuality]}
    </span>
    {#if mapping.isOverridden}
      <button class="port-mapping-row__reset" onclick={onReset} type="button"> reset </button>
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

  /* An unmapped port reads as a warning: the field takes the warning colour. */
  .port-mapping-row__select-wrapper--dropped :global(.flowdrop-input) {
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
