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

import type {
  DynamicPort,
  NodePort,
  PortBinding,
  PortsConfig,
  Workflow,
  WorkflowInterface,
  WorkflowInterfaceEntry,
  WorkflowNode
} from '$lib/types/index.js';
import { dynamicPortToNodePort } from '$lib/types/index.js';
import { isPortExposed } from '$lib/utils/portUtils.js';
import { LOOPBACK_PORT_NAME } from '$lib/utils/connections.js';
import { PORTS_CONFIG_KEY } from '$lib/utils/nodeFormSchema.js';
import { buildHandleId } from '$lib/utils/handleIds.js';
import type { PortMapping } from '$lib/utils/nodeSwap.js';

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
      if (isPortExposed(port, entries)) {
        result.push({ nodeId: node.id, nodeLabel: node.data?.label ?? node.id, port });
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
