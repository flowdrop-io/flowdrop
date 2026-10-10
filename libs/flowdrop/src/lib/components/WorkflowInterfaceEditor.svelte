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
  so every edit here goes through the store's normal history path. When an
  edit renames or removes an input id, `onChange` also says so, so the caller
  can carry the workflow's chat binding (`playground.chat`, which names inputs
  by id) along in the same update (`followInterfaceInputEdit`).

  `meta` is never editable here (design decision 4) — it round-trips verbatim
  and is shown as a read-only JSON disclosure when present. One exception: the
  Chat turn selector writes `meta.limit` on a `history` entry (and removes it
  when the entry stops being one), the one key `turn` owns.
-->

<script lang="ts">
  import Icon from '@iconify/svelte';
  import Button from '$lib/components/primitives/Button.svelte';
  import { m } from '$lib/messages/index.js';
  import WorkflowInterfaceEntryCard from '$lib/components/WorkflowInterfaceEntryCard.svelte';
  import WorkflowInterfaceEntryComposer from '$lib/components/WorkflowInterfaceEntryComposer.svelte';
  import { buildHandleId } from '$lib/utils/handleIds.js';
  import { reservedInputs } from '$lib/utils/reservedPorts.js';
  import { DEFAULT_PORT_CONFIG } from '$lib/config/defaultPortConfig.js';
  import { PortCompatibilityChecker } from '$lib/utils/connections.js';
  import type {
    PortDataTypeConfig,
    Workflow,
    WorkflowInterface,
    WorkflowInterfaceEntry
  } from '$lib/types/index.js';
  import type { InterfaceInputEdit } from '$lib/utils/playgroundChat.js';
  import {
    entryFromBindablePort,
    rankBindablePorts,
    resolveInterface,
    turnTakenBy,
    validateWorkflowInterface,
    type InterfaceIssue,
    type RankedBindablePort,
    type ResolvedInterfaceEntry
  } from '$lib/utils/workflowInterface.js';

  interface Props {
    workflow: Workflow;
    /**
     * The next interface, after an edit. `edit` is set when the edit renamed
     * or removed an input id (and no other input still has the old one), so
     * the caller can follow it in the chat binding.
     */
    onChange: (next: WorkflowInterface | undefined, edit?: InterfaceInputEdit) => void;
    /**
     * Opens the workflow's Playground settings. Entries that still carry the
     * deprecated chat `turn` link there; omit when the host has none.
     */
    onOpenPlaygroundSettings?: () => void;
    /**
     * The data-type vocabulary offered by the dataType picker — the host's
     * live `PortConfig.dataTypes` (pass `portCompatibility.getEnabledDataTypes()`).
     * The wire format stays an open string; this only constrains *authoring*.
     */
    dataTypes?: PortDataTypeConfig[];
    /**
     * The instance's port-compatibility checker (pass `fd.portCompatibility`).
     * The composer's port picker draws each candidate with the canvas's shape
     * symbol and lane chip, and both read the checker for shape and colour.
     * Defaults to a checker over the built-in port config.
     */
    checker?: PortCompatibilityChecker;
  }

  const {
    workflow,
    onChange,
    onOpenPlaygroundSettings,
    dataTypes = DEFAULT_PORT_CONFIG.dataTypes.filter((dt) => dt.enabled !== false),
    checker = new PortCompatibilityChecker(DEFAULT_PORT_CONFIG)
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
  // One read-only `event:<node-id>` per trigger node (MAN-26).
  const reserved = $derived(reservedInputs(workflow));

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
    'interface-input-already-connected',
    'interface-turn-duplicate'
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
    return rankBindablePorts(workflow, entryDirectionOf(direction));
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
  function commit(
    direction: Direction,
    next: WorkflowInterfaceEntry[],
    edit?: InterfaceInputEdit
  ): void {
    const inputs = direction === 'inputs' ? next : (workflow.interface?.inputs ?? []);
    const outputs = direction === 'outputs' ? next : (workflow.interface?.outputs ?? []);
    const nextInterface = {
      inputs: inputs.length > 0 ? inputs : undefined,
      outputs: outputs.length > 0 ? outputs : undefined
    };
    // An id another input still carries is still on the interface: nothing
    // the binding names went away.
    if (direction === 'inputs' && edit && !inputs.some((entry) => entry.id === edit.id)) {
      onChange(nextInterface, edit);
    } else {
      onChange(nextInterface);
    }
  }

  /**
   * Which section's "Add" composer is open, if any. One at a time: opening
   * the other side's closes this one, and adding or cancelling closes it.
   */
  let composerFor = $state<Direction | null>(null);

  function toggleComposer(direction: Direction): void {
    composerFor = composerFor === direction ? null : direction;
  }

  function appendEntry(direction: Direction, entry: WorkflowInterfaceEntry): void {
    // A row id of its own, so adding an entry leaves every other card — and
    // every other card's disclosure — exactly as the author left it.
    rowIds[direction] = [...rowIds[direction], mintRowId()];
    commit(direction, [...entriesFor(direction), entry]);
    composerFor = null;
  }

  /** The composer's "no, custom" path: an empty, unbound entry with a generated id. */
  function addEntry(direction: Direction): void {
    appendEntry(direction, { id: nextId(direction), dataType: '', bindings: [] });
  }

  /** The composer's "yes, bind" path: an entry pulled from the picked port. */
  function addBoundEntry(direction: Direction, candidate: RankedBindablePort): void {
    appendEntry(
      direction,
      entryFromBindablePort(
        candidate,
        entriesFor(direction).map((entry) => entry.id)
      )
    );
  }

  function removeEntry(direction: Direction, index: number): void {
    // Dropping the row id destroys that card's component, and its disclosure
    // state with it — no bookkeeping to keep in step.
    const removed = entriesFor(direction)[index];
    rowIds[direction].splice(index, 1);
    commit(
      direction,
      entriesFor(direction).filter((_, i) => i !== index),
      removed && { kind: 'remove', id: removed.id }
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
    const before = entriesFor(direction)[index];
    const list = entriesFor(direction).map((entry, i) =>
      i === index ? applyPatch(entry, patch) : entry
    );
    const renamed: InterfaceInputEdit | undefined =
      before && typeof patch.id === 'string' && patch.id !== before.id
        ? { kind: 'rename', id: before.id, to: patch.id }
        : undefined;
    commit(direction, list, renamed);
  }

  /**
   * Merge a patch into an entry. A key the patch sets to `undefined` is
   * removed rather than kept as an own `undefined` property, so clearing a
   * field (a turn set back to none, an emptied name) leaves no key behind.
   * Keys the patch does not mention — including ones this editor does not
   * know — are carried over untouched.
   */
  function applyPatch(
    entry: WorkflowInterfaceEntry,
    patch: Partial<WorkflowInterfaceEntry>
  ): WorkflowInterfaceEntry {
    const next: WorkflowInterfaceEntry = { ...entry, ...patch };
    for (const key of Object.keys(patch) as Array<keyof WorkflowInterfaceEntry>) {
      if (patch[key] === undefined) delete next[key];
    }
    return next;
  }
</script>

<div class="wf-interface">
  {#each SECTIONS as section (section.key)}
    {@const list = entriesFor(section.key)}
    <section class="wf-interface__section">
      <h4 class="wf-interface__section-title">
        {section.key === 'inputs'
          ? m().workflowInterface.inputsHeading
          : m().workflowInterface.outputsHeading}
      </h4>

      {#if section.key === 'inputs' && reserved.length > 0}
        <!-- Derived, never stored (MAN-26): read-only, and never written into
             the interface. -->
        <div class="wf-interface__reserved" data-testid="interface-reserved-inputs">
          <span class="wf-interface__reserved-title"
            >{m().workflowInterface.reservedInputsHeading}</span
          >
          <ul class="wf-interface__reserved-list">
            {#each reserved as input (input.name)}
              <li data-testid="interface-reserved-input"><code>{input.name}</code></li>
            {/each}
          </ul>
          <span class="wf-interface__reserved-hint">{m().workflowInterface.reservedInputsHint}</span
          >
        </div>
      {/if}

      {#if list.length > 0}
        <ul class="wf-interface__list">
          {#each list as entry, index (rowIds[section.key][index] ?? `pending-${index}`)}
            {@const status = statusFor(section.key, entry.id)}
            <WorkflowInterfaceEntryCard
              {entry}
              {status}
              {dataTypes}
              {checker}
              direction={section.key}
              candidates={bindablePorts(section.key)}
              footerIssues={footerIssues(section.key, entry.id, status)}
              alreadyConnected={hasIssue(
                section.key,
                entry.id,
                'interface-input-already-connected'
              )}
              conflictingSource={conflictingSourceLabel(entry)}
              turnTakenBy={section.key === 'inputs' && !workflow.playground?.chat
                ? turnTakenBy(entriesFor('inputs'), entry)
                : undefined}
              {onOpenPlaygroundSettings}
              turnSelector={workflow.playground === undefined}
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

      <!-- The insertion point, always shown: a new entry lands here, at the end
           of the list. While the composer is open it takes the button's place,
           so the draft sits exactly where the entry it becomes will sit. Doubles
           as the empty state: an empty side is a side with only its button. -->
      {#if composerFor === section.key}
        <WorkflowInterfaceEntryComposer
          direction={section.key}
          candidates={bindablePorts(section.key)}
          {checker}
          onBind={(candidate) => addBoundEntry(section.key, candidate)}
          onCustom={() => addEntry(section.key)}
          onCancel={() => (composerFor = null)}
        />
      {:else}
        <Button
          variant="ghost"
          size="sm"
          class="wf-interface__add"
          onclick={() => toggleComposer(section.key)}
        >
          {#snippet leadingIcon()}<Icon icon="heroicons:plus" />{/snippet}
          {section.key === 'inputs'
            ? m().workflowInterface.addInput
            : m().workflowInterface.addOutput}
        </Button>
      {/if}
    </section>
  {/each}
</div>

<style>
  /*
    Two sections, inputs and outputs: a plain heading, the rows, and a ghost
    add button at the end of each list. Separation is space; there are no cards
    and no dashed slots.
  */
  .wf-interface {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-2xl);
  }

  .wf-interface__section {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-xs);
  }

  .wf-interface__section-title {
    margin: 0;
    font-size: var(--fd-text-sm);
    font-weight: 600;
    color: var(--fd-foreground);
  }

  .wf-interface__section :global(.wf-interface__add) {
    align-self: flex-start;
    margin-left: calc(var(--fd-space-xs) * -1);
    color: var(--fd-muted-foreground);
  }

  .wf-interface__section :global(.wf-interface__add:hover) {
    color: var(--fd-foreground);
  }

  .wf-interface__reserved {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-3xs);
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-xs);
  }

  .wf-interface__reserved-title {
    font-weight: 600;
  }

  .wf-interface__reserved-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: var(--fd-space-xs);
  }

  .wf-interface__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-3xs);
  }
</style>
