/**
 * Interface commands: read and edit `workflow.interface` (the public contract)
 * from the command DSL. Every handler is a thin parser over the pure helpers
 * the editor UI calls (`utils/interfaceTags`, `utils/workflowInterface`), and
 * every write goes through `dispatch.editInterface`, so each is one undo step
 * and the Playground chat binding follows a renamed or removed input. An edit
 * that changes nothing writes nothing and makes no undo step.
 *
 * @module commands/interfaceCommands
 */

import type { Workflow, WorkflowInterfaceEntry, WorkflowNode } from '../types/index.js';
import { DEFAULT_PORT_CONFIG } from '../config/defaultPortConfig.js';
import {
  type InterfaceIdError,
  addInterfaceEntry,
  entryAtPort,
  exposableCandidate,
  exposePortAsEntry,
  inputHasIncomingEdge,
  moveInterfaceEntry,
  patchInterfaceEntry,
  removeInterfaceEntry,
  renameInterfaceEntry,
  seedInterfaceId,
  validateInterfaceId,
  type InterfaceEditResult
} from '../utils/interfaceTags.js';
import {
  historyLimitOf,
  listBindablePorts,
  pullEntryFieldsFromPort,
  resolveInterface
} from '../utils/workflowInterface.js';
import { nodePortsFor } from '../utils/portExposure.js';
import { followInterfaceInputEdit, withoutInterfaceTurns } from '../utils/playgroundChat.js';
import {
  configurablePortNotFound,
  fail,
  listCapped,
  noWorkflow,
  nodeNotFoundMessage,
  parseConfigValue,
  resolveNode,
  toShortId
} from './helpers.js';
import type {
  Command,
  CommandContext,
  CommandResult,
  InterfaceEntryDescription,
  InterfaceField,
  InterfaceListResultData,
  InterfaceSide
} from './types.js';

const KNOWN_DATA_TYPES: ReadonlySet<string> = new Set(
  DEFAULT_PORT_CONFIG.dataTypes.map((type) => type.id)
);

/** A warning for a data type this library does not know (kept: the wire format is an open string). */
function dataTypeWarning(dataType: string): string | undefined {
  return dataType !== '' && !KNOWN_DATA_TYPES.has(dataType)
    ? `Warning: '${dataType}' is not a built-in data type; it was kept as typed.`
    : undefined;
}

function entriesOf(workflow: Workflow, direction: InterfaceSide): WorkflowInterfaceEntry[] {
  return (direction === 'input' ? workflow.interface?.inputs : workflow.interface?.outputs) ?? [];
}

function entryNotFound(workflow: Workflow, direction: InterfaceSide, id: string) {
  const ids = entriesOf(workflow, direction).map((entry) => entry.id);
  return fail(
    'INVALID_ARGUMENT',
    `Interface ${direction} '${id}' not found. The ${direction}s: ${listCapped(ids)}.`
  );
}

function idError(
  reason: InterfaceIdError,
  direction: InterfaceSide,
  id: string,
  suggestAs: boolean
) {
  switch (reason) {
    case 'empty':
      return fail('INVALID_ARGUMENT', 'The interface id must not be empty.');
    case 'format':
      return fail(
        'INVALID_ARGUMENT',
        `The interface id '${id.trim()}' is not allowed: it becomes the workflow's exposure name, which may use only lowercase letters, digits, - and _ (spec R4.a). Pass another one with \`as <id>\`.`
      );
    case 'reserved':
      return fail(
        'INVALID_ARGUMENT',
        `The interface id '${id.trim()}' is reserved by the runtime (spec R4.e). Choose another one.`
      );
    case 'duplicate':
      return fail(
        'INVALID_ARGUMENT',
        `The ${direction} id '${id.trim()}' is already taken.` +
          (suggestAs ? ' Pass another one with `as <id>`.' : '')
      );
  }
}

/** Whether an edit leaves the interface (both sides) and the chat binding as they are. */
function changesNothing(workflow: Workflow, result: InterfaceEditResult): boolean {
  const same = (a: unknown[] | undefined, b: unknown[] | undefined) =>
    JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
  return (
    result.edit === undefined &&
    same(result.interface.inputs, workflow.interface?.inputs) &&
    same(result.interface.outputs, workflow.interface?.outputs)
  );
}

/**
 * Write an interface edit as one undo step (the chat binding follows an id
 * edit). An edit that changes nothing is not written: `false`, and the caller
 * says so.
 */
function commit(context: CommandContext, workflow: Workflow, result: InterfaceEditResult): boolean {
  if (changesNothing(workflow, result)) return false;
  const { dispatch } = context;
  if (dispatch.editInterface) {
    dispatch.editInterface(result.interface, result.edit);
    return true;
  }
  // A dispatch without editInterface: the same write the store's editInterface
  // makes, so the chat binding still follows a renamed or removed input.
  const playground = workflow.playground;
  const followed = result.edit ? followInterfaceInputEdit(playground, result.edit) : playground;
  const cleared = followed !== playground && followed?.chat === null;
  dispatch.batchUpdate({
    interface: cleared ? withoutInterfaceTurns(result.interface) : result.interface,
    ...(followed !== playground && { playground: followed })
  });
  return true;
}

function describeEntry(
  entry: WorkflowInterfaceEntry,
  status: InterfaceEntryDescription['status'],
  nodes: WorkflowNode[]
): InterfaceEntryDescription {
  const out: InterfaceEntryDescription = {
    id: entry.id,
    dataType: entry.dataType,
    bindings: entry.bindings.map((binding) => {
      const node = nodes.find((candidate) => candidate.id === binding.nodeId);
      return { nodeId: toShortId(node?.id ?? binding.nodeId), port: binding.portId };
    }),
    status
  };
  if (entry.name !== undefined) out.name = entry.name;
  if (entry.description !== undefined) out.description = entry.description;
  if (entry.required !== undefined) out.required = entry.required;
  if (entry.defaultValue !== undefined) out.defaultValue = entry.defaultValue;
  if (entry.examples !== undefined) out.examples = entry.examples;
  if (entry.turn !== undefined) out.turn = entry.turn;
  const limit = historyLimitOf(entry);
  if (limit !== undefined) out.limit = limit;
  return out;
}

function line(entry: InterfaceEntryDescription): string {
  const bound = entry.bindings.map((b) => `${b.nodeId}:${b.port}`).join(', ') || 'unbound';
  const flags = [
    entry.required ? 'required' : '',
    entry.turn ? `turn ${entry.turn}` : '',
    entry.status !== 'ok' && entry.status !== 'unbound' ? entry.status : ''
  ].filter(Boolean);
  return `  ${entry.id} (${entry.dataType || 'no type'}) -> ${bound}${flags.length ? ` [${flags.join(', ')}]` : ''}`;
}

export function executeInterfaceList(context: CommandContext): CommandResult {
  const workflow = context.getWorkflow();
  if (!workflow) return noWorkflow();
  const resolved = resolveInterface(workflow);
  const side = (direction: InterfaceSide): InterfaceEntryDescription[] =>
    entriesOf(workflow, direction).map((entry) => {
      const status =
        resolved.find((r) => r.direction === direction && r.entry === entry)?.status ?? 'unbound';
      return describeEntry(entry, status, workflow.nodes);
    });
  const data: InterfaceListResultData = { inputs: side('input'), outputs: side('output') };
  const block = (title: string, rows: InterfaceEntryDescription[]) =>
    `${title}:${rows.length === 0 ? ' none' : '\n' + rows.map(line).join('\n')}`;
  return {
    ok: true,
    message: `${block('Inputs', data.inputs)}\n${block('Outputs', data.outputs)}`,
    data
  };
}

export function executeInterfaceExpose(
  command: Extract<Command, { type: 'interface_expose' }>,
  context: CommandContext
): CommandResult {
  const workflow = context.getWorkflow();
  if (!workflow) return noWorkflow();
  const node = resolveNode(command.nodeId, workflow.nodes);
  if (!node) {
    return fail('NODE_NOT_FOUND', nodeNotFoundMessage(command.nodeId, workflow.nodes));
  }

  const sides = (['input', 'output'] as const).filter(
    (side) =>
      (!command.side || command.side === side) &&
      nodePortsFor(node, side === 'input' ? 'inputs' : 'outputs').some(
        (port) => port.id === command.port
      )
  );
  if (sides.length === 0) {
    return configurablePortNotFound(node, command.port, command.side ?? 'output');
  }
  if (sides.length > 1) {
    return fail(
      'INVALID_ARGUMENT',
      `Port '${command.port}' exists on both sides of ${toShortId(node.id)}. Say which: \`interface expose input ${command.nodeId}:${command.port}\` or \`interface expose output ...\`.`
    );
  }
  const direction = sides[0];

  const existing = entryAtPort(workflow, node.id, direction, command.port);
  if (existing) {
    return fail(
      'INVALID_ARGUMENT',
      `${toShortId(node.id)}:${command.port} is already published as ${direction} '${existing.id}'.`
    );
  }
  if (direction === 'input' && inputHasIncomingEdge(workflow, node.id, command.port)) {
    return fail(
      'INVALID_ARGUMENT',
      `Input ${toShortId(node.id)}:${command.port} already has an incoming edge; publishing it would feed it twice. Disconnect it first.`
    );
  }
  if (!exposableCandidate(workflow, node.id, direction, command.port)) {
    return fail(
      'INVALID_ARGUMENT',
      `${toShortId(node.id)}:${command.port} cannot be published: it is hidden on the canvas or it is control flow (trigger, loop-back, tool output).`
    );
  }

  // The default id is the one the canvas offers: the port id folded to the id
  // alphabet (`userQuery` -> `user_query`), suffixed (`_2`, ...) while it is taken.
  const taken =
    (direction === 'input' ? workflow.interface?.inputs : workflow.interface?.outputs) ?? [];
  const id = (
    command.id ??
    seedInterfaceId(
      command.port,
      direction,
      taken.map((e) => e.id)
    )
  ).trim();
  const reason = validateInterfaceId(id, direction, workflow.interface);
  if (reason) return idError(reason, direction, id, command.id === undefined);

  const result = exposePortAsEntry(
    workflow,
    { nodeId: node.id, direction, portId: command.port },
    id
  );
  if (!result)
    return fail('INVALID_ARGUMENT', `Could not publish ${command.nodeId}:${command.port}.`);
  commit(context, workflow, result);
  return {
    ok: true,
    message: `Published ${toShortId(node.id)}:${command.port} as ${direction} '${id}'`
  };
}

export function executeInterfaceAdd(
  command: Extract<Command, { type: 'interface_add' }>,
  context: CommandContext
): CommandResult {
  const workflow = context.getWorkflow();
  if (!workflow) return noWorkflow();
  const id = command.id.trim();
  const reason = validateInterfaceId(id, command.side, workflow.interface);
  if (reason) return idError(reason, command.side, id, false);
  const dataType = command.dataType ?? '';
  const result = addInterfaceEntry(workflow, command.side, { id, dataType, bindings: [] });
  if (!result) return fail('INVALID_ARGUMENT', `Could not add ${command.side} '${id}'.`);
  commit(context, workflow, result);
  const notes = [
    'It is unbound: bind it to a port with `interface bind`.',
    dataTypeWarning(dataType)
  ].filter(Boolean);
  return {
    ok: true,
    message: `Added ${command.side} '${id}'${dataType ? ` (${dataType})` : ''}. ${notes.join(' ')}`
  };
}

export function executeInterfaceRemove(
  command: Extract<Command, { type: 'interface_remove' }>,
  context: CommandContext
): CommandResult {
  const workflow = context.getWorkflow();
  if (!workflow) return noWorkflow();
  const result = removeInterfaceEntry(workflow, command.side, command.id);
  if (!result) return entryNotFound(workflow, command.side, command.id);
  commit(context, workflow, result);
  return { ok: true, message: `Removed ${command.side} '${command.id}'` };
}

export function executeInterfaceRename(
  command: Extract<Command, { type: 'interface_rename' }>,
  context: CommandContext
): CommandResult {
  const workflow = context.getWorkflow();
  if (!workflow) return noWorkflow();
  if (!entriesOf(workflow, command.side).some((entry) => entry.id === command.id)) {
    return entryNotFound(workflow, command.side, command.id);
  }
  const reason = validateInterfaceId(command.newId, command.side, workflow.interface, command.id);
  if (reason) return idError(reason, command.side, command.newId, false);
  // The id is known and checked, so the helper cannot refuse.
  const result = renameInterfaceEntry(
    workflow,
    command.side,
    command.id,
    command.newId
  ) as InterfaceEditResult;
  const to = command.newId.trim();
  if (!commit(context, workflow, result)) {
    return { ok: true, message: `${command.side} '${command.id}' already has that id` };
  }
  return { ok: true, message: `Renamed ${command.side} '${command.id}' to '${to}'` };
}

export function executeInterfaceBind(
  command: Extract<Command, { type: 'interface_bind' }>,
  context: CommandContext
): CommandResult {
  const workflow = context.getWorkflow();
  if (!workflow) return noWorkflow();
  const entry = entriesOf(workflow, command.side).find((e) => e.id === command.id);
  if (!entry) return entryNotFound(workflow, command.side, command.id);

  if (command.target === null) {
    const result = patchInterfaceEntry(workflow, command.side, command.id, {
      bindings: []
    }) as InterfaceEditResult;
    return commit(context, workflow, result)
      ? { ok: true, message: `Unbound ${command.side} '${command.id}'` }
      : { ok: true, message: `${command.side} '${command.id}' is already unbound` };
  }

  const node = resolveNode(command.target.nodeId, workflow.nodes);
  if (!node) {
    return fail('NODE_NOT_FOUND', nodeNotFoundMessage(command.target.nodeId, workflow.nodes));
  }
  const portId = command.target.port;
  const candidate = listBindablePorts(workflow, command.side).find(
    (c) => c.nodeId === node.id && c.port.id === portId
  );
  if (!candidate) {
    const onNode = nodePortsFor(node, command.side === 'input' ? 'inputs' : 'outputs').some(
      (port) => port.id === portId
    );
    return onNode
      ? fail(
          'INVALID_ARGUMENT',
          `${toShortId(node.id)}:${portId} cannot be bound: it is hidden on the canvas or it is control flow (trigger, loop-back, tool output).`
        )
      : configurablePortNotFound(node, portId, command.side);
  }

  const patch: Partial<WorkflowInterfaceEntry> = {
    bindings: [{ nodeId: node.id, portId }]
  };
  // As the entry card does: an empty data type takes the port's own.
  if (!entry.dataType) patch.dataType = candidate.port.dataType;
  const result = patchInterfaceEntry(
    workflow,
    command.side,
    command.id,
    patch
  ) as InterfaceEditResult;

  const warnings: string[] = [];
  const declared = patch.dataType ?? entry.dataType;
  if (declared && declared !== candidate.port.dataType) {
    warnings.push(
      `Warning: '${command.id}' is declared ${declared} but ${toShortId(node.id)}:${portId} carries ${candidate.port.dataType}.`
    );
  }
  if (command.side === 'input' && inputHasIncomingEdge(workflow, node.id, portId)) {
    warnings.push(
      `Warning: ${toShortId(node.id)}:${portId} already has an incoming edge, so a caller's value would compete with it.`
    );
  }
  const changed = commit(context, workflow, result);
  return {
    ok: true,
    message: [
      changed
        ? `Bound ${command.side} '${command.id}' to ${toShortId(node.id)}:${portId}`
        : `${command.side} '${command.id}' is already bound to ${toShortId(node.id)}:${portId}`,
      ...warnings
    ].join('. ')
  };
}

const FIELD_NAMES: readonly InterfaceField[] = [
  'name',
  'description',
  'dataType',
  'required',
  'default',
  'examples'
];

/** A free-text value: a quoted or bare string; a number or boolean token stays its text. */
function textOf(raw: string): string {
  const parsed = parseConfigValue(raw);
  return typeof parsed === 'string' ? parsed : raw;
}

/** The token that clears an optional field: `none`, or an empty string (`""`). */
function isClearToken(raw: string): boolean {
  return /^none$/i.test(raw) || raw === '""' || raw === "''";
}

export function executeInterfaceSet(
  command: Extract<Command, { type: 'interface_set' }>,
  context: CommandContext
): CommandResult {
  const workflow = context.getWorkflow();
  if (!workflow) return noWorkflow();
  const { side, id, field } = command;
  const entry = entriesOf(workflow, side).find((e) => e.id === id);
  if (!entry) return entryNotFound(workflow, side, id);

  const bad = (error: string) => fail('INVALID_ARGUMENT', error);
  const raw = command.value.trim();
  // A missing value must never erase one: clearing is always said out loud.
  if (raw === '') {
    return bad(
      `\`${field}\` needs a value. To clear an optional field, say \`none\` (or pass an empty string, \`""\`).`
    );
  }
  const clearing = isClearToken(raw);
  const parsed = clearing ? undefined : parseConfigValue(raw);
  const notes: string[] = [];
  let patch: Partial<WorkflowInterfaceEntry>;

  switch (field) {
    case 'name':
      patch = { name: clearing ? undefined : textOf(raw) };
      break;
    case 'description':
      patch = { description: clearing ? undefined : textOf(raw) };
      break;
    case 'dataType': {
      if (clearing) return bad('The data type cannot be cleared; set another one.');
      const dataType = textOf(raw);
      patch = { dataType };
      const warning = dataTypeWarning(dataType);
      if (warning) notes.push(warning);
      break;
    }
    case 'required':
      if (side === 'output') return bad('`required` is for inputs only.');
      if (!clearing && typeof parsed !== 'boolean') return bad('`required` takes true or false.');
      patch = { required: parsed === true ? true : undefined };
      break;
    case 'default':
      patch = { defaultValue: parsed };
      break;
    case 'examples':
      if (side === 'output') return bad('`examples` are for inputs only.');
      if (!clearing && !Array.isArray(parsed)) {
        return bad('`examples` takes a JSON list, e.g. ["a", "b"].');
      }
      patch = { examples: Array.isArray(parsed) && parsed.length > 0 ? parsed : undefined };
      break;
    default:
      return bad(`Unknown field '${String(field)}'. Fields: ${FIELD_NAMES.join(', ')}.`);
  }

  const result = patchInterfaceEntry(workflow, side, id, patch) as InterfaceEditResult;
  const shown = clearing ? 'cleared' : `set to ${raw}`;
  if (!commit(context, workflow, result)) {
    return {
      ok: true,
      message: `${side} '${id}': ${field} is already ${shown === 'cleared' ? 'unset' : raw}`
    };
  }
  return {
    ok: true,
    message: [`${side} '${id}': ${field} ${shown}`, ...notes].join('. ')
  };
}

export function executeInterfacePull(
  command: Extract<Command, { type: 'interface_pull' }>,
  context: CommandContext
): CommandResult {
  const workflow = context.getWorkflow();
  if (!workflow) return noWorkflow();
  const entry = entriesOf(workflow, command.side).find((e) => e.id === command.id);
  if (!entry) return entryNotFound(workflow, command.side, command.id);
  const target = resolveInterface(workflow).find(
    (r) => r.direction === command.side && r.entry === entry
  )?.targets[0];
  if (!target) {
    return fail(
      'INVALID_ARGUMENT',
      `${command.side} '${command.id}' is not bound to a live port, so there is nothing to pull. Use \`interface bind\` first.`
    );
  }
  const result = patchInterfaceEntry(
    workflow,
    command.side,
    command.id,
    pullEntryFieldsFromPort(target.port)
  ) as InterfaceEditResult;
  const where = `${toShortId(target.node.id)}:${target.port.id}`;
  if (!commit(context, workflow, result)) {
    return {
      ok: true,
      message: `${command.side} '${command.id}' already matches ${where}`
    };
  }
  return {
    ok: true,
    message: `Pulled name, type and defaults of ${where} into ${command.side} '${command.id}'`
  };
}

export function executeInterfaceMove(
  command: Extract<Command, { type: 'interface_move' }>,
  context: CommandContext
): CommandResult {
  const workflow = context.getWorkflow();
  if (!workflow) return noWorkflow();
  const entries = entriesOf(workflow, command.side);
  if (!entries.some((e) => e.id === command.id)) {
    return entryNotFound(workflow, command.side, command.id);
  }
  if (
    !Number.isInteger(command.position) ||
    command.position < 1 ||
    command.position > entries.length
  ) {
    return fail(
      'INVALID_ARGUMENT',
      `Position ${command.position} is out of range: there are ${entries.length} ${command.side}(s), counted from 1.`
    );
  }
  const result = moveInterfaceEntry(
    workflow,
    command.side,
    command.id,
    command.position - 1
  ) as InterfaceEditResult;
  if (!commit(context, workflow, result)) {
    return {
      ok: true,
      message: `${command.side} '${command.id}' is already at position ${command.position}`
    };
  }
  return {
    ok: true,
    message: `Moved ${command.side} '${command.id}' to position ${command.position} of ${entries.length}`
  };
}
