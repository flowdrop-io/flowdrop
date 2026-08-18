<!--
  WorkflowInterfaceEditor Component

  The canonical panel editor for a workflow's public contract
  (`Workflow.interface` — see `.claude/plans/workflow-interface.md`, decision 6:
  "one canonical authoring surface, plus optional additions"). Two sections —
  Inputs and Outputs — each a list of entries with add / remove / reorder, a
  binding picker limited to the workflow's canvas-exposed ports for that
  direction (decision 3: external ⊂ internal), and a per-entry, in-words
  explanation of every `resolveInterface` status plus any `validateWorkflowInterface`
  issue. This prose obligation is what makes this surface canonical — no other
  authoring surface (the future rail, the port-row shortcut) carries it.

  Follows `SwapMappingEditor.svelte` / `PortMappingRow.svelte` for the "pick a
  port, show its type" interaction shape, and `FormPorts.svelte` for the
  up/down reorder idiom.

  Stateless: reads `workflow` as a prop and reports the next `WorkflowInterface`
  via `onChange`. The caller (`App.svelte`) is responsible for routing that
  through the workflow store (`fd.workflow.batchUpdate({ interface: next })`),
  so every edit here goes through the store's normal history path.

  `meta` is never editable here (design decision 4) — it round-trips verbatim
  and is shown as a read-only JSON disclosure when present.
-->

<script lang="ts">
  import Icon from '@iconify/svelte';
  import { m } from '$lib/messages/index.js';
  import { buildHandleId } from '$lib/utils/handleIds.js';
  import { DEFAULT_PORT_CONFIG } from '$lib/config/defaultPortConfig.js';
  import type {
    PortDataTypeConfig,
    Workflow,
    WorkflowInterface,
    WorkflowInterfaceEntry
  } from '$lib/types/index.js';
  import {
    describeInterfaceEntryStatus,
    listBindablePorts,
    pullEntryFieldsFromPort,
    resolveInterface,
    validateWorkflowInterface,
    type InterfaceIssue,
    type ResolvedInterfaceEntry
  } from '$lib/utils/workflowInterface.js';

  interface Props {
    workflow: Workflow;
    onChange: (next: WorkflowInterface | undefined) => void;
    /**
     * The data-type vocabulary offered by the dataType picker — the host's
     * live `PortConfig.dataTypes` (pass `portCompatibility.getEnabledDataTypes()`).
     * The wire format stays an open string; this only constrains *authoring*.
     */
    dataTypes?: PortDataTypeConfig[];
  }

  const {
    workflow,
    onChange,
    dataTypes = DEFAULT_PORT_CONFIG.dataTypes.filter((dt) => dt.enabled !== false)
  }: Props = $props();

  /**
   * Options for one entry's dataType select: the configured vocabulary, plus
   * the entry's current value when it isn't in it (a host-custom or legacy
   * type) — a select must never silently rewrite a stored value it can't list.
   */
  function dataTypeOptions(current: string): Array<{ id: string; name: string }> {
    const options = dataTypes.map((dt) => ({ id: dt.id, name: dt.name }));
    if (current && !dataTypes.some((dt) => dt.id === current || dt.aliases?.includes(current))) {
      options.push({ id: current, name: current });
    }
    return options;
  }

  type Direction = 'inputs' | 'outputs';

  const SECTIONS: Array<{ key: Direction; entryDirection: 'input' | 'output' }> = [
    { key: 'inputs', entryDirection: 'input' },
    { key: 'outputs', entryDirection: 'output' }
  ];

  function entriesFor(direction: Direction): WorkflowInterfaceEntry[] {
    return (
      (direction === 'inputs' ? workflow.interface?.inputs : workflow.interface?.outputs) ?? []
    );
  }

  const resolved = $derived(resolveInterface(workflow));
  const issues = $derived(validateWorkflowInterface(workflow));

  function entryDirectionOf(direction: Direction): 'input' | 'output' {
    return direction === 'inputs' ? 'input' : 'output';
  }

  function statusFor(direction: Direction, entryId: string): ResolvedInterfaceEntry | undefined {
    const dir = entryDirectionOf(direction);
    return resolved.find((r) => r.direction === dir && r.entry.id === entryId);
  }

  function issuesFor(direction: Direction, entryId: string): InterfaceIssue[] {
    const dir = entryDirectionOf(direction);
    return issues.filter((i) => i.direction === dir && i.entryId === entryId);
  }

  /**
   * Issues rendered in the card's footer. Excludes what is already shown
   * elsewhere in the card: the resolved status (validation re-emits every
   * non-ok status as an `interface-<status>` issue — rendering both printed
   * the same sentence twice) and the two issues that render inline next to
   * their own field (type mismatch under Data type, already-connected under
   * Bound port).
   */
  const INLINE_ISSUE_CODES = new Set([
    'interface-type-mismatch',
    'interface-input-already-connected'
  ]);

  function footerIssues(
    direction: Direction,
    entryId: string,
    status: ResolvedInterfaceEntry | undefined
  ): InterfaceIssue[] {
    const statusEcho = status ? `interface-${status.status}` : '';
    return issuesFor(direction, entryId).filter(
      (issue) => issue.code !== statusEcho && !INLINE_ISSUE_CODES.has(issue.code)
    );
  }

  /** The bound port's own dataType, when the single binding resolves. */
  function boundPortType(status: ResolvedInterfaceEntry | undefined): string | undefined {
    return status?.targets[0]?.port.dataType;
  }

  function hasIssue(direction: Direction, entryId: string, code: string): boolean {
    return issuesFor(direction, entryId).some((issue) => issue.code === code);
  }

  /**
   * For an input whose bound port already has an incoming edge: the label of
   * the node feeding that edge, so the conflict message can name the actual
   * competing source instead of describing it abstractly.
   */
  function conflictingSourceLabel(entry: WorkflowInterfaceEntry): string | undefined {
    const binding = entry.bindings[0];
    if (!binding) return undefined;
    const handleId = buildHandleId(binding.nodeId, 'input', binding.portId);
    const edge = workflow.edges.find((e) => e.targetHandle === handleId);
    if (!edge) return undefined;
    const source = workflow.nodes.find((n) => n.id === edge.source);
    return source?.data?.label ?? edge.source;
  }

  /** Statuses still explained in the card footer (the rest render inline or as the dot). */
  const FOOTER_STATUSES = new Set(['unbound', 'dangling', 'hidden', 'over-bound']);

  function bindablePorts(direction: Direction) {
    return listBindablePorts(workflow, entryDirectionOf(direction));
  }

  function bindingKey(nodeId: string, portId: string): string {
    return `${nodeId}::${portId}`;
  }

  /** The entry's current single binding, as a picker value (`''` = unbound). */
  function currentBindingValue(entry: WorkflowInterfaceEntry): string {
    const binding = entry.bindings[0];
    return binding ? bindingKey(binding.nodeId, binding.portId) : '';
  }

  function nextId(direction: Direction): string {
    const prefix = direction === 'inputs' ? 'input' : 'output';
    const existing = new Set(entriesFor(direction).map((e) => e.id));
    let n = existing.size + 1;
    let candidate = `${prefix}_${n}`;
    while (existing.has(candidate)) {
      n += 1;
      candidate = `${prefix}_${n}`;
    }
    return candidate;
  }

  /**
   * Commit a direction's entry list back to the workflow, collapsing to
   * `undefined` when the whole interface ends up empty (decision 5: additive
   * and optional — an interface nobody populated should not linger as `{}`).
   */
  function commit(direction: Direction, next: WorkflowInterfaceEntry[]): void {
    const inputs = direction === 'inputs' ? next : (workflow.interface?.inputs ?? []);
    const outputs = direction === 'outputs' ? next : (workflow.interface?.outputs ?? []);
    const cleanedInputs = inputs.length > 0 ? inputs : undefined;
    const cleanedOutputs = outputs.length > 0 ? outputs : undefined;
    if (!cleanedInputs && !cleanedOutputs) {
      onChange(undefined);
      return;
    }
    onChange({ inputs: cleanedInputs, outputs: cleanedOutputs });
  }

  function addEntry(direction: Direction): void {
    const entry: WorkflowInterfaceEntry = { id: nextId(direction), dataType: '', bindings: [] };
    commit(direction, [...entriesFor(direction), entry]);
  }

  function removeEntry(direction: Direction, index: number): void {
    commit(
      direction,
      entriesFor(direction).filter((_, i) => i !== index)
    );
  }

  function moveEntry(direction: Direction, index: number, delta: -1 | 1): void {
    const list = [...entriesFor(direction)];
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    commit(direction, list);
  }

  function patchEntry(
    direction: Direction,
    index: number,
    patch: Partial<WorkflowInterfaceEntry>
  ): void {
    const list = entriesFor(direction).map((entry, i) =>
      i === index ? { ...entry, ...patch } : entry
    );
    commit(direction, list);
  }

  function handleBindingChange(direction: Direction, index: number, value: string): void {
    if (!value) {
      patchEntry(direction, index, { bindings: [] });
      return;
    }
    const [nodeId, portId] = value.split('::');
    const patch: Partial<WorkflowInterfaceEntry> = { bindings: [{ nodeId, portId }] };
    // Convenience default: prefill an empty dataType from the picked port's own
    // type. The field stays freely editable afterward — this only saves the
    // common case of typing out what the port already declares.
    const entry = entriesFor(direction)[index];
    if (entry && !entry.dataType) {
      const match = bindablePorts(direction).find(
        (b) => b.nodeId === nodeId && b.port.id === portId
      );
      if (match) patch.dataType = match.port.dataType;
    }
    patchEntry(direction, index, patch);
  }

  /**
   * Write one example slot back, dropping empties and collapsing an empty
   * list to `undefined` so an untouched entry stores no `examples` key.
   */
  function patchExample(
    direction: Direction,
    index: number,
    entry: WorkflowInterfaceEntry,
    exampleIndex: number,
    raw: string
  ): void {
    const next = [...(entry.examples ?? [])];
    if (raw === '') next.splice(exampleIndex, 1);
    else next[exampleIndex] = parseDefaultValue(raw);
    patchEntry(direction, index, { examples: next.length > 0 ? next : undefined });
  }

  function addExample(direction: Direction, index: number, entry: WorkflowInterfaceEntry): void {
    patchEntry(direction, index, { examples: [...(entry.examples ?? []), ''] });
  }

  function removeExample(
    direction: Direction,
    index: number,
    entry: WorkflowInterfaceEntry,
    exampleIndex: number
  ): void {
    const next = (entry.examples ?? []).filter((_, i) => i !== exampleIndex);
    patchEntry(direction, index, { examples: next.length > 0 ? next : undefined });
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

<div class="wf-interface">
  {#each SECTIONS as section (section.key)}
    {@const list = entriesFor(section.key)}
    <div class="wf-interface__section">
      <div class="wf-interface__section-header">
        <h4 class="wf-interface__section-title">
          {section.key === 'inputs'
            ? m().workflowInterface.inputsHeading
            : m().workflowInterface.outputsHeading}
        </h4>
        <button type="button" class="wf-interface__add" onclick={() => addEntry(section.key)}>
          <Icon icon="heroicons:plus" />
          {section.key === 'inputs'
            ? m().workflowInterface.addInput
            : m().workflowInterface.addOutput}
        </button>
      </div>

      {#if list.length === 0}
        <p class="wf-interface__empty">
          {section.key === 'inputs'
            ? m().workflowInterface.noInputs
            : m().workflowInterface.noOutputs}
        </p>
      {:else}
        <ul class="wf-interface__list">
          {#each list as entry, index (index)}
            {@const status = statusFor(section.key, entry.id)}
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
                  disabled={index === 0}
                  onclick={() => moveEntry(section.key, index, -1)}
                  aria-label={m().workflowInterface.moveUp({ id: entry.id })}
                >
                  <Icon icon="heroicons:chevron-up" />
                </button>
                <button
                  type="button"
                  disabled={index === list.length - 1}
                  onclick={() => moveEntry(section.key, index, 1)}
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
                      onchange={(e) =>
                        patchEntry(section.key, index, { id: e.currentTarget.value })}
                    />
                  </label>
                  <label class="wf-interface__field wf-interface__field--wide">
                    <span class="wf-interface__label">{m().workflowInterface.bindingLabel}</span>
                    <select
                      value={currentBindingValue(entry)}
                      onchange={(e) =>
                        handleBindingChange(section.key, index, e.currentTarget.value)}
                    >
                      <option value="">{m().workflowInterface.bindingUnbound}</option>
                      {#each bindablePorts(section.key) as candidate (bindingKey(candidate.nodeId, candidate.port.id))}
                        <option value={bindingKey(candidate.nodeId, candidate.port.id)}>
                          {candidate.nodeLabel} — {candidate.port.name} ({candidate.port.dataType})
                        </option>
                      {/each}
                    </select>
                    {#if section.key === 'inputs' && hasIssue(section.key, entry.id, 'interface-input-already-connected')}
                      <span class="wf-interface__inline wf-interface__inline--error">
                        {m().workflowInterface.alreadyConnectedInline({
                          source: conflictingSourceLabel(entry) ?? ''
                        })}
                      </span>
                    {/if}
                  </label>
                  {#if status?.targets[0]}
                    <button
                      type="button"
                      class="wf-interface__pull"
                      title={m().workflowInterface.pullFromPortTitle}
                      onclick={() =>
                        patchEntry(
                          section.key,
                          index,
                          pullEntryFieldsFromPort(status.targets[0].port)
                        )}
                    >
                      <Icon icon="heroicons:arrow-down-tray" />
                      {m().workflowInterface.pullFromPort}
                    </button>
                  {/if}
                </div>

                <details
                  class="wf-interface__more"
                  open={status?.status === 'type-mismatch' || undefined}
                >
                  <summary>{m().workflowInterface.moreOptions}</summary>
                  <div class="wf-interface__row">
                    <label class="wf-interface__field">
                      <span class="wf-interface__label">{m().workflowInterface.nameLabel}</span>
                      <input
                        type="text"
                        value={entry.name ?? ''}
                        placeholder={m().workflowInterface.namePlaceholder}
                        onchange={(e) =>
                          patchEntry(section.key, index, {
                            name: e.currentTarget.value || undefined
                          })}
                      />
                    </label>
                    <label class="wf-interface__field">
                      <span class="wf-interface__label">{m().workflowInterface.dataTypeLabel}</span>
                      <select
                        value={entry.dataType}
                        onchange={(e) =>
                          patchEntry(section.key, index, { dataType: e.currentTarget.value })}
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
                      {#if status?.status === 'type-mismatch' && boundPortType(status)}
                        <span class="wf-interface__inline wf-interface__inline--warning">
                          {m().workflowInterface.typeMismatchInline({
                            portType: boundPortType(status) ?? ''
                          })}
                          <button
                            type="button"
                            class="wf-interface__quickfix"
                            onclick={() =>
                              patchEntry(section.key, index, {
                                dataType: boundPortType(status) ?? entry.dataType
                              })}
                          >
                            {m().workflowInterface.useMatchPortType}
                          </button>
                        </span>
                      {/if}
                    </label>
                    {#if section.key === 'inputs'}
                      <label class="wf-interface__field wf-interface__field--checkbox">
                        <input
                          type="checkbox"
                          checked={entry.required ?? false}
                          onchange={(e) =>
                            patchEntry(section.key, index, {
                              required: e.currentTarget.checked || undefined
                            })}
                        />
                        <span class="wf-interface__label"
                          >{m().workflowInterface.requiredLabel}</span
                        >
                      </label>
                    {/if}
                  </div>

                  <div class="wf-interface__row">
                    <label class="wf-interface__field wf-interface__field--wide">
                      <span class="wf-interface__label"
                        >{m().workflowInterface.descriptionLabel}</span
                      >
                      <input
                        type="text"
                        value={entry.description ?? ''}
                        onchange={(e) =>
                          patchEntry(section.key, index, {
                            description: e.currentTarget.value || undefined
                          })}
                      />
                    </label>
                    <label class="wf-interface__field">
                      <span class="wf-interface__label"
                        >{m().workflowInterface.defaultValueLabel}</span
                      >
                      <input
                        type="text"
                        value={formatDefaultValue(entry.defaultValue)}
                        onchange={(e) =>
                          patchEntry(section.key, index, {
                            defaultValue: parseDefaultValue(e.currentTarget.value)
                          })}
                      />
                    </label>
                  </div>

                  {#if section.key === 'inputs'}
                    <div class="wf-interface__examples">
                      <span class="wf-interface__label">
                        {m().workflowInterface.examplesLabel}
                      </span>
                      {#each entry.examples ?? [] as example, exampleIndex (exampleIndex)}
                        <div class="wf-interface__example-row">
                          <input
                            type="text"
                            value={formatDefaultValue(example)}
                            onchange={(e) =>
                              patchExample(
                                section.key,
                                index,
                                entry,
                                exampleIndex,
                                e.currentTarget.value
                              )}
                          />
                          <button
                            type="button"
                            class="wf-interface__example-remove"
                            onclick={() => removeExample(section.key, index, entry, exampleIndex)}
                            aria-label={m().workflowInterface.removeExample}
                          >
                            <Icon icon="heroicons:x-mark" />
                          </button>
                        </div>
                      {/each}
                      <button
                        type="button"
                        class="wf-interface__example-add"
                        onclick={() => addExample(section.key, index, entry)}
                      >
                        <Icon icon="heroicons:plus" />
                        {m().workflowInterface.addExample}
                      </button>
                    </div>
                  {/if}
                </details>

                <!-- Every resolveInterface status renders in words somewhere in
                     this card — the obligation that makes this surface
                     canonical. `ok` lives on the header dot; type-mismatch and
                     already-connected render inline next to their own field;
                     the rest are explained here. -->
                {#if status && FOOTER_STATUSES.has(status.status)}
                  <p class="wf-interface__status wf-interface__status--{status.status}">
                    {describeInterfaceEntryStatus(status)}
                  </p>
                {/if}
                {#each footerIssues(section.key, entry.id, status) as issue (issue.code)}
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
                onclick={() => removeEntry(section.key, index)}
                aria-label={m().workflowInterface.removeEntry({ id: entry.id })}
              >
                <Icon icon="heroicons:trash" />
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/each}
</div>

<style>
  .wf-interface {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-lg, 1.5rem);
  }

  .wf-interface__section {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-xs);
  }

  .wf-interface__section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .wf-interface__section-title {
    margin: 0;
    font-size: var(--fd-text-xs);
    font-weight: 600;
    color: var(--fd-muted-foreground);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .wf-interface__add {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    border-radius: var(--fd-radius-sm);
    border: 1px solid var(--fd-border);
    background: var(--fd-background);
    color: var(--fd-foreground);
    font-size: var(--fd-text-xs);
    cursor: pointer;
  }

  .wf-interface__add:hover {
    background: var(--fd-muted);
  }

  .wf-interface__empty {
    margin: 0;
    font-size: var(--fd-text-xs);
    color: var(--fd-muted-foreground);
    font-style: italic;
  }

  .wf-interface__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-xs);
  }

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
