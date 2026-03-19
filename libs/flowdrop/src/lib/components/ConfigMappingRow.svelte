<!--
  ConfigMappingRow Component
  A single row in the config mapping editor showing carry/reset toggle.
  Styled with BEM syntax.
-->

<script lang="ts">
  import type { EditableConfigMapping } from "../utils/nodeSwap.js";

  interface Props {
    mapping: EditableConfigMapping;
    onToggle: (key: string) => void;
  }

  const { mapping, onToggle }: Props = $props();

  function formatValue(value: unknown): string {
    if (value === null || value === undefined) return "—";
    if (typeof value === "string") return value || '""';
    if (typeof value === "boolean") return value ? "true" : "false";
    if (typeof value === "number") return String(value);
    return JSON.stringify(value);
  }
</script>

<div class="config-mapping-row">
  <div class="config-mapping-row__info">
    <span class="config-mapping-row__key">{mapping.title}</span>
  </div>

  {#if !mapping.isFlat}
    <div class="config-mapping-row__complex">
      Complex value — will use default
    </div>
  {:else}
    <div class="config-mapping-row__values">
      {#if mapping.carryOver}
        <span class="config-mapping-row__value config-mapping-row__value--carried">
          {formatValue(mapping.oldValue)}
        </span>
      {:else}
        <span class="config-mapping-row__value config-mapping-row__value--default">
          {formatValue(mapping.newDefault)}
        </span>
      {/if}
    </div>

    <button
      class="config-mapping-row__toggle"
      class:config-mapping-row__toggle--carry={mapping.carryOver}
      onclick={() => onToggle(mapping.key)}
      type="button"
    >
      {mapping.carryOver ? "Carry over" : "Use default"}
    </button>
  {/if}
</div>

<style>
  .config-mapping-row {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    padding: var(--fd-space-xs) 0;
    font-size: var(--fd-text-xs);
  }

  .config-mapping-row__info {
    flex: 0 0 auto;
    min-width: 4rem;
  }

  .config-mapping-row__key {
    font-weight: 500;
    color: var(--fd-foreground);
  }

  .config-mapping-row__complex {
    flex: 1;
    color: var(--fd-muted-foreground);
    font-style: italic;
    font-size: var(--fd-text-xs);
  }

  .config-mapping-row__values {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .config-mapping-row__value {
    font-family: var(--fd-font-mono, monospace);
    font-size: var(--fd-text-xs);
  }

  .config-mapping-row__value--carried {
    color: var(--fd-success);
  }

  .config-mapping-row__value--default {
    color: var(--fd-muted-foreground);
  }

  .config-mapping-row__toggle {
    flex-shrink: 0;
    padding: 0.1875rem 0.5rem;
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-sm);
    background-color: var(--fd-background);
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-xs);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--fd-transition-fast);
    white-space: nowrap;
  }

  .config-mapping-row__toggle:hover {
    border-color: var(--fd-border-strong);
    color: var(--fd-foreground);
  }

  .config-mapping-row__toggle--carry {
    background-color: color-mix(in srgb, var(--fd-success) 10%, transparent);
    border-color: color-mix(in srgb, var(--fd-success) 30%, transparent);
    color: var(--fd-success);
  }
</style>
