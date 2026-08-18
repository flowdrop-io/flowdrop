<!--
  WorkflowInterfaceEntryCard Component

  One row of `WorkflowInterfaceEditor` — a single `WorkflowInterface` entry:
  identity, its binding, the secondary fields behind a disclosure, the examples
  list on the input side, and the in-words explanation of the entry's
  `resolveInterface` status.

  A component rather than a chunk of the parent's `{#each}` because the
  disclosure is per-row state. Nested in the parent it needed a keyed map and
  hand-written bookkeeping to add, drop and reorder alongside the entries; here
  Svelte gives each row its own instance, its own `fieldsOpen`, and disposal for
  free. The parent keys the `{#each}` by a minted row id, so an instance travels
  with its entry across reorders instead of staying in the slot.

  Owns no entry data. Reads `entry` as a prop and reports every change through
  `onPatch`, which the parent commits to the workflow — so this stays as
  stateless about the workflow as the parent is.
-->

<script lang="ts">
  import Icon from '@iconify/svelte';
  import { m } from '$lib/messages/index.js';
  import type { PortDataTypeConfig, WorkflowInterfaceEntry } from '$lib/types/index.js';
  import {
    describeInterfaceEntryStatus,
    pullEntryFieldsFromPort,
    type BindablePort,
    type InterfaceIssue,
    type ResolvedInterfaceEntry
  } from '$lib/utils/workflowInterface.js';

  interface Props {
    entry: WorkflowInterfaceEntry;
    direction: 'inputs' | 'outputs';
    status: ResolvedInterfaceEntry | undefined;
    /** Candidate ports for this direction, for the binding picker. */
    candidates: BindablePort[];
    /** The authoring vocabulary offered by the dataType picker. */
    dataTypes: PortDataTypeConfig[];
    /** The issues this card explains in its footer. */
    footerIssues: InterfaceIssue[];
    /** Input side only: the bound port already receives another edge. */
    alreadyConnected?: boolean;
    /** Label of the node feeding that competing edge, when there is one. */
    conflictingSource?: string;
    isFirst: boolean;
    isLast: boolean;
    onPatch: (patch: Partial<WorkflowInterfaceEntry>) => void;
    onMove: (delta: -1 | 1) => void;
    onRemove: () => void;
  }

  const {
    entry,
    direction,
    status,
    candidates,
    dataTypes,
    footerIssues,
    alreadyConnected = false,
    conflictingSource,
    isFirst,
    isLast,
    onPatch,
    onMove,
    onRemove
  }: Props = $props();

  /**
   * Whether the secondary fields are disclosed.
   *
   * Seeded once, from whether this entry wants attention, and owned by the
   * author from then on. It must NOT track `status`: that is live data, and a
   * disclosure driven by data is the bug this component was split out to kill.
   * Rendering `open` as a reactive attribute meant every edit in the card came
   * back as a new `workflow`, re-ran the attribute and slammed the fields shut,
   * pulling the focused input out from under the author mid-word — focus fell
   * to `<body>` and the keystrokes after it were silently dropped. Deriving it
   * from `status` instead of seeding from it reintroduces exactly that, most
   * sharply when the author fixes a type mismatch with the select inside and it
   * shuts on them mid-fix.
   */
  // svelte-ignore state_referenced_locally
  let fieldsOpen = $state(status?.status === 'type-mismatch');

  /** Statuses still explained in the footer (the rest render inline or as the dot). */
  const FOOTER_STATUSES = new Set(['unbound', 'dangling', 'hidden', 'over-bound']);

  const isInput = $derived(direction === 'inputs');

  /**
   * Options for the dataType select: the configured vocabulary, plus the
   * entry's current value when it isn't in it (a host-custom or legacy type) —
   * a select must never silently rewrite a stored value it cannot list.
   */
  function dataTypeOptions(current: string): Array<{ id: string; name: string }> {
    const options = dataTypes.map((dt) => ({ id: dt.id, name: dt.name }));
    if (current && !dataTypes.some((dt) => dt.id === current || dt.aliases?.includes(current))) {
      options.push({ id: current, name: current });
    }
    return options;
  }

  function bindingKey(nodeId: string, portId: string): string {
    return `${nodeId}::${portId}`;
  }

  /** The entry's current single binding, as a picker value (`''` = unbound). */
  const currentBinding = $derived(
    entry.bindings[0] ? bindingKey(entry.bindings[0].nodeId, entry.bindings[0].portId) : ''
  );

  /** The bound port's own dataType, when the single binding resolves. */
  const boundPortType = $derived(status?.targets[0]?.port.dataType);

  function handleBindingChange(value: string): void {
    if (!value) {
      onPatch({ bindings: [] });
      return;
    }
    const [nodeId, portId] = value.split('::');
    const patch: Partial<WorkflowInterfaceEntry> = { bindings: [{ nodeId, portId }] };
    // Convenience default: prefill an empty dataType from the picked port's own
    // type. The field stays freely editable afterward — this only saves the
    // common case of typing out what the port already declares.
    if (!entry.dataType) {
      const match = candidates.find((b) => b.nodeId === nodeId && b.port.id === portId);
      if (match) patch.dataType = match.port.dataType;
    }
    onPatch(patch);
  }

  /**
   * Write one example slot back, dropping empties and collapsing an empty
   * list to `undefined` so an untouched entry stores no `examples` key.
   */
  function patchExample(exampleIndex: number, raw: string): void {
    const next = [...(entry.examples ?? [])];
    if (raw === '') next.splice(exampleIndex, 1);
    else next[exampleIndex] = parseDefaultValue(raw);
    onPatch({ examples: next.length > 0 ? next : undefined });
  }

  function addExample(): void {
    onPatch({ examples: [...(entry.examples ?? []), ''] });
  }

  function removeExample(exampleIndex: number): void {
    const next = (entry.examples ?? []).filter((_, i) => i !== exampleIndex);
    onPatch({ examples: next.length > 0 ? next : undefined });
  }

  function parseDefaultValue(raw: string): unknown {
    if (raw === '') return undefined;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  function formatDefaultValue(value: unknown): string {
    if (value === undefined) return '';
    return typeof value === 'string' ? value : JSON.stringify(value);
  }
</script>

<li
  class="wf-interface__entry"
  class:wf-interface__entry--error={status?.status &&
    status.status !== 'ok' &&
    status.status !== 'unbound'}
>
  {#if status}
    <span
      class="wf-interface__dot wf-interface__dot--{status.status}"
      title={describeInterfaceEntryStatus(status)}
    ></span>
  {/if}
  <div class="wf-interface__reorder">
    <button
      type="button"
      disabled={isFirst}
      onclick={() => onMove(-1)}
      aria-label={m().workflowInterface.moveUp({ id: entry.id })}
    >
      <Icon icon="heroicons:chevron-up" />
    </button>
    <button
      type="button"
      disabled={isLast}
      onclick={() => onMove(1)}
      aria-label={m().workflowInterface.moveDown({ id: entry.id })}
    >
      <Icon icon="heroicons:chevron-down" />
    </button>
  </div>

  <div class="wf-interface__fields">
    <div class="wf-interface__row">
      <label class="wf-interface__field wf-interface__field--id">
        <span class="wf-interface__label">{m().workflowInterface.idLabel}</span>
        <input
          type="text"
          value={entry.id}
          onchange={(e) => onPatch({ id: e.currentTarget.value })}
        />
      </label>
      <label class="wf-interface__field wf-interface__field--wide">
        <span class="wf-interface__label">{m().workflowInterface.bindingLabel}</span>
        <select value={currentBinding} onchange={(e) => handleBindingChange(e.currentTarget.value)}>
          <option value="">{m().workflowInterface.bindingUnbound}</option>
          {#each candidates as candidate (bindingKey(candidate.nodeId, candidate.port.id))}
            <option value={bindingKey(candidate.nodeId, candidate.port.id)}>
              {candidate.nodeLabel} — {candidate.port.name} ({candidate.port.dataType})
            </option>
          {/each}
        </select>
        {#if isInput && alreadyConnected}
          <span class="wf-interface__inline wf-interface__inline--error">
            {m().workflowInterface.alreadyConnectedInline({ source: conflictingSource ?? '' })}
          </span>
        {/if}
      </label>
      {#if status?.targets[0]}
        <button
          type="button"
          class="wf-interface__pull"
          title={m().workflowInterface.pullFromPortTitle}
          onclick={() => onPatch(pullEntryFieldsFromPort(status.targets[0].port))}
        >
          <Icon icon="heroicons:arrow-down-tray" />
          {m().workflowInterface.pullFromPort}
        </button>
      {/if}
    </div>

    <!-- Two-way, and it settles: the setter writes what the DOM already
         reports, and assigning `open` a value it already holds fires no
         further `toggle`. Without that the pair would be an unbounded
         DOM/state cascade rather than a binding — and one Svelte's
         update-depth guard could not catch, since each turn is a fresh
         event task. -->
    <details class="wf-interface__more" bind:open={fieldsOpen}>
      <summary>{m().workflowInterface.moreOptions}</summary>
      <div class="wf-interface__row">
        <label class="wf-interface__field">
          <span class="wf-interface__label">{m().workflowInterface.nameLabel}</span>
          <input
            type="text"
            value={entry.name ?? ''}
            placeholder={m().workflowInterface.namePlaceholder}
            onchange={(e) => onPatch({ name: e.currentTarget.value || undefined })}
          />
        </label>
        <label class="wf-interface__field">
          <span class="wf-interface__label">{m().workflowInterface.dataTypeLabel}</span>
          <select
            value={entry.dataType}
            onchange={(e) => onPatch({ dataType: e.currentTarget.value })}
          >
            {#if !entry.dataType}
              <option value="" disabled selected>
                {m().workflowInterface.dataTypePlaceholder}
              </option>
            {/if}
            {#each dataTypeOptions(entry.dataType) as option (option.id)}
              <option value={option.id}>{option.name}</option>
            {/each}
          </select>
          {#if status?.status === 'type-mismatch' && boundPortType}
            <span class="wf-interface__inline wf-interface__inline--warning">
              {m().workflowInterface.typeMismatchInline({ portType: boundPortType ?? '' })}
              <button
                type="button"
                class="wf-interface__quickfix"
                onclick={() => onPatch({ dataType: boundPortType ?? entry.dataType })}
              >
                {m().workflowInterface.useMatchPortType}
              </button>
            </span>
          {/if}
        </label>
        {#if isInput}
          <label class="wf-interface__field wf-interface__field--checkbox">
            <input
              type="checkbox"
              checked={entry.required ?? false}
              onchange={(e) => onPatch({ required: e.currentTarget.checked || undefined })}
            />
            <span class="wf-interface__label">{m().workflowInterface.requiredLabel}</span>
          </label>
        {/if}
      </div>

      <div class="wf-interface__row">
        <label class="wf-interface__field wf-interface__field--wide">
          <span class="wf-interface__label">{m().workflowInterface.descriptionLabel}</span>
          <input
            type="text"
            value={entry.description ?? ''}
            onchange={(e) => onPatch({ description: e.currentTarget.value || undefined })}
          />
        </label>
        <label class="wf-interface__field">
          <span class="wf-interface__label">{m().workflowInterface.defaultValueLabel}</span>
          <input
            type="text"
            value={formatDefaultValue(entry.defaultValue)}
            onchange={(e) => onPatch({ defaultValue: parseDefaultValue(e.currentTarget.value) })}
          />
        </label>
      </div>

      {#if isInput}
        <div class="wf-interface__examples">
          <span class="wf-interface__label">
            {m().workflowInterface.examplesLabel}
          </span>
          {#each entry.examples ?? [] as example, exampleIndex (exampleIndex)}
            <div class="wf-interface__example-row">
              <input
                type="text"
                value={formatDefaultValue(example)}
                onchange={(e) => patchExample(exampleIndex, e.currentTarget.value)}
              />
              <button
                type="button"
                class="wf-interface__example-remove"
                onclick={() => removeExample(exampleIndex)}
                aria-label={m().workflowInterface.removeExample}
              >
                <Icon icon="heroicons:x-mark" />
              </button>
            </div>
          {/each}
          <button type="button" class="wf-interface__example-add" onclick={addExample}>
            <Icon icon="heroicons:plus" />
            {m().workflowInterface.addExample}
          </button>
        </div>
      {/if}
    </details>

    <!-- Every resolveInterface status renders in words somewhere in this card —
         the obligation that makes this surface canonical. `ok` lives on the
         header dot; type-mismatch and already-connected render inline next to
         their own field; the rest are explained here. -->
    {#if status && FOOTER_STATUSES.has(status.status)}
      <p class="wf-interface__status wf-interface__status--{status.status}">
        {describeInterfaceEntryStatus(status)}
      </p>
    {/if}
    {#each footerIssues as issue (issue.code)}
      <p class="wf-interface__status wf-interface__status--{issue.severity}">
        {issue.message}
      </p>
    {/each}

    {#if entry.meta && Object.keys(entry.meta).length > 0}
      <details class="wf-interface__meta">
        <summary>{m().workflowInterface.metaDisclosure}</summary>
        <pre>{JSON.stringify(entry.meta, null, 2)}</pre>
      </details>
    {/if}
  </div>

  <button
    type="button"
    class="wf-interface__remove"
    onclick={onRemove}
    aria-label={m().workflowInterface.removeEntry({ id: entry.id })}
  >
    <Icon icon="heroicons:trash" />
  </button>
</li>

<style>
  .wf-interface__entry {
    display: flex;
    align-items: flex-start;
    gap: var(--fd-space-xs);
    padding: var(--fd-space-xs);
    border: 1px solid var(--fd-border-muted);
    border-radius: var(--fd-radius-md);
  }

  .wf-interface__entry--error {
    border-color: color-mix(in srgb, var(--fd-error) 40%, var(--fd-border-muted));
  }

  .wf-interface__reorder {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
  }

  .wf-interface__reorder button {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: none;
    background: none;
    color: var(--fd-muted-foreground);
    cursor: pointer;
  }

  .wf-interface__reorder button:disabled {
    opacity: 0.3;
    cursor: default;
  }

  .wf-interface__fields {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-xs);
  }

  .wf-interface__row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--fd-space-xs);
  }

  .wf-interface__field {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    flex: 1;
    min-width: 6rem;
  }

  .wf-interface__field--id {
    flex: 0 0 8rem;
  }

  .wf-interface__field--wide {
    flex: 1 1 100%;
  }

  .wf-interface__field--checkbox {
    flex-direction: row;
    align-items: center;
    gap: 0.375rem;
    flex: 0 0 auto;
  }

  .wf-interface__label {
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
  }

  .wf-interface__field input[type='text'],
  .wf-interface__field select {
    padding: 0.25rem 0.375rem;
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-sm);
    background-color: var(--fd-background);
    color: var(--fd-foreground);
    font-size: var(--fd-text-xs);
  }

  /* Selects size to their longest option instead of truncating it. */
  .wf-interface__field select {
    min-width: 8rem;
    width: max-content;
    max-width: 100%;
  }

  /* Entry health at a glance; the title tooltip carries the words. */
  .wf-interface__dot {
    flex-shrink: 0;
    width: 0.5rem;
    height: 0.5rem;
    margin-top: 0.5rem;
    border-radius: 50%;
    background-color: var(--fd-muted-foreground);
  }

  .wf-interface__dot--ok {
    background-color: var(--fd-success);
  }

  .wf-interface__dot--type-mismatch,
  .wf-interface__dot--unbound {
    background-color: var(--fd-warning);
  }

  .wf-interface__dot--dangling,
  .wf-interface__dot--hidden,
  .wf-interface__dot--over-bound {
    background-color: var(--fd-error);
  }

  /* Field-anchored feedback: one short line under the field it belongs to. */
  .wf-interface__inline {
    display: inline-flex;
    align-items: baseline;
    gap: 0.375rem;
    font-size: var(--fd-text-xs);
    line-height: 1.4;
  }

  .wf-interface__inline--warning {
    color: var(--fd-warning);
  }

  .wf-interface__inline--error {
    color: var(--fd-error);
  }

  .wf-interface__quickfix {
    padding: 0 0.25rem;
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-sm);
    background-color: var(--fd-background);
    color: var(--fd-foreground);
    font-size: var(--fd-text-xs);
    cursor: pointer;
  }

  .wf-interface__quickfix:hover {
    background-color: var(--fd-muted);
  }

  /* The secondary fields live behind a disclosure so a card's resting state
     is just identity + binding. Auto-opened when a field inside needs eyes. */
  .wf-interface__more {
    font-size: var(--fd-text-xs);
  }

  .wf-interface__more > summary {
    color: var(--fd-muted-foreground);
    cursor: pointer;
    user-select: none;
  }

  .wf-interface__more[open] > summary {
    margin-bottom: var(--fd-space-xs);
  }

  .wf-interface__more > :global(.wf-interface__row + .wf-interface__row),
  .wf-interface__more .wf-interface__examples {
    margin-top: var(--fd-space-xs);
  }

  .wf-interface__pull {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    align-self: flex-end;
    padding: 0.25rem 0.375rem;
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-sm);
    background-color: var(--fd-background);
    color: var(--fd-foreground);
    font-size: var(--fd-text-xs);
    white-space: nowrap;
    cursor: pointer;
  }

  .wf-interface__pull:hover {
    background-color: var(--fd-muted);
  }

  .wf-interface__examples {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .wf-interface__example-row {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .wf-interface__example-row input {
    flex: 1;
    padding: 0.25rem 0.375rem;
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-sm);
    background-color: var(--fd-background);
    color: var(--fd-foreground);
    font-size: var(--fd-text-xs);
  }

  .wf-interface__example-remove {
    display: inline-flex;
    padding: 0.125rem;
    border: none;
    background: none;
    color: var(--fd-muted-foreground);
    cursor: pointer;
  }

  .wf-interface__example-remove:hover {
    color: var(--fd-error);
  }

  .wf-interface__example-add {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    align-self: flex-start;
    padding: 0.125rem 0.25rem;
    border: none;
    background: none;
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-xs);
    cursor: pointer;
  }

  .wf-interface__example-add:hover {
    color: var(--fd-foreground);
  }

  .wf-interface__status {
    margin: 0;
    font-size: var(--fd-text-xs);
    line-height: 1.5;
    color: var(--fd-muted-foreground);
  }

  .wf-interface__status--error,
  .wf-interface__status--dangling,
  .wf-interface__status--hidden,
  .wf-interface__status--over-bound {
    color: var(--fd-error);
  }

  .wf-interface__status--warning,
  .wf-interface__status--unbound,
  .wf-interface__status--type-mismatch {
    color: var(--fd-warning);
  }

  .wf-interface__meta {
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
  }

  .wf-interface__meta pre {
    margin: 0.25rem 0 0;
    padding: 0.375rem;
    background: var(--fd-muted);
    border-radius: var(--fd-radius-sm);
    overflow-x: auto;
  }

  .wf-interface__remove {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    border: none;
    background: none;
    color: var(--fd-muted-foreground);
    cursor: pointer;
    border-radius: var(--fd-radius-sm);
  }

  .wf-interface__remove:hover {
    color: var(--fd-error);
    background-color: color-mix(in srgb, var(--fd-error) 10%, transparent);
  }
</style>
