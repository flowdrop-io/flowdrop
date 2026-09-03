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
  import Button from '$lib/components/Button.svelte';
  import IconButton from '$lib/components/IconButton.svelte';
  import Input from '$lib/components/Input.svelte';
  import Select from '$lib/components/Select.svelte';
  import BindablePortListbox from '$lib/components/BindablePortListbox.svelte';
  import PortShapeSymbol from '$lib/components/ports/PortShapeSymbol.svelte';
  import PortLaneChip from '$lib/components/ports/PortLaneChip.svelte';
  import { m } from '$lib/messages/index.js';
  import type { PortDataTypeConfig, WorkflowInterfaceEntry } from '$lib/types/index.js';
  import type { PortCompatibilityChecker } from '$lib/utils/connections.js';
  import {
    bindablePortKey,
    describeInterfaceEntryStatus,
    pullEntryFieldsFromPort,
    type RankedBindablePort,
    type InterfaceIssue,
    type ResolvedInterfaceEntry
  } from '$lib/utils/workflowInterface.js';

  interface Props {
    entry: WorkflowInterfaceEntry;
    direction: 'inputs' | 'outputs';
    status: ResolvedInterfaceEntry | undefined;
    /** Candidate ports for this direction, ranked, for the binding picker. */
    candidates: RankedBindablePort[];
    /** The authoring vocabulary offered by the dataType picker. */
    dataTypes: PortDataTypeConfig[];
    /** The instance's checker — shape symbol and lane colour of the bound port. */
    checker: PortCompatibilityChecker;
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
    checker,
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

  /** Whether the binding picker is unfolded under the "Bound port" control. */
  let pickerOpen = $state(false);

  /** The entry's current single binding, as a picker key (`undefined` = unbound). */
  const currentKey = $derived(entry.bindings[0] ? bindablePortKey(entry.bindings[0]) : undefined);

  /** The bound port, when the single binding resolves. */
  const boundTarget = $derived(status?.targets[0]);

  /** The bound port's own dataType, when the single binding resolves. */
  const boundPortType = $derived(boundTarget?.port.dataType);

  /**
   * The picker's candidates, with this entry's own port counted as free: it
   * is "published" — by the very entry choosing — and greying it out as taken
   * would tell the author their current choice is unavailable.
   */
  const ownCandidates = $derived(
    candidates.map((candidate) =>
      candidate.publishedAs === entry.id ? { ...candidate, publishedAs: undefined } : candidate
    )
  );

  function bindTo(candidate: RankedBindablePort): void {
    const patch: Partial<WorkflowInterfaceEntry> = {
      bindings: [{ nodeId: candidate.nodeId, portId: candidate.port.id }]
    };
    // Convenience default: prefill an empty dataType from the picked port's own
    // type. The field stays freely editable afterward — this only saves the
    // common case of typing out what the port already declares.
    if (!entry.dataType) patch.dataType = candidate.port.dataType;
    onPatch(patch);
    pickerOpen = false;
  }

  function unbind(): void {
    onPatch({ bindings: [] });
    pickerOpen = false;
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
  <div class="wf-interface__entry-side">
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
  </div>

  <div class="wf-interface__fields">
    <div class="wf-interface__row wf-interface__row--identity">
      <label class="wf-interface__field wf-interface__field--id">
        <span class="wf-interface__label">{m().workflowInterface.idLabel}</span>
        <Input
          size="sm"
          type="text"
          value={entry.id}
          onchange={(e) => onPatch({ id: e.currentTarget.value })}
        />
      </label>
      <div class="wf-interface__field wf-interface__field--binding">
        <span class="wf-interface__label" id="wf-binding-label-{direction}-{entry.id}">
          {m().workflowInterface.bindingLabel}
        </span>
        <!-- The bound port, said back the way the canvas says it — shape symbol,
             node › port, lane chip — and the way in to change it. Looks like a
             select, opens the shared port listbox instead. -->
        <button
          type="button"
          class="wf-interface__binding"
          class:wf-interface__binding--open={pickerOpen}
          class:wf-interface__binding--invalid={isInput && alreadyConnected}
          class:wf-interface__binding--empty={!entry.bindings[0]}
          aria-haspopup="listbox"
          aria-expanded={pickerOpen}
          aria-labelledby="wf-binding-label-{direction}-{entry.id}"
          title={m().workflowInterface.bindingChange}
          onclick={() => (pickerOpen = !pickerOpen)}
        >
          {#if boundTarget}
            <PortShapeSymbol {checker} port={boundTarget.port} />
            <span class="wf-interface__binding-path">
              <span class="wf-interface__binding-node">
                {boundTarget.node.data?.label ?? boundTarget.node.id}
              </span>
              <Icon icon="heroicons:chevron-right" />
              <span class="wf-interface__binding-port">{boundTarget.port.name}</span>
              <PortLaneChip {checker} port={boundTarget.port} />
            </span>
          {:else if entry.bindings[0]}
            <span class="wf-interface__binding-path wf-interface__binding-path--dangling">
              {m().workflowInterface.bindingDangling({
                nodeId: entry.bindings[0].nodeId,
                portId: entry.bindings[0].portId
              })}
            </span>
          {:else}
            <span class="wf-interface__binding-placeholder">
              {m().workflowInterface.bindingUnbound}
            </span>
          {/if}
          <Icon icon="heroicons:chevron-up-down" class="wf-interface__binding-caret" />
        </button>
        {#if isInput && alreadyConnected}
          <span class="wf-interface__inline wf-interface__inline--error">
            {m().workflowInterface.alreadyConnectedInline({ source: conflictingSource ?? '' })}
          </span>
        {/if}
      </div>
    </div>

    {#if pickerOpen}
      <div
        class="wf-interface__picker"
        role="group"
        aria-label={m().workflowInterface.bindingChoose}
      >
        <BindablePortListbox
          {direction}
          candidates={ownCandidates}
          {checker}
          idPrefix="wf-binding-option-{direction}-{entry.id}"
          {currentKey}
          confirmOnClick
          autofocus
          onConfirm={bindTo}
          onCancel={() => (pickerOpen = false)}
        />
        <div class="wf-interface__picker-actions">
          {#if entry.bindings[0]}
            <Button variant="ghost" size="sm" onclick={unbind}>
              <Icon icon="heroicons:link-slash" />
              {m().workflowInterface.bindingUnbind}
            </Button>
          {/if}
          <span class="wf-interface__picker-spacer"></span>
          <Button variant="ghost" size="sm" onclick={() => (pickerOpen = false)}>
            {m().workflowInterface.composerCancel}
          </Button>
        </div>
      </div>
    {/if}

    <!-- Two-way, and it settles: the setter writes what the DOM already
         reports, and assigning `open` a value it already holds fires no
         further `toggle`. Without that the pair would be an unbounded
         DOM/state cascade rather than a binding — and one Svelte's
         update-depth guard could not catch, since each turn is a fresh
         event task. -->
    <details class="wf-interface__more" bind:open={fieldsOpen}>
      <summary>
        <Icon icon="heroicons:chevron-right" />
        {m().workflowInterface.moreOptions}
      </summary>
      <div class="wf-interface__more-body">
        {#if boundTarget}
          <div class="wf-interface__pull-row">
            <Button
              variant="ghost"
              size="sm"
              class="wf-interface__pull"
              title={m().workflowInterface.pullFromPortTitle}
              onclick={() => onPatch(pullEntryFieldsFromPort(boundTarget.port))}
            >
              <Icon icon="heroicons:arrow-down-tray" />
              {m().workflowInterface.pullFromPort}
            </Button>
          </div>
        {/if}
        <div class="wf-interface__row">
          <label class="wf-interface__field">
            <span class="wf-interface__label">{m().workflowInterface.nameLabel}</span>
            <Input
              size="sm"
              type="text"
              value={entry.name ?? ''}
              placeholder={m().workflowInterface.namePlaceholder}
              onchange={(e) => onPatch({ name: e.currentTarget.value || undefined })}
            />
          </label>
          <label class="wf-interface__field">
            <span class="wf-interface__label">{m().workflowInterface.dataTypeLabel}</span>
            <Select
              size="sm"
              invalid={status?.status === 'type-mismatch'}
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
            </Select>
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
        </div>

        <div class="wf-interface__row">
          <label class="wf-interface__field wf-interface__field--wide">
            <span class="wf-interface__label">{m().workflowInterface.descriptionLabel}</span>
            <Input
              size="sm"
              type="text"
              value={entry.description ?? ''}
              onchange={(e) => onPatch({ description: e.currentTarget.value || undefined })}
            />
          </label>
        </div>

        <div class="wf-interface__row">
          <label class="wf-interface__field">
            <span class="wf-interface__label">{m().workflowInterface.defaultValueLabel}</span>
            <Input
              size="sm"
              type="text"
              value={formatDefaultValue(entry.defaultValue)}
              onchange={(e) => onPatch({ defaultValue: parseDefaultValue(e.currentTarget.value) })}
            />
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

        {#if isInput}
          <div class="wf-interface__examples">
            <span class="wf-interface__label">
              {m().workflowInterface.examplesLabel}
            </span>
            {#each entry.examples ?? [] as example, exampleIndex (exampleIndex)}
              <div class="wf-interface__example-row">
                <Input
                  size="sm"
                  type="text"
                  value={formatDefaultValue(example)}
                  onchange={(e) => patchExample(exampleIndex, e.currentTarget.value)}
                />
                <IconButton
                  size="sm"
                  class="wf-interface__example-remove"
                  onclick={() => removeExample(exampleIndex)}
                  ariaLabel={m().workflowInterface.removeExample}
                >
                  <Icon icon="heroicons:x-mark" />
                </IconButton>
              </div>
            {/each}
            <Button
              variant="ghost"
              size="sm"
              class="wf-interface__example-add"
              onclick={addExample}
            >
              <Icon icon="heroicons:plus" />
              {m().workflowInterface.addExample}
            </Button>
          </div>
        {/if}
      </div>
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

  <IconButton
    size="sm"
    class="wf-interface__remove"
    onclick={onRemove}
    ariaLabel={m().workflowInterface.removeEntry({ id: entry.id })}
  >
    <Icon icon="heroicons:trash" />
  </IconButton>
</li>

<style>
  /*
    One interface entry, styled as a card in the same family as the settings
    form beside it: the shared `.flowdrop-input` controls (via Input/Select),
    the shared `.flowdrop-btn` buttons (via Button/IconButton), the settings
    form's label weight and size, and the panel's card surface. Nothing here
    declares a colour that isn't a design token.
  */
  .wf-interface__entry {
    display: flex;
    align-items: flex-start;
    gap: var(--fd-space-sm);
    padding: var(--fd-space-sm) var(--fd-space-sm) var(--fd-space-sm) var(--fd-space-xs);
    background-color: var(--fd-card);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-lg);
    box-shadow: var(--fd-shadow-sm);
    transition:
      border-color var(--fd-transition-fast),
      box-shadow var(--fd-transition-fast);
  }

  .wf-interface__entry:hover {
    border-color: var(--fd-border-strong);
  }

  .wf-interface__entry:focus-within {
    border-color: var(--fd-primary);
    box-shadow: 0 0 0 var(--fd-ring-width) var(--fd-primary-muted);
  }

  .wf-interface__entry--error {
    border-color: color-mix(in srgb, var(--fd-error) 45%, var(--fd-border));
  }

  /* The card's spine: health dot on top, reorder chevrons below. */
  .wf-interface__entry-side {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--fd-space-2xs);
    flex-shrink: 0;
    padding-top: 0.375rem;
  }

  .wf-interface__reorder {
    display: flex;
    flex-direction: column;
  }

  .wf-interface__reorder button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1rem;
    padding: 0;
    border: none;
    border-radius: var(--fd-radius-sm);
    background: none;
    color: var(--fd-muted-foreground);
    font-size: 0.875rem;
    cursor: pointer;
    transition:
      color var(--fd-transition-fast),
      background-color var(--fd-transition-fast);
  }

  .wf-interface__reorder button:hover:not(:disabled) {
    color: var(--fd-foreground);
    background-color: var(--fd-subtle);
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
    gap: var(--fd-space-sm);
  }

  .wf-interface__row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--fd-space-sm);
  }

  .wf-interface__field {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-2xs);
    flex: 1 1 8rem;
    min-width: 0;
  }

  .wf-interface__field--id {
    flex: 1 1 7rem;
  }

  .wf-interface__field--binding {
    flex: 2 1 12rem;
  }

  .wf-interface__field--wide {
    flex: 1 1 100%;
  }

  .wf-interface__field--checkbox {
    flex-direction: row;
    align-items: center;
    gap: var(--fd-space-xs);
    flex: 0 0 auto;
    align-self: flex-end;
    min-height: 2rem;
  }

  .wf-interface__field--checkbox input[type='checkbox'] {
    width: 1rem;
    height: 1rem;
    margin: 0;
    accent-color: var(--fd-primary);
    cursor: pointer;
  }

  /* Same voice as FormFieldWrapper's `.form-field__label`. */
  .wf-interface__label {
    font-size: 0.8125rem;
    font-weight: 600;
    line-height: 1.4;
    letter-spacing: -0.01em;
    color: var(--fd-foreground);
  }

  .wf-interface__field--checkbox .wf-interface__label {
    font-weight: 500;
  }

  /* The bound port, said back the way the canvas says it, in a select's clothes. */
  .wf-interface__binding {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    width: 100%;
    min-height: 2rem;
    padding: var(--fd-space-2xs) var(--fd-space-xs);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-control-radius);
    background-color: var(--fd-card);
    color: var(--fd-foreground);
    font: inherit;
    font-size: var(--fd-text-xs);
    text-align: left;
    cursor: pointer;
    transition:
      border-color var(--fd-transition-fast),
      box-shadow var(--fd-transition-fast);
  }

  .wf-interface__binding:hover {
    border-color: var(--fd-border-strong);
  }

  .wf-interface__binding:focus-visible,
  .wf-interface__binding--open {
    outline: none;
    border-color: var(--fd-primary);
    box-shadow: 0 0 0 var(--fd-ring-width) var(--fd-primary-muted);
  }

  .wf-interface__binding--invalid {
    border-color: var(--fd-error);
  }

  .wf-interface__binding-path {
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.125rem;
    flex: 1;
    min-width: 0;
    line-height: 1.4;
  }

  .wf-interface__binding-path :global(svg) {
    flex-shrink: 0;
    color: var(--fd-muted-foreground);
  }

  .wf-interface__binding-path :global(.flowdrop-badge--outline) {
    flex: none;
  }

  .wf-interface__binding-node {
    color: var(--fd-muted-foreground);
  }

  .wf-interface__binding-port {
    font-weight: 600;
  }

  .wf-interface__binding-path--dangling {
    color: var(--fd-error);
    font-family: var(--fd-font-mono);
  }

  .wf-interface__binding-placeholder {
    flex: 1;
    color: var(--fd-muted-foreground);
  }

  .wf-interface__binding :global(.wf-interface__binding-caret) {
    flex-shrink: 0;
    margin-left: auto;
    color: var(--fd-muted-foreground);
  }

  /* The unfolded picker: the shared listbox plus its own unbind/cancel row. */
  .wf-interface__picker {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-xs);
    padding: var(--fd-space-xs);
    border: 1px solid color-mix(in srgb, var(--fd-primary) 45%, var(--fd-border));
    border-radius: var(--fd-radius-md);
    background-color: color-mix(in srgb, var(--fd-primary) 3%, var(--fd-card));
  }

  .wf-interface__picker-actions {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
  }

  .wf-interface__picker-spacer {
    flex: 1;
  }

  .wf-interface__picker-actions :global(.flowdrop-btn) {
    min-height: 1.75rem;
    padding-block: 0;
  }

  .wf-interface__pull-row {
    display: flex;
  }

  .wf-interface__pull-row :global(.wf-interface__pull) {
    min-height: 1.75rem;
    padding-block: 0;
    padding-inline: var(--fd-space-xs);
    color: var(--fd-primary);
  }

  /* Entry health at a glance; the title tooltip carries the words. */
  .wf-interface__dot {
    flex-shrink: 0;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background-color: var(--fd-muted-foreground);
    box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 18%, transparent);
    color: var(--fd-muted-foreground);
  }

  .wf-interface__dot--ok {
    background-color: var(--fd-success);
    color: var(--fd-success);
  }

  .wf-interface__dot--type-mismatch,
  .wf-interface__dot--unbound {
    background-color: var(--fd-warning);
    color: var(--fd-warning);
  }

  .wf-interface__dot--dangling,
  .wf-interface__dot--hidden,
  .wf-interface__dot--over-bound {
    background-color: var(--fd-error);
    color: var(--fd-error);
  }

  /* Field-anchored feedback: one short line under the field it belongs to. */
  .wf-interface__inline {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--fd-space-xs);
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
    padding: 0 var(--fd-space-xs);
    border: 1px solid currentColor;
    border-radius: var(--fd-radius-full);
    background-color: transparent;
    color: inherit;
    font-size: var(--fd-text-2xs);
    font-weight: 600;
    line-height: 1.4;
    cursor: pointer;
    transition: background-color var(--fd-transition-fast);
  }

  .wf-interface__quickfix:hover {
    background-color: color-mix(in srgb, currentColor 12%, transparent);
  }

  /* The secondary fields live behind a disclosure so a card's resting state
     is just identity + binding. Auto-opened when a field inside needs eyes. */
  .wf-interface__more {
    font-size: var(--fd-text-xs);
  }

  .wf-interface__more > summary {
    display: inline-flex;
    align-items: center;
    gap: 0.125rem;
    list-style: none;
    padding: 0.125rem var(--fd-space-xs) 0.125rem 0.125rem;
    border-radius: var(--fd-radius-sm);
    color: var(--fd-muted-foreground);
    font-weight: 500;
    cursor: pointer;
    user-select: none;
    transition:
      color var(--fd-transition-fast),
      background-color var(--fd-transition-fast);
  }

  .wf-interface__more > summary::-webkit-details-marker {
    display: none;
  }

  .wf-interface__more > summary:hover {
    color: var(--fd-foreground);
    background-color: var(--fd-subtle);
  }

  .wf-interface__more > summary :global(svg) {
    transition: transform var(--fd-transition-fast);
  }

  .wf-interface__more[open] > summary :global(svg) {
    transform: rotate(90deg);
  }

  .wf-interface__more-body {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-sm);
    margin-top: var(--fd-space-sm);
    padding-top: var(--fd-space-sm);
    border-top: 1px dashed var(--fd-border-muted);
  }

  .wf-interface__examples {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-xs);
  }

  .wf-interface__example-row {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
  }

  .wf-interface__example-row :global(.flowdrop-input) {
    flex: 1;
  }

  .wf-interface__example-row :global(.wf-interface__example-remove) {
    width: 1.75rem;
    height: 1.75rem;
    flex-shrink: 0;
  }

  .wf-interface__example-row :global(.wf-interface__example-remove:hover) {
    color: var(--fd-error);
  }

  .wf-interface__examples :global(.wf-interface__example-add) {
    align-self: flex-start;
    min-height: 1.75rem;
    padding-inline: var(--fd-space-xs);
    color: var(--fd-muted-foreground);
  }

  .wf-interface__examples :global(.wf-interface__example-add:hover) {
    color: var(--fd-foreground);
  }

  /* Status callouts: a tinted strip with a coloured edge, not bare coloured text. */
  .wf-interface__status {
    margin: 0;
    padding: var(--fd-space-2xs) var(--fd-space-xs);
    border-left: 3px solid var(--fd-muted-foreground);
    border-radius: 0 var(--fd-radius-sm) var(--fd-radius-sm) 0;
    background-color: var(--fd-muted);
    font-size: var(--fd-text-xs);
    line-height: 1.5;
    color: var(--fd-foreground);
  }

  .wf-interface__status--error,
  .wf-interface__status--dangling,
  .wf-interface__status--hidden,
  .wf-interface__status--over-bound {
    border-left-color: var(--fd-error);
    background-color: var(--fd-error-muted);
  }

  .wf-interface__status--warning,
  .wf-interface__status--unbound,
  .wf-interface__status--type-mismatch {
    border-left-color: var(--fd-warning);
    background-color: var(--fd-warning-muted);
  }

  .wf-interface__meta {
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
  }

  .wf-interface__meta > summary {
    cursor: pointer;
    user-select: none;
  }

  .wf-interface__meta > summary:hover {
    color: var(--fd-foreground);
  }

  .wf-interface__meta pre {
    margin: var(--fd-space-xs) 0 0;
    padding: var(--fd-space-xs);
    border: 1px solid var(--fd-border-muted);
    border-radius: var(--fd-radius-sm);
    background-color: var(--fd-muted);
    color: var(--fd-foreground);
    font-family: var(--fd-font-mono);
    font-size: var(--fd-text-2xs);
    line-height: 1.5;
    overflow-x: auto;
  }

  .wf-interface__entry :global(.wf-interface__remove) {
    flex-shrink: 0;
    width: 1.75rem;
    height: 1.75rem;
    margin-top: 0.125rem;
  }

  .wf-interface__entry :global(.wf-interface__remove:hover) {
    color: var(--fd-error);
    background-color: var(--fd-error-muted);
  }
</style>
