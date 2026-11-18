/**
 * Port visibility commands: which ports a node shows (`config.ports`), in what
 * order. They reuse the Ports tab's and the context menu's helpers
 * (`utils/portExposure`, `utils/portUtils`) and write the node through
 * `dispatch.updateNode`, so each is one undo step.
 *
 * @module commands/portCommands
 */

import type { NodePort, PortsConfig, Workflow, WorkflowNode } from '../types/index.js';
import {
  applyPortExposure,
  countPortWires,
  exposureCandidates,
  hideBlock,
  movePort,
  nodePortsFor,
  setPortExposed,
  withPorts,
  type ExposureBlock
} from '../utils/portExposure.js';
import { isPortExposed, orderPortsFor, type PortsDirection } from '../utils/portUtils.js';
import { entryAtPort } from '../utils/interfaceTags.js';
import {
  configurablePortNotFound,
  fail,
  noWorkflow,
  nodeNotFoundMessage,
  resolveNode,
  toShortId
} from './helpers.js';
import type {
  Command,
  CommandContext,
  CommandResult,
  InterfaceSide,
  PortStateDescription,
  PortsListResultData
} from './types.js';

const keyOf = (side: InterfaceSide): PortsDirection => (side === 'input' ? 'inputs' : 'outputs');

/** What `hideBlock` says, in words. */
function blockText(
  block: ExposureBlock,
  workflow: Workflow,
  node: WorkflowNode,
  side: InterfaceSide,
  port: NodePort
): string {
  switch (block.kind) {
    case 'locked':
      return 'its node type fixes it as always shown';
    case 'wired':
      return `it has ${block.count} wire(s); disconnect them first`;
    case 'published': {
      const entry = entryAtPort(workflow, node.id, side, port.id);
      return `it is published on the interface${entry ? ` as '${entry.id}'` : ''}; remove or unbind that entry first`;
    }
  }
}

/** Write a node's `config.ports`, dropping the key when the node ends up with no override. */
function writePorts(context: CommandContext, node: WorkflowNode, ports: PortsConfig | undefined) {
  context.dispatch.updateNode(node.id, {
    data: { ...node.data, config: withPorts(node.data?.config, ports) }
  });
}

/** The side of a named port: the one that has it, or an error when none or both do. */
function sideOf(
  node: WorkflowNode,
  portId: string,
  wanted: InterfaceSide | undefined,
  verb: string
): { side: InterfaceSide } | { error: CommandResult } {
  const sides = (['input', 'output'] as const).filter(
    (side) =>
      (!wanted || wanted === side) && nodePortsFor(node, keyOf(side)).some((p) => p.id === portId)
  );
  if (sides.length === 0) {
    return { error: configurablePortNotFound(node, portId, wanted ?? 'output') };
  }
  if (sides.length > 1) {
    return {
      error: fail(
        'INVALID_ARGUMENT',
        `Port '${portId}' exists on both sides of ${toShortId(node.id)}. Say which: \`${verb} input ...\` or \`${verb} output ...\`.`
      )
    };
  }
  return { side: sides[0] };
}

export function executePortsList(
  command: Extract<Command, { type: 'ports_list' }>,
  context: CommandContext
): CommandResult {
  const workflow = context.getWorkflow();
  if (!workflow) return noWorkflow();
  const node = resolveNode(command.nodeId, workflow.nodes);
  if (!node) return fail('NODE_NOT_FOUND', nodeNotFoundMessage(command.nodeId, workflow.nodes));

  const config = node.data?.config?.ports as PortsConfig | undefined;
  const wires = countPortWires(node, workflow);
  const ports: PortStateDescription[] = [];
  for (const side of ['input', 'output'] as const) {
    const key = keyOf(side);
    const all = nodePortsFor(node, key);
    for (const port of orderPortsFor(all, config?.[key])) {
      const exposed = isPortExposed(port, config?.[key]);
      const block = exposed ? hideBlock(node, workflow, key, port, wires) : null;
      ports.push({
        port: port.id,
        name: port.name,
        side,
        dataType: port.dataType,
        exposed,
        ...(block ? { hideBlock: block.kind } : {})
      });
    }
  }
  const data: PortsListResultData = { nodeId: toShortId(node.id), ports };
  const lines = ports.map((p) => {
    const state = p.exposed
      ? p.hideBlock
        ? `shown, cannot hide (${p.hideBlock})`
        : 'shown'
      : 'hidden';
    return `  ${p.side} ${p.port} (${p.dataType}): ${state}`;
  });
  return {
    ok: true,
    message: `Ports of ${data.nodeId}:${lines.length ? '\n' + lines.join('\n') : ' none'}`,
    data
  };
}

export function executePortsExposure(
  command: Extract<Command, { type: 'ports_exposure' }>,
  context: CommandContext
): CommandResult {
  const workflow = context.getWorkflow();
  if (!workflow) return noWorkflow();
  const node = resolveNode(command.nodeId, workflow.nodes);
  if (!node) return fail('NODE_NOT_FOUND', nodeNotFoundMessage(command.nodeId, workflow.nodes));
  const short = toShortId(node.id);
  const { mode } = command;

  // The whole node: the context menu's "Hide unconnected ports" / "Show hidden ports".
  if (command.port === undefined) {
    const count = exposureCandidates(node, workflow, mode).length;
    if (count === 0) {
      return {
        ok: true,
        message:
          mode === 'hide'
            ? `${short} has no unconnected port to hide`
            : `${short} has no hidden port to show`
      };
    }
    writePorts(context, node, applyPortExposure(node, workflow, mode));
    return {
      ok: true,
      message: `${mode === 'hide' ? 'Hid' : 'Showed'} ${count} port(s) of ${short}`
    };
  }

  const found = sideOf(node, command.port, command.side, `ports ${mode}`);
  if ('error' in found) return found.error;
  const { side } = found;
  const key = keyOf(side);
  const all = nodePortsFor(node, key);
  const port = all.find((p) => p.id === command.port) as NodePort;
  const current = node.data?.config?.ports as PortsConfig | undefined;
  const wasExposed = isPortExposed(port, current?.[key]);
  const label = `${side} ${short}:${port.id}`;

  if (mode === 'hide') {
    if (!wasExposed) return { ok: true, message: `${label} is already hidden` };
    const block = hideBlock(node, workflow, key, port, countPortWires(node, workflow));
    if (block) {
      return fail(
        'INVALID_ARGUMENT',
        `Cannot hide ${label}: ${blockText(block, workflow, node, side, port)}.`
      );
    }
  } else if (wasExposed) {
    return { ok: true, message: `${label} is already shown` };
  }

  writePorts(context, node, setPortExposed(current, key, all, port.id, mode === 'show'));
  return { ok: true, message: `${mode === 'hide' ? 'Hid' : 'Showed'} ${label}` };
}

export function executePortsMove(
  command: Extract<Command, { type: 'ports_move' }>,
  context: CommandContext
): CommandResult {
  const workflow = context.getWorkflow();
  if (!workflow) return noWorkflow();
  const node = resolveNode(command.nodeId, workflow.nodes);
  if (!node) return fail('NODE_NOT_FOUND', nodeNotFoundMessage(command.nodeId, workflow.nodes));

  const found = sideOf(node, command.port, command.side, 'ports move');
  if ('error' in found) return found.error;
  const { side } = found;
  const key = keyOf(side);
  const all = nodePortsFor(node, key);
  const current = node.data?.config?.ports as PortsConfig | undefined;
  const count = orderPortsFor(all, current?.[key]).length;
  if (!Number.isInteger(command.position) || command.position < 1 || command.position > count) {
    return fail(
      'INVALID_ARGUMENT',
      `Position ${command.position} is out of range: ${toShortId(node.id)} has ${count} ${side} port(s), counted from 1.`
    );
  }
  const label = `${side} ${toShortId(node.id)}:${command.port}`;
  const moved = movePort(current, key, all, command.port, command.position - 1);
  if (!moved) return { ok: true, message: `${label} is already at position ${command.position}` };
  writePorts(context, node, moved.ports);
  return { ok: true, message: `Moved ${label} to position ${command.position}` };
}
