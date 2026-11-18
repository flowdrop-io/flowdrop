/**
 * Workflow-level commands: duplicate a node, read and set the workflow's name,
 * description and format, and read and edit the Playground chat binding.
 * They reuse what the editor's panels use (`utils/playgroundChat`,
 * `utils/workflowInterface`) and write through `dispatch`, one undo step each.
 *
 * Custom workflow settings (the host's `workflowSettingsSchema`) are readable
 * but not settable here: the schema is a prop of the host's App mount, not
 * part of the command context, so a value could not be checked.
 *
 * @module commands/workflowCommands
 */

import type { PlaygroundChatBinding, Workflow } from '../types/index.js';
import { DEFAULT_WORKFLOW_FORMAT } from '../types/index.js';
import { buildDuplicateNode } from '../utils/duplicateNode.js';
import {
  editPlaygroundChat,
  isPlaygroundChatHalfSet,
  playgroundBindingInEffect,
  playgroundBoundInputs,
  type PlaygroundChatChange
} from '../utils/playgroundChat.js';
import { nodePortsFor } from '../utils/portExposure.js';
import { listBindablePorts, playgroundChatIssues } from '../utils/workflowInterface.js';
import {
  configurablePortNotFound,
  fail,
  listCapped,
  noWorkflow,
  nodeNotFoundMessage,
  resolveNode,
  toShortId
} from './helpers.js';
import type {
  Command,
  CommandContext,
  CommandResult,
  DuplicateNodeResultData,
  PlaygroundChatEdit,
  PlaygroundGetResultData,
  WorkflowGetResultData
} from './types.js';

// ============================================================================
// duplicate
// ============================================================================

/** The editor's "Duplicate": same type, label, config and metadata, offset by two grid cells. */
export function executeDuplicateNode(
  command: Extract<Command, { type: 'duplicate_node' }>,
  context: CommandContext
): CommandResult {
  const workflow = context.getWorkflow();
  if (!workflow) return noWorkflow();
  const source = resolveNode(command.nodeId, workflow.nodes);
  if (!source) return fail('NODE_NOT_FOUND', nodeNotFoundMessage(command.nodeId, workflow.nodes));
  const node = buildDuplicateNode(source, workflow.nodes, context.layoutGaps?.gridSize ?? 20);
  if (!node) {
    return fail(
      'INVALID_ARGUMENT',
      `${toShortId(source.id)} has no node type, so it cannot be duplicated.`
    );
  }
  const { position } = node;
  context.dispatch.addNode(node);

  const data: DuplicateNodeResultData = {
    nodeId: toShortId(node.id),
    sourceNodeId: toShortId(source.id),
    position
  };
  return {
    ok: true,
    message: `Duplicated ${data.sourceNodeId} as ${data.nodeId}. Its interface bindings and wires were not copied.`,
    data
  };
}

// ============================================================================
// workflow
// ============================================================================

export function executeWorkflowGet(context: CommandContext): CommandResult {
  const workflow = context.getWorkflow();
  if (!workflow) return noWorkflow();
  const formats = context.formatOptions?.();
  const data: WorkflowGetResultData = {
    name: workflow.name,
    description: workflow.description ?? '',
    format: workflow.metadata?.format || DEFAULT_WORKFLOW_FORMAT,
    ...(formats ? { formats } : {}),
    config: workflow.config ?? {}
  };
  const lines = [
    `Name: ${data.name}`,
    `Description: ${data.description || '(none)'}`,
    `Format: ${data.format}${formats ? ` (available: ${formats.join(', ')})` : ''}`
  ];
  const keys = Object.keys(data.config);
  if (keys.length > 0)
    lines.push(`Custom settings (read-only here): ${JSON.stringify(data.config)}`);
  return { ok: true, message: lines.join('\n'), data };
}

export function executeWorkflowSet(
  command: Extract<Command, { type: 'workflow_set' }>,
  context: CommandContext
): CommandResult {
  const workflow = context.getWorkflow();
  if (!workflow) return noWorkflow();

  if (command.field === 'name') {
    const name = command.value.trim();
    // The store ignores an empty name, so a silent no-op would read as success.
    if (name === '') return fail('INVALID_ARGUMENT', 'The workflow name must not be empty.');
    if (name === workflow.name) return { ok: true, message: `Workflow name is already "${name}"` };
    context.dispatch.batchUpdate({ name });
    return { ok: true, message: `Workflow name set to "${name}"` };
  }

  if (command.field === 'description') {
    if (command.value === (workflow.description ?? '')) {
      return { ok: true, message: 'Workflow description is already that' };
    }
    context.dispatch.batchUpdate({ description: command.value });
    return {
      ok: true,
      message: command.value === '' ? 'Workflow description cleared' : 'Workflow description set'
    };
  }

  const formats = context.formatOptions?.();
  const format = command.value.trim();
  if (!formats) {
    return fail(
      'INVALID_ARGUMENT',
      'This editor does not say which workflow formats it offers, so the format cannot be changed here.'
    );
  }
  if (formats.length <= 1) {
    return fail(
      'INVALID_ARGUMENT',
      `This editor offers a single workflow format (${formats[0] ?? 'none'}).`
    );
  }
  if (!formats.includes(format)) {
    return fail('INVALID_ARGUMENT', `Unknown format '${format}'. Formats: ${formats.join(', ')}.`);
  }
  const current = workflow.metadata?.format || DEFAULT_WORKFLOW_FORMAT;
  if (current === format) return { ok: true, message: `Workflow format is already ${format}` };

  const incompatible = workflow.nodes.filter((node) => {
    const supported = node.data?.metadata?.formats;
    return supported && supported.length > 0 && !supported.includes(format);
  });
  context.dispatch.batchUpdate({ metadata: { format } });
  return {
    ok: true,
    message:
      `Workflow format set to ${format}` +
      (incompatible.length > 0
        ? `. Warning: ${incompatible.length} node(s) are not compatible with it and may not export correctly: ${listCapped(incompatible.map((n) => toShortId(n.id)))}`
        : '')
  };
}

// ============================================================================
// playground
// ============================================================================

const NO_PLAYGROUND =
  'This backend sends no Playground settings (it predates FlowDrop 2.7.0), so there is no chat binding to read or edit.';

function describeBinding(workflow: Workflow, chat: PlaygroundChatBinding) {
  const nodes = workflow.nodes;
  return {
    message: chat.message,
    history: chat.history,
    session_id: chat.session_id,
    message_id: chat.message_id,
    replies: chat.replies.map((reply) => ({
      nodeId: toShortId(nodes.find((n) => n.id === reply.node_id)?.id ?? reply.node_id),
      port: reply.port
    })),
    sub_workflow_replies: chat.sub_workflow_replies
  };
}

export function executePlaygroundGet(context: CommandContext): CommandResult {
  const workflow = context.getWorkflow();
  if (!workflow) return noWorkflow();
  if (workflow.playground === undefined) {
    const data: PlaygroundGetResultData = { available: false };
    return { ok: true, message: NO_PLAYGROUND, data };
  }
  const { chat, source, stored, turnChat } = playgroundBindingInEffect(workflow);
  const issues = playgroundChatIssues(workflow, stored ?? turnChat).map((i) => i.message);
  const described = describeBinding(workflow, chat);
  const data: PlaygroundGetResultData = { available: true, source, chat: described, issues };
  const replies = described.replies.map((r) => `${r.nodeId}:${r.port}`).join(', ') || 'none';
  const lines = [
    `Chat binding (${source === 'none' ? 'not set up' : source === 'settings' ? 'Playground settings' : 'deprecated interface turn marks'}):`,
    `  message: ${chat.message ?? 'none'}`,
    `  history: ${chat.history ? `${chat.history.input} (limit ${chat.history.limit})` : 'none'}`,
    `  session_id: ${chat.session_id ?? 'none'}`,
    `  message_id: ${chat.message_id ?? 'none'}`,
    `  replies: ${replies}`,
    `  sub_workflow_replies: ${chat.sub_workflow_replies ? 'on' : 'off'}`,
    ...issues.map((issue) => `  Issue: ${issue}`)
  ];
  return { ok: true, message: lines.join('\n'), data };
}

/** A reply as the Playground settings list it: the node's full id and the port. */
const sameReply = (r: { node_id: string; port: string }, nodeId: string, port: string) =>
  r.port === port && (r.node_id === nodeId || r.node_id.endsWith(`.${nodeId}`));

/**
 * The shared chat edit an agent's command asks for, or the reason it cannot be
 * made. The checks are the settings panel's own choices: an input must be on
 * the interface and fills one field; a reply must be a port the panel lists
 * (`listBindablePorts`); a reply left on a deleted node can still be removed.
 */
function planChatEdit(
  workflow: Workflow,
  base: PlaygroundChatBinding,
  edit: Exclude<PlaygroundChatEdit, { kind: 'move_turns' }>
): { change: PlaygroundChatChange; summary: string } | { error: CommandResult } {
  const bad = (error: string) => ({ error: fail('INVALID_ARGUMENT', error) });
  const limitOk = (n: number) => Number.isInteger(n) && n >= 1;

  switch (edit.kind) {
    case 'off':
      return { change: edit, summary: 'Chat switched off (no input or reply is bound)' };

    case 'input': {
      if (edit.key === 'history' && edit.limit !== undefined && !limitOk(edit.limit)) {
        return bad('The history limit must be a whole number of at least 1.');
      }
      if (edit.id !== null) {
        const inputs = (workflow.interface?.inputs ?? []).map((entry) => entry.id);
        if (!inputs.includes(edit.id)) {
          return bad(
            `'${edit.id}' is not an input of the interface. The inputs: ${listCapped(inputs)}.`
          );
        }
        const others = playgroundBoundInputs({ ...base, [edit.key]: null });
        if (others.has(edit.id)) {
          return bad(
            `Input '${edit.id}' is already bound to another chat field; one input fills one field.`
          );
        }
      }
      const change: PlaygroundChatChange = edit;
      if (edit.key === 'history') {
        const limit = edit.limit ?? base.history?.limit;
        return {
          change,
          summary:
            edit.id === null
              ? 'Chat history input unbound'
              : `Chat history bound to '${edit.id}'${limit !== undefined ? ` (limit ${limit})` : ''}`
        };
      }
      return {
        change,
        summary:
          edit.id === null
            ? `Chat ${edit.key} input unbound`
            : `Chat ${edit.key} bound to '${edit.id}'`
      };
    }

    case 'limit':
      if (!limitOk(edit.limit))
        return bad('The history limit must be a whole number of at least 1.');
      if (base.history === null) {
        return bad('No history input is bound. Bind one first: `playground chat history <input>`.');
      }
      return { change: edit, summary: `Chat history limit set to ${edit.limit}` };

    case 'reply': {
      const node = resolveNode(edit.nodeId, workflow.nodes);
      const label = node ? `${toShortId(node.id)}:${edit.port}` : `${edit.nodeId}:${edit.port}`;
      if (edit.mode === 'remove') {
        // Matched on the stored reply, so one left on a deleted node can go.
        const stored = base.replies.find((r) =>
          node
            ? r.node_id === node.id && r.port === edit.port
            : sameReply(r, edit.nodeId, edit.port)
        );
        if (!stored) {
          const current = base.replies.map((r) => `${toShortId(r.node_id)}:${r.port}`);
          return bad(`${label} is not a reply. The replies: ${listCapped(current)}.`);
        }
        return {
          change: { kind: 'reply', mode: 'remove', reply: stored },
          summary: `Removed reply ${label}`
        };
      }
      if (!node) {
        return { error: fail('NODE_NOT_FOUND', nodeNotFoundMessage(edit.nodeId, workflow.nodes)) };
      }
      const listed = listBindablePorts(workflow, 'output').some(
        (candidate) => candidate.nodeId === node.id && candidate.port.id === edit.port
      );
      if (!listed) {
        return nodePortsFor(node, 'outputs').some((port) => port.id === edit.port)
          ? bad(
              `${label} cannot be a reply: it is hidden on the canvas or it is control flow (trigger, loop-back, tool output).`
            )
          : { error: configurablePortNotFound(node, edit.port, 'output') };
      }
      if (base.replies.some((r) => r.node_id === node.id && r.port === edit.port)) {
        return bad(`${label} is already a reply.`);
      }
      return {
        change: { kind: 'reply', mode: 'add', reply: { node_id: node.id, port: edit.port } },
        summary: `Added reply ${label}`
      };
    }

    case 'sub_replies':
      return { change: edit, summary: `Sub-workflow replies ${edit.on ? 'on' : 'off'}` };
  }
}

/** Edit the Playground chat binding: what `WorkflowPlaygroundSettings` edits, in one undo step. */
export function executePlaygroundChat(
  command: Extract<Command, { type: 'playground_chat' }>,
  context: CommandContext
): CommandResult {
  const workflow = context.getWorkflow();
  if (!workflow) return noWorkflow();
  // An older backend would drop the key on save, as the Playground tab is hidden for it.
  if (workflow.playground === undefined) return fail('INVALID_ARGUMENT', NO_PLAYGROUND);
  const { edit } = command;

  // Move the deprecated interface `turn` marks into the settings: store the
  // binding they declare and clear the marks, in one update.
  if (edit.kind === 'move_turns') {
    const moved = editPlaygroundChat(workflow, { kind: 'move_turns' });
    if (!moved) {
      return fail(
        'INVALID_ARGUMENT',
        'No interface `turn` marks declare a chat binding, so there is nothing to move.'
      );
    }
    context.dispatch.batchUpdate({ playground: moved.playground, interface: moved.interface });
    return { ok: true, message: 'Moved the interface turn marks into the Playground settings' };
  }

  const planned = planChatEdit(workflow, playgroundBindingInEffect(workflow).chat, edit);
  if ('error' in planned) return planned.error;

  const result = editPlaygroundChat(workflow, planned.change);
  if (!result) return { ok: true, message: `No change: ${planned.summary}` };
  // As the settings panel does: any edit while turn marks are on the interface
  // moves them too, or clearing the binding would fall back to them.
  const movesTurns = result.interface !== undefined;
  context.dispatch.batchUpdate({
    playground: result.playground,
    ...(movesTurns ? { interface: result.interface } : {})
  });

  const notes = [planned.summary];
  if (movesTurns) notes.push('The deprecated interface turn marks were moved into the settings');
  if (isPlaygroundChatHalfSet(result.chat)) {
    notes.push('Warning: a message input is bound but no reply is, so nothing answers in the chat');
  }
  return { ok: true, message: notes.join('. ') };
}
