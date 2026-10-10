/**
 * Workflow interface resolution + validation
 *
 * A workflow's `interface` (see `types/index.ts`) is its public contract:
 * named inputs/outputs a caller supplies or receives, each pointing at inner
 * node ports via `PortBinding`. This module resolves those bindings against a
 * workflow's live node graph and reports how well-formed the contract is.
 *
 * Everything here is a pure function: no store or component dependency, never
 * throws, never mutates its arguments. `utils/validation.ts` is the precedent
 * for advisory tone — issues are reported, not enforced.
 *
 * @module utils/workflowInterface
 */

import { isTriggerEventInput } from './reservedPorts.js';
import type {
  ConfigProperty,
  ConfigSchema,
  DynamicPort,
  NodePort,
  PortBinding,
  PortsConfig,
  Workflow,
  WorkflowInterface,
  WorkflowInterfaceEntry,
  WorkflowInterfaceTurn,
  WorkflowNode,
  WorkflowPlayground,
  PlaygroundChatBinding,
  PlaygroundReplyPort
} from '$lib/types/index.js';
import {
  dynamicPortToNodePort,
  WORKFLOW_INTERFACE_INPUT_TURNS,
  WORKFLOW_INTERFACE_OUTPUT_TURNS
} from '$lib/types/index.js';
import { isPortExposed } from '$lib/utils/portUtils.js';
import { LOOPBACK_PORT_NAME } from '$lib/utils/connections.js';
import { PORTS_CONFIG_KEY } from '$lib/utils/nodeFormSchema.js';
import { buildHandleId } from '$lib/utils/handleIds.js';
import type { PortMapping } from '$lib/utils/nodeSwap.js';
import {
  isPlaygroundChatHalfSet,
  normalizePlaygroundChat,
  playgroundBoundInputs,
  resolvePlaygroundChat,
  type ResolvedPlaygroundChat
} from '$lib/utils/playgroundChat.js';

/**
 * A binding resolved against the live node graph: the node and port it
 * points at, and which side of that node the port lives on.
 */
export interface ResolvedBinding {
  node: WorkflowNode;
  port: NodePort;
  /** The inner port's own direction — independent of the entry's direction. */
  direction: 'input' | 'output';
}

/**
 * Health of one interface entry, in order of severity (most severe first).
 * Only one status is ever reported per entry — see `STATUS_PRECEDENCE`.
 *
 * - `ok` — every binding resolves, is exposed, and matches type.
 * - `unbound` — `bindings` is empty. A valid draft state, not an error.
 * - `dangling` — a binding's node or port no longer exists in the graph.
 * - `hidden` — the bound port exists but is not canvas-exposed
 *   (per design decision 3: external ⊂ internal — see `isPortExposed`).
 * - `type-mismatch` — the entry's declared `dataType` differs from the bound
 *   port's. Advisory only; the library does not coerce.
 * - `over-bound` — more than one binding resolved.
 *
 *   The design record scopes this to outputs only ("an output with >1
 *   binding"). This implementation extends the same rule to inputs per
 *   workspace decision R2: v1 ships input fan-out as a documented
 *   limitation, not a partial feature, so an input with multiple bindings is
 *   reported the same way an output is. `bindings` stays an array on both
 *   sides so fan-out can become additive later without a shape change.
 */
export type InterfaceEntryStatus =
  | 'ok'
  | 'unbound'
  | 'dangling'
  | 'hidden'
  | 'type-mismatch'
  | 'over-bound';

/** Precedence used to pick the single reported status when several apply. */
const STATUS_PRECEDENCE: readonly InterfaceEntryStatus[] = [
  'dangling',
  'over-bound',
  'hidden',
  'type-mismatch',
  'unbound',
  'ok'
];

/** One interface entry plus its resolved targets and health. */
export interface ResolvedInterfaceEntry {
  entry: WorkflowInterfaceEntry;
  direction: 'input' | 'output';
  /** Bindings that resolved to a live node port. Dangling bindings are omitted. */
  targets: ResolvedBinding[];
  status: InterfaceEntryStatus;
}

/** One advisory finding from `validateWorkflowInterface`. */
export interface InterfaceIssue {
  entryId: string;
  direction: 'input' | 'output';
  severity: 'error' | 'warning';
  code: string;
  message: string;
}

/**
 * Resolve one `PortBinding` against a workflow's live node graph.
 *
 * Walks `workflow.nodes` for the bound node, then that node's declared
 * metadata ports (inputs and outputs) for the bound port. Returns `null` if
 * the node no longer exists, or the port isn't among that node's metadata
 * ports — the two ways a binding goes dangling.
 *
 * `PortBinding` carries no direction of its own, and a `portId` is only unique
 * within one side of a node: plenty of node types name an input and an output
 * the same thing (`chat_output` has both an input `message` and an output
 * `message`). `prefer` — the owning entry's direction — decides which side is
 * searched first, so such a binding resolves to the port the author actually
 * picked. The other side is still searched as a fallback, so a genuinely
 * misdirected binding (a port that exists only on the opposite side) still
 * resolves and gets reported by `validateWorkflowInterface`.
 */
export function resolveBinding(
  workflow: Workflow,
  binding: PortBinding,
  prefer: 'input' | 'output' = 'input'
): ResolvedBinding | null {
  const node = workflow.nodes.find((candidate) => candidate.id === binding.nodeId);
  if (!node) return null;

  const metadata = node.data?.metadata;
  const find = (direction: 'input' | 'output'): ResolvedBinding | null => {
    const ports = direction === 'input' ? metadata?.inputs : metadata?.outputs;
    const port = ports?.find((candidate) => candidate.id === binding.portId);
    return port ? { node, port, direction } : null;
  };

  const other = prefer === 'input' ? 'output' : 'input';
  return find(prefer) ?? find(other);
}

/** The instance's `config.ports` entries for a resolved binding's own direction. */
function portConfigEntriesFor(target: ResolvedBinding): PortsConfig['inputs' | 'outputs'] {
  const portsConfig = target.node.data?.config?.[PORTS_CONFIG_KEY] as PortsConfig | undefined;
  return target.direction === 'input' ? portsConfig?.inputs : portsConfig?.outputs;
}

/** Whether a resolved binding's target port is canvas-exposed. */
function isBindingExposed(target: ResolvedBinding): boolean {
  return isPortExposed(target.port, portConfigEntriesFor(target));
}

function resolveEntry(
  workflow: Workflow,
  entry: WorkflowInterfaceEntry,
  direction: 'input' | 'output'
): ResolvedInterfaceEntry {
  if (entry.bindings.length === 0) {
    return { entry, direction, targets: [], status: 'unbound' };
  }

  const resolved = entry.bindings.map((binding) => resolveBinding(workflow, binding, direction));
  const targets = resolved.filter((target): target is ResolvedBinding => target !== null);
  const isDangling = targets.length !== resolved.length;

  let status: InterfaceEntryStatus;
  if (isDangling) {
    status = 'dangling';
  } else if (targets.length > 1) {
    status = 'over-bound';
  } else if (!isBindingExposed(targets[0])) {
    status = 'hidden';
  } else if (targets[0].port.dataType !== entry.dataType) {
    status = 'type-mismatch';
  } else {
    status = 'ok';
  }

  return { entry, direction, targets, status };
}

/**
 * Resolve every entry of `workflow.interface` (inputs then outputs) against
 * the live node graph, with a health status per entry.
 *
 * A workflow with no `interface` key returns `[]` — absent interface means
 * "declares no contract," not "empty contract with issues."
 */
export function resolveInterface(workflow: Workflow): ResolvedInterfaceEntry[] {
  const inputs = workflow.interface?.inputs ?? [];
  const outputs = workflow.interface?.outputs ?? [];
  return [
    ...inputs.map((entry) => resolveEntry(workflow, entry, 'input')),
    ...outputs.map((entry) => resolveEntry(workflow, entry, 'output'))
  ];
}

const STATUS_MESSAGE: Record<Exclude<InterfaceEntryStatus, 'ok'>, (entry: string) => string> = {
  unbound: (entry) => `Interface entry "${entry}" has no bindings yet — a valid draft state.`,
  dangling: (entry) =>
    `Interface entry "${entry}" is bound to a node or port that no longer exists in this workflow.`,
  'over-bound': (entry) =>
    `Interface entry "${entry}" has more than one binding; v1 requires exactly one per entry.`,
  hidden: (entry) =>
    `Interface entry "${entry}" is bound to a port that is not exposed on the canvas, so external callers cannot reach it.`,
  'type-mismatch': (entry) =>
    `Interface entry "${entry}" declares a data type that does not match its bound port's type.`
};

/** Severity assigned to each non-`ok` status when surfaced as a validation issue. */
const STATUS_SEVERITY: Record<Exclude<InterfaceEntryStatus, 'ok'>, 'error' | 'warning'> = {
  unbound: 'warning',
  dangling: 'error',
  'over-bound': 'error',
  hidden: 'error',
  'type-mismatch': 'warning'
};

/**
 * Advisory validation for `workflow.interface`. Never throws, never mutates.
 * Returns an empty array for a workflow with no `interface` key.
 *
 * Reports, per entry:
 * - every non-`ok` status from `resolveInterface`;
 * - a duplicate `id` within the same direction (inputs and outputs are
 *   scoped separately, matching the entry doc's "unique within its direction");
 * - for input entries, a bound port that already has an incoming edge — two
 *   sources writing the same value;
 * - a binding whose resolved port direction contradicts the entry's own
 *   direction (an "input" entry bound to a node's output port, or vice versa).
 */
export function validateWorkflowInterface(workflow: Workflow): InterfaceIssue[] {
  if (!workflow.interface) return [];

  const issues: InterfaceIssue[] = [];
  const resolved = resolveInterface(workflow);

  for (const resolvedEntry of resolved) {
    const { entry, direction, targets, status } = resolvedEntry;

    if (status !== 'ok') {
      issues.push({
        entryId: entry.id,
        direction,
        severity: STATUS_SEVERITY[status],
        code: `interface-${status}`,
        message: STATUS_MESSAGE[status](entry.id)
      });
    }

    for (const target of targets) {
      if (target.direction !== direction) {
        issues.push({
          entryId: entry.id,
          direction,
          severity: 'error',
          code: 'interface-direction-mismatch',
          message: `Interface ${direction} "${entry.id}" is bound to a node ${target.direction} port; the binding's direction must match the entry's.`
        });
      }

      if (direction === 'input') {
        const handleId = buildHandleId(target.node.id, 'input', target.port.id);
        const hasIncomingEdge = workflow.edges.some((edge) => edge.targetHandle === handleId);
        if (hasIncomingEdge) {
          issues.push({
            entryId: entry.id,
            direction,
            severity: 'error',
            code: 'interface-input-already-connected',
            message: `Interface input "${entry.id}" is bound to a port that already has an incoming edge; the port would receive two sources for one value.`
          });
        }
      }
    }
  }

  // Deprecated `turn` marks. With stored Playground settings the server
  // ignores them, so they warrant no warning (the Playground tab offers to
  // remove them). Without a `playground` key (a server before FlowDrop
  // 2.7.0) they are still the only chat set-up, and the selector is offered.
  const checkTurns = !workflow.playground?.chat;
  const turnHint =
    workflow.playground === undefined
      ? 'a workflow takes at most one input per turn value.'
      : 'only the first one counts. Set the chat up in the Playground settings instead.';
  const directionHint =
    workflow.playground === undefined ? '' : ' Set the chat up in the Playground settings instead.';

  for (const entry of workflow.interface.inputs ?? []) {
    const otherId = checkTurns ? turnTakenBy(workflow.interface.inputs ?? [], entry) : undefined;
    if (otherId !== undefined) {
      issues.push({
        entryId: entry.id,
        direction: 'input',
        severity: 'warning',
        code: 'interface-turn-duplicate',
        message: `Interface input "${entry.id}" has the deprecated chat turn "${entry.turn}", which input "${otherId}" already has; ${turnHint}`
      });
    }
  }

  for (const direction of ['input', 'output'] as const) {
    const entries =
      (direction === 'input' ? workflow.interface.inputs : workflow.interface.outputs) ?? [];
    for (const entry of entries) {
      if (
        checkTurns &&
        entry.turn !== undefined &&
        isKnownTurn(entry.turn) &&
        !turnsFor(direction).includes(entry.turn)
      ) {
        issues.push({
          entryId: entry.id,
          direction,
          severity: 'warning',
          code: 'interface-turn-direction',
          message: `Interface ${direction} "${entry.id}" has the deprecated chat turn "${entry.turn}", which only applies to ${direction === 'input' ? 'outputs' : 'inputs'}.${directionHint}`
        });
      }
    }
  }

  for (const direction of ['input', 'output'] as const) {
    const entries =
      (direction === 'input' ? workflow.interface.inputs : workflow.interface.outputs) ?? [];
    const seenCounts = new Map<string, number>();
    for (const entry of entries) {
      seenCounts.set(entry.id, (seenCounts.get(entry.id) ?? 0) + 1);
    }
    for (const [id, count] of seenCounts) {
      if (count > 1) {
        issues.push({
          entryId: id,
          direction,
          severity: 'error',
          code: 'interface-duplicate-id',
          message: `Interface ${direction} id "${id}" is declared ${count} times; ids must be unique within their direction.`
        });
      }
    }
  }

  return issues;
}

/** One pre-launch input problem, mirroring the server's refusal semantics. */
export interface LaunchInputIssue {
  /** The offending input key, when attributable to one. */
  key?: string;
  code: 'unknown-key' | 'missing-required';
  message: string;
}

/**
 * Pre-validate launch inputs against a declared interface, mirroring what the
 * server's manifest check refuses: an unknown key (named against the accepted
 * set) and a missing required input. Value type/enum checking stays with the
 * server — the client does not re-implement schema validation.
 *
 * A workflow with no declared interface returns no issues: there is nothing
 * to pre-validate against and the server remains the authority.
 */
export function validateLaunchInputs(
  workflowInterface: WorkflowInterface | undefined,
  inputs: Record<string, unknown>
): LaunchInputIssue[] {
  const entries = workflowInterface?.inputs;
  if (!entries) return [];

  const issues: LaunchInputIssue[] = [];
  const accepted = entries.map((entry) => entry.id);

  for (const key of Object.keys(inputs)) {
    if (!accepted.includes(key)) {
      issues.push({
        key,
        code: 'unknown-key',
        message:
          accepted.length > 0
            ? `Unknown input "${key}". Accepted inputs: ${accepted.join(', ')}.`
            : `Unknown input "${key}". This workflow declares no inputs.`
      });
    }
  }

  for (const entry of entries) {
    const supplied = entry.id in inputs && inputs[entry.id] !== undefined;
    if (entry.required && !supplied && entry.defaultValue === undefined) {
      issues.push({
        key: entry.id,
        code: 'missing-required',
        message: `Missing required input "${entry.id}".`
      });
    }
  }

  return issues;
}

// Re-export the precedence order for callers/tests that want to assert it
// without duplicating the literal array.
export { STATUS_PRECEDENCE };

/**
 * Handle IDs bound to a workflow interface entry, mapped to the entry itself
 * (so a caller can render the entry's public name — e.g. in a tooltip —
 * without a second lookup).
 *
 * Built from `resolveInterface`, so it inherits the same resolution rules:
 * only bindings that resolve to a *live* port contribute a handle id. A
 * `dangling` binding has no live handle to mark, and an `unbound` entry has
 * no bindings at all — neither appears here. A `hidden` binding does resolve
 * (its handle id is included), but the node components filter not-exposed
 * ports out of render entirely, so no handle ever exists for it to mark in
 * practice. Every other status (`ok`, `type-mismatch`, `over-bound`)
 * contributes its resolved target(s) — the ring is a "this port is part of
 * the public contract" marker, not a "this entry is fully healthy" one; the
 * canonical editor (Phase 3) is where health is explained in words.
 *
 * When a binding's target resolves to more than one caller (an `over-bound`
 * output), each target's handle id maps to the same entry.
 *
 * Handle ids use the target *port's* own direction (`ResolvedBinding.direction`),
 * matching the id every node component actually renders
 * (`buildHandleId(nodeId, direction, portId)`) — not the entry's direction,
 * which can differ from the bound port's for a misdirected binding.
 */
export function interfaceBoundHandles(workflow: Workflow): Map<string, WorkflowInterfaceEntry> {
  const bound = new Map<string, WorkflowInterfaceEntry>();

  for (const resolvedEntry of resolveInterface(workflow)) {
    for (const target of resolvedEntry.targets) {
      const handleId = buildHandleId(target.node.id, target.direction, target.port.id);
      if (!bound.has(handleId)) bound.set(handleId, resolvedEntry.entry);
    }
  }

  return bound;
}

/**
 * Tooltip text for a handle bound to an interface entry — `undefined` when
 * `entry` is `undefined` (the port isn't bound), so callers can pass
 * `interfaceBoundHandles(workflow).get(handleId)` straight through without an
 * intermediate check. The single home for this string so all five node
 * components and `FormPorts` render identical wording.
 */
export function interfaceBoundTooltip(
  entry: WorkflowInterfaceEntry | undefined
): string | undefined {
  return entry ? `Published as: ${entry.name ?? entry.id}` : undefined;
}

/**
 * Rewrite `workflow.interface` bindings that point at a node swapped out by
 * `nodeSwap.ts` — the one place bindings actively move (see
 * `.claude/plans/workflow-interface.md` Phase 2). Every other mutation
 * (including node deletion) leaves bindings untouched by design.
 *
 * A binding `{ nodeId: oldNodeId, portId }` on an input entry is rewritten
 * when `portMappings` has a `direction: 'input'` mapping for that `portId`;
 * output entries match against `direction: 'output'` mappings the same way —
 * an entry's own direction (which array it lives in) picks which side of the
 * mapping applies. A port the mapping drops (no matching entry) is left
 * untouched; it resolves as `dangling` once the old node is gone, the same
 * as any other dangling binding — no silent pruning.
 *
 * Pure: returns a new `WorkflowInterface`, never mutates its argument.
 * Returns the input unchanged when there is no interface to rewrite.
 */
export function rewriteInterfaceBindings(
  workflowInterface: WorkflowInterface | undefined,
  oldNodeId: string,
  newNodeId: string,
  portMappings: PortMapping[]
): WorkflowInterface | undefined {
  if (!workflowInterface) return workflowInterface;

  const rewriteEntries = (
    entries: WorkflowInterfaceEntry[] | undefined,
    direction: 'input' | 'output'
  ): WorkflowInterfaceEntry[] | undefined => {
    if (!entries) return entries;
    return entries.map((entry) => ({
      ...entry,
      bindings: entry.bindings.map((binding): PortBinding => {
        if (binding.nodeId !== oldNodeId) return binding;
        const mapping = portMappings.find(
          (candidate) => candidate.direction === direction && candidate.oldPortId === binding.portId
        );
        return mapping ? { nodeId: newNodeId, portId: mapping.newPortId } : binding;
      })
    }));
  };

  return {
    inputs: rewriteEntries(workflowInterface.inputs, 'input'),
    outputs: rewriteEntries(workflowInterface.outputs, 'output')
  };
}

/** Plain-prose explanation for a resolved entry's health, covering every status. */
export function describeInterfaceEntryStatus(resolved: ResolvedInterfaceEntry): string {
  const { entry, status } = resolved;
  if (status === 'ok') {
    return `Interface entry "${entry.id}" is bound to an exposed port with a matching type — ready for callers.`;
  }
  return STATUS_MESSAGE[status](entry.id);
}

/**
 * Entry fields derivable from a bound port — the "pull details from port"
 * convenience. Copies the port's display name, dataType, and (when the port
 * declares them) description, required and defaultValue. Only fields the port
 * actually provides appear in the patch, so applying it never blanks a value
 * the author already wrote for a field the port is silent about.
 *
 * The public `id` is deliberately NOT derived — a contract keyed on internal
 * port names is the failure mode DN1 exists to prevent.
 */
export function pullEntryFieldsFromPort(port: NodePort): Partial<WorkflowInterfaceEntry> {
  const patch: Partial<WorkflowInterfaceEntry> = { name: port.name, dataType: port.dataType };
  if (port.description !== undefined) patch.description = port.description;
  if (port.required !== undefined) patch.required = port.required;
  if (port.defaultValue !== undefined) patch.defaultValue = port.defaultValue;
  return patch;
}

/**
 * Whether a port is intra-graph control flow — the reserved `trigger`
 * dataType, the loopback input, or a `tool` *output* — and therefore never
 * publishable in a workflow's interface.
 *
 * A `tool` **input** is deliberately not control flow here. Tools are a typed
 * argument of a workflow's execution (fddo DF9): exposing a consumer's `tool`
 * input (a ToolBox's `tools`, an LLM node's `tools`) in the interface is how a
 * parent hands its tools to a sub-workflow, so the picker must offer it. A
 * `tool` output is the inverse — a workflow *producing* a tool — which is not
 * a composition the runtime supports through the interface (a workflow is
 * made a tool by a different mechanism), so it stays excluded.
 */
function isControlFlowPort(port: NodePort, direction: 'input' | 'output'): boolean {
  if (port.dataType === 'trigger' || port.id === LOOPBACK_PORT_NAME) return true;
  return port.dataType === 'tool' && direction === 'output';
}

/**
 * The name a node shows on the canvas: the instance title the author gave it
 * ("Final Chat Output"), else the node type's label, else its id.
 */
export function nodeCanvasLabel(node: {
  id: string;
  data?: { label?: string; config?: Record<string, unknown> };
}): string {
  const title = node.data?.config?.instanceTitle;
  return (typeof title === 'string' && title) || node.data?.label || node.id;
}

/** One inner port a `WorkflowInterfaceEntry` could bind to, plus its owning node. */
export interface BindablePort {
  nodeId: string;
  /** The node's display label, for a human-readable option list. */
  nodeLabel: string;
  port: NodePort;
}

/**
 * Every canvas-exposed port of a workflow, for one direction — the candidate
 * set a binding picker offers (design decision 3: external ⊂ internal, so an
 * entry may only bind to a port that is already exposed).
 *
 * Mirrors `FormPorts.svelte`'s port list: a node's static metadata ports plus
 * its user-defined dynamic ports, filtered by `isPortExposed`.
 *
 * Control-flow ports are excluded: the reserved `trigger` dataType, the
 * `loop_back` port and `tool` outputs are intra-graph control flow, not an
 * external surface (DN1's grounded fact). `tool` inputs are offered — see
 * `isControlFlowPort`. The model and validation stay permissive — this only
 * constrains what the authoring picker offers.
 */
export function listBindablePorts(
  workflow: Workflow,
  direction: 'input' | 'output'
): BindablePort[] {
  const result: BindablePort[] = [];

  for (const node of workflow.nodes) {
    const metadata = node.data?.metadata;
    if (!metadata) continue;

    const staticPorts = direction === 'input' ? (metadata.inputs ?? []) : (metadata.outputs ?? []);
    const dynamicRaw =
      direction === 'input' ? node.data?.config?.dynamicInputs : node.data?.config?.dynamicOutputs;
    const dynamicPorts = ((dynamicRaw as DynamicPort[] | undefined) ?? []).map((port) =>
      dynamicPortToNodePort(port, direction)
    );

    const portsConfigDirection = direction === 'input' ? 'inputs' : 'outputs';
    const portsConfig = node.data?.config?.[PORTS_CONFIG_KEY] as PortsConfig | undefined;
    const entries = portsConfig?.[portsConfigDirection];

    for (const port of [...staticPorts, ...dynamicPorts]) {
      if (isControlFlowPort(port, direction)) continue;
      // A trigger's event input is never part of the contract (MAN-27).
      if (direction === 'input' && isTriggerEventInput(node, port.id)) continue;
      if (isPortExposed(port, entries)) {
        result.push({ nodeId: node.id, nodeLabel: nodeCanvasLabel(node), port });
      }
    }
  }

  return result;
}

/** A bindable port plus what the canvas already does with it. */
export interface RankedBindablePort extends BindablePort {
  /** An edge already feeds this input, or already drains this output. */
  connected: boolean;
  /** The id of the same-direction interface entry that already binds this port, if any. */
  publishedAs?: string;
}

/**
 * A stable key for a bindable port — `nodeId::portId` — the value a picker
 * highlights by and an entry's single binding is compared against.
 */
export function bindablePortKey(
  candidate: BindablePort | { nodeId: string; portId: string }
): string {
  const portId = 'port' in candidate ? candidate.port.id : candidate.portId;
  return `${candidate.nodeId}::${portId}`;
}

/** A port nothing is using yet — the natural first pick for a new entry. */
export function isFreeBindablePort(candidate: RankedBindablePort): boolean {
  return !candidate.connected && candidate.publishedAs === undefined;
}

/**
 * `listBindablePorts`, annotated and ordered for a "pick a port to publish"
 * picker: every port nothing is using yet comes first, then the ports that
 * already have an edge or are already published by another entry. Within
 * each group the canvas order is kept, so the list stays stable as the
 * author edits.
 *
 * "Connected" mirrors `validateWorkflowInterface`'s already-connected rule
 * for inputs (an incoming edge on the bound handle) and its natural inverse
 * for outputs (an outgoing edge). Neither is forbidden — an output can be
 * both wired and published — the ranking only says which ports need no
 * second thought.
 */
export function rankBindablePorts(
  workflow: Workflow,
  direction: 'input' | 'output'
): RankedBindablePort[] {
  const entries =
    (direction === 'input' ? workflow.interface?.inputs : workflow.interface?.outputs) ?? [];

  const ranked = listBindablePorts(workflow, direction).map((candidate): RankedBindablePort => {
    const handleId = buildHandleId(candidate.nodeId, direction, candidate.port.id);
    const connected = workflow.edges.some((edge) =>
      direction === 'input' ? edge.targetHandle === handleId : edge.sourceHandle === handleId
    );
    const publishedAs = entries.find((entry) =>
      entry.bindings.some(
        (binding) => binding.nodeId === candidate.nodeId && binding.portId === candidate.port.id
      )
    )?.id;
    return publishedAs === undefined
      ? { ...candidate, connected }
      : { ...candidate, connected, publishedAs };
  });

  return [
    ...ranked.filter(isFreeBindablePort),
    ...ranked.filter((candidate) => !isFreeBindablePort(candidate))
  ];
}

/**
 * A complete new entry for a port the author just picked: bound to it, with
 * every field `pullEntryFieldsFromPort` can derive, and an `id` seeded from
 * the port's own id — made unique against `existingIds` with a numeric
 * suffix (`text`, `text_2`, `text_3`, …).
 *
 * Seeding the id from the port is a convenience at creation time only: the
 * author edits it like any other field afterwards, and nothing later
 * re-derives it. DN1's concern — a contract silently keyed on internal port
 * names — is about that ongoing coupling, which this does not introduce.
 */
export function entryFromBindablePort(
  candidate: BindablePort,
  existingIds: Iterable<string>
): WorkflowInterfaceEntry {
  const taken = new Set(existingIds);
  let id = candidate.port.id;
  for (let n = 2; taken.has(id); n += 1) {
    id = `${candidate.port.id}_${n}`;
  }
  return {
    id,
    dataType: candidate.port.dataType,
    bindings: [{ nodeId: candidate.nodeId, portId: candidate.port.id }],
    ...pullEntryFieldsFromPort(candidate.port)
  };
}

// ---------------------------------------------------------------------------
// Chat turn ports — deprecated since 2.11.0, removed in 3.0 with interface
// `turn`. The chat binding lives in the Playground settings
// (`utils/playgroundChat.ts`); these stay only so a stored `turn` still reads.
// ---------------------------------------------------------------------------

/** The turn values an entry of this direction may carry, in selector order. */
export function turnsFor(direction: 'input' | 'output'): readonly WorkflowInterfaceTurn[] {
  return direction === 'input' ? WORKFLOW_INTERFACE_INPUT_TURNS : WORKFLOW_INTERFACE_OUTPUT_TURNS;
}

/** Whether a value is in this library's turn vocabulary (either direction). */
export function isKnownTurn(value: string): value is WorkflowInterfaceTurn {
  return (
    (WORKFLOW_INTERFACE_INPUT_TURNS as readonly string[]).includes(value) ||
    (WORKFLOW_INTERFACE_OUTPUT_TURNS as readonly string[]).includes(value)
  );
}

/**
 * The id of the first OTHER input entry already carrying `entry`'s turn
 * value, or `undefined`. Every input turn is at most one per workflow; the
 * first entry in list order keeps the value, later ones are reported. Only
 * meaningful for inputs — `reply` on outputs is unbounded.
 */
export function turnTakenBy(
  inputs: readonly WorkflowInterfaceEntry[],
  entry: WorkflowInterfaceEntry
): string | undefined {
  if (entry.turn === undefined) return undefined;
  const index = inputs.indexOf(entry);
  const first = inputs.findIndex((other) => other.turn === entry.turn);
  if (first === -1 || first === index || index === -1) return undefined;
  return inputs[first].id;
}

/**
 * The patch that sets (or with `''` clears) an entry's turn. Never writes a
 * `turn` key for "none" (the key is set to `undefined`, which the editor's
 * commit drops), and drops `meta.limit` when the entry stops being `history`
 * — leaving every other `meta` key, and `meta` itself when others remain,
 * untouched.
 */
export function turnPatch(
  entry: WorkflowInterfaceEntry,
  next: WorkflowInterfaceEntry['turn'] | ''
): Partial<WorkflowInterfaceEntry> {
  const patch: Partial<WorkflowInterfaceEntry> = { turn: next === '' ? undefined : next };
  if (next !== 'history' && entry.meta && 'limit' in entry.meta) {
    patch.meta = metaWithLimit(entry.meta, undefined);
  }
  return patch;
}

/**
 * The patch that sets a `history` entry's `meta.limit` from a raw field
 * value. Empty, non-numeric or non-positive input removes the key, so the
 * server's default applies; other `meta` keys are kept.
 */
export function historyLimitPatch(
  entry: WorkflowInterfaceEntry,
  raw: string
): Partial<WorkflowInterfaceEntry> {
  const parsed = Number(raw);
  const limit = raw.trim() !== '' && Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  return { meta: metaWithLimit(entry.meta, limit) };
}

/** The `meta.limit` a history entry states, when it is a positive integer. */
export function historyLimitOf(entry: WorkflowInterfaceEntry): number | undefined {
  const limit = entry.meta?.limit;
  return typeof limit === 'number' && Number.isInteger(limit) && limit > 0 ? limit : undefined;
}

function metaWithLimit(
  meta: Record<string, unknown> | undefined,
  limit: number | undefined
): Record<string, unknown> | undefined {
  const next: Record<string, unknown> = { ...(meta ?? {}) };
  if (limit === undefined) delete next.limit;
  else next.limit = limit;
  return Object.keys(next).length > 0 ? next : undefined;
}

// ---------------------------------------------------------------------------
// Playground input mode
// ---------------------------------------------------------------------------

/**
 * How the Playground collects a turn, read from the workflow's chat binding.
 *
 * - `chat`: an input is bound to the message. The chat box sends `content`;
 *   any other unbound inputs render as a form beside it.
 * - `form`: no message input is bound, and the interface has unbound inputs.
 *   A form and a Run button; the turn sends `inputs` only (the server refuses
 *   `content` for such a workflow).
 * - `run`: no message input and no unbound input. Just a Run button.
 * - `legacy`: only for a server before FlowDrop 2.7.0 (the workflow carries
 *   no `playground` key) whose interface declares no `turn` either. That
 *   server guesses the chat input from the nodes, so the Playground keeps its
 *   old behaviour too.
 *
 * The binding is the workflow's Playground settings, else the deprecated
 * interface `turn` (see `resolvePlaygroundChat`). A workflow with neither has
 * no chat until somebody sets it up: `form` or `run`, never `legacy`.
 */
export type PlaygroundInputMode = 'chat' | 'form' | 'run' | 'legacy';

/**
 * Whether any entry of the interface, on either side, declares a `turn`.
 *
 * @deprecated since 2.11.0, removed in 3.0 with interface `turn`.
 */
export function declaresTurnPorts(workflowInterface: WorkflowInterface | undefined): boolean {
  const entries = [...(workflowInterface?.inputs ?? []), ...(workflowInterface?.outputs ?? [])];
  return entries.some((entry) => Boolean(entry.turn));
}

/**
 * The input entries a person fills in: every input the chat binding does not
 * fill. With `playground` (a server from FlowDrop 2.7.0 on) those are the
 * inputs its binding names (and, while the binding comes from `turn` marks,
 * every input carrying one); without it, the inputs carrying a `turn`
 * (`message`, `history`, `session_id`, `message_id`, and any value a newer
 * server adds). The session fills those, never the form.
 */
export function interfaceFormEntries(
  workflowInterface: WorkflowInterface | undefined,
  playground?: WorkflowPlayground
): WorkflowInterfaceEntry[] {
  return interfaceFormEntriesFor(
    workflowInterface,
    resolvePlaygroundChat({ interface: workflowInterface, playground })
  );
}

/**
 * {@link interfaceFormEntries} for a binding already resolved with
 * `resolvePlaygroundChat` (`null` = the workflow carries no `playground`).
 */
export function interfaceFormEntriesFor(
  workflowInterface: WorkflowInterface | undefined,
  resolved: ResolvedPlaygroundChat | null
): WorkflowInterfaceEntry[] {
  const inputs = workflowInterface?.inputs ?? [];
  if (resolved === null) return inputs.filter((entry) => !entry.turn);
  const bound = playgroundBoundInputs(resolved.binding);
  // While the chat comes from `turn` marks, an input marked with a value this
  // library does not know (a newer server's) is the session's too.
  const turnFilled = resolved.source === 'interface_turn';
  return inputs.filter((entry) => !bound.has(entry.id) && !(turnFilled && entry.turn));
}

/**
 * Resolve the Playground's input mode from a workflow's interface and, from
 * FlowDrop 2.7.0 on, its Playground settings (`workflow.playground`).
 */
export function resolvePlaygroundInputMode(
  workflowInterface: WorkflowInterface | undefined,
  playground?: WorkflowPlayground
): PlaygroundInputMode {
  return playgroundInputModeFor(
    workflowInterface,
    resolvePlaygroundChat({ interface: workflowInterface, playground })
  );
}

/**
 * {@link resolvePlaygroundInputMode} for a binding already resolved with
 * `resolvePlaygroundChat` (`null` = the workflow carries no `playground`).
 */
export function playgroundInputModeFor(
  workflowInterface: WorkflowInterface | undefined,
  resolved: ResolvedPlaygroundChat | null
): PlaygroundInputMode {
  if (resolved === null) {
    if (!declaresTurnPorts(workflowInterface)) return 'legacy';
    if ((workflowInterface?.inputs ?? []).some((entry) => entry.turn === 'message')) return 'chat';
  } else if (resolved.binding.message !== null) {
    return 'chat';
  }
  return interfaceFormEntriesFor(workflowInterface, resolved).length > 0 ? 'form' : 'run';
}

/** Which part of a chat binding names an interface input. */
export type PlaygroundChatInputKey = 'message' | 'history' | 'session_id' | 'message_id';

/** Something wrong, or worth knowing, about a workflow's chat binding. */
export interface PlaygroundChatIssue {
  severity: 'error' | 'warning';
  code:
    | 'playground-input-missing'
    | 'playground-input-duplicate'
    | 'playground-reply-node-missing'
    | 'playground-reply-port-missing'
    | 'playground-half-set';
  /**
   * The issue in English, for logs and agents. A UI formats its own text
   * from `code` and the fields below (see `playgroundSettings.issues`).
   */
  message: string;
  /** The binding key an input issue is about. */
  key?: PlaygroundChatInputKey;
  /** The input an input issue names. */
  input?: string;
  /** `playground-input-duplicate`: the key that has the input already. */
  otherKey?: PlaygroundChatInputKey;
  /** The reply a reply issue is about. */
  reply?: PlaygroundReplyPort;
}

/**
 * What is wrong with a chat binding against the workflow as it is now.
 *
 * Errors mirror the server's checks (an input the interface no longer has,
 * an input bound twice, a reply on a node or port that is gone), so the
 * editor shows what the save would refuse. A reply's port is judged against
 * the node's static and dynamic outputs; a node without metadata is not
 * judged. The one warning is a half-set binding (a message input but no
 * reply). Defaults to the workflow's stored binding. The binding is
 * normalised first, so one from the wire that leaves out its nullable keys
 * (the schema requires only `replies`) reads as unbound there, not as bound
 * to an input that is missing.
 */
export function playgroundChatIssues(
  workflow: Workflow,
  binding: PlaygroundChatBinding | null = workflow.playground?.chat ?? null
): PlaygroundChatIssue[] {
  if (!binding) return [];
  const chat = normalizePlaygroundChat(binding);
  const issues: PlaygroundChatIssue[] = [];
  const inputIds = new Set((workflow.interface?.inputs ?? []).map((entry) => entry.id));
  const named: Array<[PlaygroundChatInputKey, string | null]> = [
    ['message', chat.message],
    ['history', chat.history?.input ?? null],
    ['session_id', chat.session_id],
    ['message_id', chat.message_id]
  ];
  const used = new Map<string, PlaygroundChatInputKey>();
  for (const [key, id] of named) {
    if (id === null) continue;
    if (!inputIds.has(id)) {
      issues.push({
        severity: 'error',
        code: 'playground-input-missing',
        key,
        input: id,
        message: `"${key}" is bound to the input "${id}", which is not on the workflow interface.`
      });
      continue;
    }
    const other = used.get(id);
    if (other !== undefined) {
      issues.push({
        severity: 'error',
        code: 'playground-input-duplicate',
        key,
        input: id,
        otherKey: other,
        message: `Input "${id}" is bound twice ("${other}" and "${key}").`
      });
      continue;
    }
    used.set(id, key);
  }

  const nodes = new Map(workflow.nodes.map((node) => [node.id, node]));
  for (const reply of chat.replies) {
    const node = nodes.get(reply.node_id);
    if (!node) {
      issues.push({
        severity: 'error',
        code: 'playground-reply-node-missing',
        reply,
        message: `A reply prints port "${reply.port}" of node "${reply.node_id}", which is not in the workflow.`
      });
      continue;
    }
    const ports = nodeOutputPortIds(node);
    if (ports !== null && !ports.has(reply.port)) {
      issues.push({
        severity: 'error',
        code: 'playground-reply-port-missing',
        reply,
        message: `A reply prints port "${reply.port}" of node "${node.data?.label ?? node.id}", which has no such output.`
      });
    }
  }

  if (isPlaygroundChatHalfSet(chat)) {
    issues.push({
      severity: 'warning',
      code: 'playground-half-set',
      key: 'message',
      message: 'A message input is bound but no reply is, so nothing answers in the chat.'
    });
  }
  return issues;
}

/** A node's output ports (static and dynamic), or `null` without metadata. */
function nodeOutputPorts(node: WorkflowNode): NodePort[] | null {
  const metadata = node.data?.metadata;
  if (!metadata) return null;
  const dynamic = (node.data?.config?.dynamicOutputs as DynamicPort[] | undefined) ?? [];
  return [
    ...(metadata.outputs ?? []),
    ...dynamic.map((port) => dynamicPortToNodePort(port, 'output'))
  ];
}

/** A node's output port ids, or `null` without metadata. */
function nodeOutputPortIds(node: WorkflowNode): Set<string> | null {
  const ports = nodeOutputPorts(node);
  return ports && new Set(ports.map((port) => port.id));
}

/**
 * The node output port a reply names, with the node's label: any output the
 * node has, exposed on the canvas or not (the same ports
 * `playgroundChatIssues` accepts). `null` when the node or port is gone, or
 * the node carries no metadata to tell.
 */
export function findReplyPort(
  workflow: Workflow,
  reply: PlaygroundReplyPort
): { nodeLabel: string; port: NodePort } | null {
  const node = workflow.nodes.find((candidate) => candidate.id === reply.node_id);
  const port = node && nodeOutputPorts(node)?.find((candidate) => candidate.id === reply.port);
  return node && port ? { nodeLabel: nodeCanvasLabel(node), port } : null;
}

/** JSON Schema `type` for an interface entry's lane, when its schema states none. */
function formFieldType(dataType: string): ConfigProperty['type'] {
  const lane = dataType.toLowerCase();
  if (lane === 'number' || lane === 'float') return 'number';
  if (lane === 'integer') return 'integer';
  if (lane === 'boolean') return 'boolean';
  if (lane === 'array' || lane === 'messages' || lane.endsWith('[]')) return 'array';
  if (lane === 'json' || lane === 'object') return 'object';
  return 'string';
}

const FORM_FIELD_TYPES: readonly string[] = [
  'string',
  'number',
  'boolean',
  'array',
  'object',
  'integer'
];

/** The field type an entry renders as: its schema's own type, else its lane's. */
function formEntryType(entry: WorkflowInterfaceEntry): ConfigProperty['type'] {
  const fragmentType = (entry.schema as Record<string, unknown> | undefined)?.type;
  return typeof fragmentType === 'string' && FORM_FIELD_TYPES.includes(fragmentType)
    ? (fragmentType as ConfigProperty['type'])
    : formFieldType(entry.dataType);
}

/**
 * An array or object entry's value as the server wants it. A form may hold
 * one as typed text (`[2, 3]`, a field with no item schema renders as a text
 * box): text that parses to the entry's shape is sent parsed. `undefined`
 * when it does not parse to that shape; any other value is sent as is.
 */
function structuredFormValue(entry: WorkflowInterfaceEntry, value: unknown): unknown {
  const type = formEntryType(entry);
  if ((type !== 'array' && type !== 'object') || typeof value !== 'string') return value;
  try {
    const parsed: unknown = JSON.parse(value);
    const isArray = Array.isArray(parsed);
    const fits =
      type === 'array' ? isArray : parsed !== null && typeof parsed === 'object' && !isArray;
    return fits ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The object schema a form renders for the given entries: one property per
 * entry, keyed by its `id` (the name the server matches inputs on). The
 * entry's own schema fragment wins over what the entry states one level up;
 * the type falls back to the entry's `dataType` lane.
 */
export function interfaceFormSchema(entries: readonly WorkflowInterfaceEntry[]): ConfigSchema {
  const properties: Record<string, ConfigProperty> = {};
  const required: string[] = [];
  for (const entry of entries) {
    const fragment = (entry.schema ?? {}) as Record<string, unknown>;
    const type = formEntryType(entry);
    const property: ConfigProperty = { ...fragment, type, title: entry.name ?? entry.id };
    if (entry.description !== undefined) property.description = entry.description;
    if (entry.defaultValue !== undefined) property.default = entry.defaultValue;
    properties[entry.id] = property;
    if (entry.required) required.push(entry.id);
  }
  return required.length > 0
    ? { type: 'object', properties, required }
    : { type: 'object', properties };
}

/**
 * The inputs a form turn sends: the values of the given entries, without
 * blank optional values (an empty string or `undefined` is "not given", so
 * the server's default applies). Keys outside the entries are dropped. An
 * array or object entry typed as JSON text is sent parsed; text that is not
 * JSON of that shape is left out (see {@link collectInterfaceInputs}).
 */
export function interfaceFormInputs(
  entries: readonly WorkflowInterfaceEntry[],
  values: Record<string, unknown>
): Record<string, unknown> {
  const inputs: Record<string, unknown> = {};
  for (const entry of entries) {
    const value = values[entry.id];
    if (value === undefined || value === '') continue;
    const sent = structuredFormValue(entry, value);
    if (sent !== undefined) inputs[entry.id] = sent;
  }
  return inputs;
}

/**
 * What {@link collectInterfaceInputs} found. On failure, `missing` lists the
 * blank required entries and `invalid` the array or object entries whose
 * text is not JSON of their shape; either may be empty, not both.
 */
export type InterfaceInputsResult =
  | { ok: true; inputs: Record<string, unknown> }
  | { ok: false; missing: WorkflowInterfaceEntry[]; invalid: WorkflowInterfaceEntry[] };

/**
 * The inputs a form turn would send, or the entries that stop it. An entry is
 * missing when it is required, has no default for the server to fall back on,
 * and has no value (see {@link interfaceFormInputs} for what counts as
 * blank); it is invalid when it is an array or object entry holding text that
 * does not parse to that shape. Both are data, not an exception, so a Run
 * control can point at the field instead of failing.
 */
export function collectInterfaceInputs(
  entries: readonly WorkflowInterfaceEntry[],
  values: Record<string, unknown>
): InterfaceInputsResult {
  const inputs = interfaceFormInputs(entries, values);
  const invalid = entries.filter((entry) => {
    const value = values[entry.id];
    return value !== undefined && value !== '' && structuredFormValue(entry, value) === undefined;
  });
  const missing = entries.filter(
    (entry) =>
      entry.required &&
      entry.defaultValue === undefined &&
      !(entry.id in inputs) &&
      !invalid.includes(entry)
  );
  return missing.length > 0 || invalid.length > 0
    ? { ok: false, missing, invalid }
    : { ok: true, inputs };
}
