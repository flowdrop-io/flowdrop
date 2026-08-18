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
  import WorkflowInterfaceEntryCard from '$lib/components/WorkflowInterfaceEntryCard.svelte';
  import { buildHandleId } from '$lib/utils/handleIds.js';
  import { DEFAULT_PORT_CONFIG } from '$lib/config/defaultPortConfig.js';
  import type {
    PortDataTypeConfig,
    Workflow,
    WorkflowInterface,
    WorkflowInterfaceEntry
  } from '$lib/types/index.js';
  import {
    listBindablePorts,
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

  /**
   * Client-side row identity for the two entry lists.
   *
   * Interface entries have no identity of their own to key on. `id` is a field
   * the author edits, and every patch replaces the entry object wholesale, so
   * neither the field nor the object reference survives an edit. Keyed by
   * position instead, an `{#each}` reuses a row's DOM and its card component
   * for whichever entry lands in that slot — so `WorkflowInterfaceEntryCard`'s
   * per-row state (its open/closed disclosure) would belong to the slot rather
   * than to the entry, and reordering two cards would leave the open one
   * behind.
   *
   * So identity is minted here, kept out of the wire format entirely, and moved
   * in lockstep with the lists by the mutators below. Initialised eagerly
   * rather than in an effect so the `{#each}` never renders against ids that
   * have not caught up yet.
   */
  let rowIdSeq = 0;

  function mintRowId(): string {
    rowIdSeq += 1;
    return `row-${rowIdSeq}`;
  }

  let rowIds = $state<Record<Direction, string[]>>({
    inputs: entriesFor('inputs').map(mintRowId),
    outputs: entriesFor('outputs').map(mintRowId)
  });

  /**
   * Re-key a side whose list changed length from outside this component — undo,
   * redo, a reload, another authoring surface. The mutators below keep ids and
   * entries in step, so this never fires for a local edit.
   *
   * Converges: it writes only while the lengths disagree, and they agree once
   * it has. `$effect.pre` so the new ids are in place before the `{#each}`
   * reads them rather than one frame later.
   */
  $effect.pre(() => {
    for (const { key } of SECTIONS) {
      if (rowIds[key].length !== entriesFor(key).length) {
        rowIds[key] = entriesFor(key).map(mintRowId);
      }
    }
  });

  function bindablePorts(direction: Direction) {
    return listBindablePorts(workflow, entryDirectionOf(direction));
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
   * Commit a direction's entry list back to the workflow, dropping a side that
   * ends up empty so it reads as "declares nothing on this side".
   *
   * Always reports an interface *object*, even when the author has emptied both
   * sides. Reporting `undefined` there — as this did — made removing the last
   * entry impossible: the store treats `interface: undefined` as "no interface
   * key supplied, leave it alone", so the removal never landed and the row
   * stayed on screen. The server draws the same distinction, and for the same
   * reason: an absent `interface` is a partial update that must not disturb
   * port exposures authored elsewhere (the Drupal admin form), while a present
   * one rewrites both sides — so `{}` is what "the author emptied this" has to
   * look like on the wire.
   *
   * Decision 5 (additive and optional — an interface nobody populated should
   * not linger as `{}`) still holds: a workflow nobody has authored an
   * interface for never reaches this function, and keeps its absent key.
   */
  function commit(direction: Direction, next: WorkflowInterfaceEntry[]): void {
    const inputs = direction === 'inputs' ? next : (workflow.interface?.inputs ?? []);
    const outputs = direction === 'outputs' ? next : (workflow.interface?.outputs ?? []);
    onChange({
      inputs: inputs.length > 0 ? inputs : undefined,
      outputs: outputs.length > 0 ? outputs : undefined
    });
  }

  function addEntry(direction: Direction): void {
    const entry: WorkflowInterfaceEntry = { id: nextId(direction), dataType: '', bindings: [] };
    // A row id of its own, so adding an entry leaves every other card — and
    // every other card's disclosure — exactly as the author left it.
    rowIds[direction] = [...rowIds[direction], mintRowId()];
    commit(direction, [...entriesFor(direction), entry]);
  }

  function removeEntry(direction: Direction, index: number): void {
    // Dropping the row id destroys that card's component, and its disclosure
    // state with it — no bookkeeping to keep in step.
    rowIds[direction].splice(index, 1);
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
    // Row ids ride along, so a card's disclosure travels with the entry
    // instead of staying behind in the slot it used to occupy.
    const ids = rowIds[direction];
    [ids[index], ids[target]] = [ids[target], ids[index]];
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
          {#each list as entry, index (rowIds[section.key][index] ?? `pending-${index}`)}
            {@const status = statusFor(section.key, entry.id)}
            <WorkflowInterfaceEntryCard
              {entry}
              {status}
              {dataTypes}
              direction={section.key}
              candidates={bindablePorts(section.key)}
              footerIssues={footerIssues(section.key, entry.id, status)}
              alreadyConnected={hasIssue(
                section.key,
                entry.id,
                'interface-input-already-connected'
              )}
              conflictingSource={conflictingSourceLabel(entry)}
              isFirst={index === 0}
              isLast={index === list.length - 1}
              onPatch={(patch: Partial<WorkflowInterfaceEntry>) =>
                patchEntry(section.key, index, patch)}
              onMove={(delta: -1 | 1) => moveEntry(section.key, index, delta)}
              onRemove={() => removeEntry(section.key, index)}
            />
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
</style>
