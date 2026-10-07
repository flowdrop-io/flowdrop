/**
 * A workflow's chat binding (its Playground settings).
 *
 * Which interface input the person's message fills, which one receives recent
 * messages and the two ids, and which node output ports print as replies.
 * Stored per workflow by the Playground (`workflow.playground.chat`) and saved
 * with the workflow. A workflow without stored settings falls back to the
 * deprecated interface `turn` annotations until 3.0, and otherwise has no
 * chat until somebody sets it up.
 *
 * Pure functions over the workflow document: no store, no node graph (the
 * graph-aware checks are `playgroundChatIssues` in `workflowInterface.ts`),
 * never throw, never mutate their arguments.
 *
 * @module utils/playgroundChat
 */

import type {
  PlaygroundChatBinding,
  PlaygroundChatSource,
  PlaygroundReplyPort,
  Workflow,
  WorkflowInterface,
  WorkflowInterfaceEntry,
  WorkflowPlayground
} from '$lib/types/index.js';
import {
  DEFAULT_HISTORY_TURN_LIMIT,
  WORKFLOW_INTERFACE_INPUT_TURNS,
  WORKFLOW_INTERFACE_OUTPUT_TURNS
} from '$lib/types/index.js';

/** The binding in effect for a workflow, and where it came from. */
export interface ResolvedPlaygroundChat {
  binding: PlaygroundChatBinding;
  source: PlaygroundChatSource;
}

/** A binding that binds nothing. */
export function emptyPlaygroundChat(): PlaygroundChatBinding {
  return {
    message: null,
    history: null,
    session_id: null,
    message_id: null,
    replies: [],
    sub_workflow_replies: false
  };
}

/**
 * A binding in its full shape, every key present. Malformed parts are dropped
 * rather than trusted (the server refuses them on save); a history limit that
 * is not a positive integer falls back to the default.
 */
export function normalizePlaygroundChat(chat: unknown): PlaygroundChatBinding {
  const source = isRecord(chat) ? chat : {};
  const name = (value: unknown): string | null =>
    typeof value === 'string' && value !== '' ? value : null;
  const history = isRecord(source.history) ? source.history : null;
  const historyInput = history ? name(history.input) : null;
  const limit = history?.limit;
  const replies: PlaygroundReplyPort[] = [];
  for (const reply of Array.isArray(source.replies) ? source.replies : []) {
    const nodeId = isRecord(reply) ? name(reply.node_id) : null;
    const port = isRecord(reply) ? name(reply.port) : null;
    if (nodeId !== null && port !== null) replies.push({ node_id: nodeId, port });
  }
  return {
    message: name(source.message),
    history:
      historyInput === null
        ? null
        : {
            input: historyInput,
            limit:
              typeof limit === 'number' && Number.isInteger(limit) && limit >= 1
                ? limit
                : DEFAULT_HISTORY_TURN_LIMIT
          },
    session_id: name(source.session_id),
    message_id: name(source.message_id),
    replies,
    sub_workflow_replies: source.sub_workflow_replies === true
  };
}

/**
 * The binding the deprecated interface `turn` annotations declare, or `null`
 * when no entry declares one. The first input per turn value wins (as on the
 * server); every output with `turn: reply` becomes a reply on the port it is
 * bound to.
 *
 * @deprecated since 2.11.0, removed in 3.0 with interface `turn`.
 */
export function interfaceTurnChat(
  workflowInterface: WorkflowInterface | undefined
): PlaygroundChatBinding | null {
  const inputs = workflowInterface?.inputs ?? [];
  const outputs = workflowInterface?.outputs ?? [];
  if (![...inputs, ...outputs].some((entry) => Boolean(entry.turn))) return null;

  const first = (turn: string) => inputs.find((entry) => entry.turn === turn);
  const history = first('history');
  const limit = history?.meta?.limit;
  const replies: PlaygroundReplyPort[] = [];
  for (const entry of outputs) {
    const target = entry.bindings[0];
    if (entry.turn === 'reply' && target) {
      replies.push({ node_id: target.nodeId, port: target.portId });
    }
  }
  return {
    message: first('message')?.id ?? null,
    history: history
      ? {
          input: history.id,
          limit:
            typeof limit === 'number' && Number.isInteger(limit) && limit > 0
              ? limit
              : DEFAULT_HISTORY_TURN_LIMIT
        }
      : null,
    session_id: first('session_id')?.id ?? null,
    message_id: first('message_id')?.id ?? null,
    replies,
    sub_workflow_replies: false
  };
}

/**
 * The binding in effect for the workflow as it is now, or `null` when the
 * workflow carries no `playground` key (a server before FlowDrop 2.7.0: the
 * caller keeps its pre-settings behaviour).
 *
 * The same rule the server applies: stored settings win, then the deprecated
 * interface `turn`, else nothing. An input name the interface no longer has
 * binds nothing. Computed from the document rather than read from
 * `playground.resolved`, which goes stale on the first edit.
 */
export function resolvePlaygroundChat(
  workflow: Pick<Workflow, 'interface' | 'playground'> | null | undefined
): ResolvedPlaygroundChat | null {
  const playground = workflow?.playground;
  if (playground === undefined) return null;

  const stored = playground.chat ? normalizePlaygroundChat(playground.chat) : null;
  const fromTurn = stored ? null : interfaceTurnChat(workflow?.interface);
  const binding = stored ?? fromTurn;
  if (binding === null) return { binding: emptyPlaygroundChat(), source: 'none' };

  const inputIds = new Set((workflow?.interface?.inputs ?? []).map((entry) => entry.id));
  const known = (id: string | null) => (id !== null && inputIds.has(id) ? id : null);
  const historyInput = binding.history ? known(binding.history.input) : null;
  return {
    binding: {
      ...binding,
      message: known(binding.message),
      history: binding.history && historyInput !== null ? binding.history : null,
      session_id: known(binding.session_id),
      message_id: known(binding.message_id)
    },
    source: stored ? 'settings' : 'interface_turn'
  };
}

/** The interface inputs a binding fills (so a form must not ask for them). */
export function playgroundBoundInputs(binding: PlaygroundChatBinding): Set<string> {
  const ids = [
    binding.message,
    binding.history?.input ?? null,
    binding.session_id,
    binding.message_id
  ];
  return new Set(ids.filter((id): id is string => id !== null));
}

/** Whether a binding states anything at all (else it is the same as none). */
export function isPlaygroundChatSet(binding: PlaygroundChatBinding): boolean {
  return (
    playgroundBoundInputs(binding).size > 0 ||
    binding.replies.length > 0 ||
    binding.sub_workflow_replies
  );
}

/**
 * Whether a binding is half set: a message input is bound but no reply is,
 * so the person can type but nothing ever answers.
 */
export function isPlaygroundChatHalfSet(binding: PlaygroundChatBinding): boolean {
  return binding.message !== null && binding.replies.length === 0;
}

/**
 * The `playground` value after replacing its stored binding. `null` (or a
 * binding that binds nothing) clears it: the workflow then has no stored
 * settings. Server-computed `resolved`/`source` are dropped, since they no
 * longer describe the workflow.
 */
export function withPlaygroundChat(
  playground: WorkflowPlayground | undefined,
  chat: PlaygroundChatBinding | null
): WorkflowPlayground {
  const next = chat && isPlaygroundChatSet(chat) ? normalizePlaygroundChat(chat) : null;
  const rest: WorkflowPlayground = { ...(playground ?? { chat: null }), chat: next };
  delete rest.resolved;
  delete rest.source;
  return rest;
}

/**
 * The `playground` value a save sends: only the stored binding (`chat`), or
 * `undefined` when the workflow carries no Playground settings at all (a
 * server before FlowDrop 2.7.0, which must not receive the key).
 */
export function playgroundForSave(
  playground: WorkflowPlayground | undefined
): { chat: PlaygroundChatBinding | null } | undefined {
  if (playground === undefined) return undefined;
  return { chat: playground.chat ? normalizePlaygroundChat(playground.chat) : null };
}

/**
 * The interface with every deprecated `turn` mark this library knows removed
 * (and a history entry's `meta.limit`, which only `turn: history` gave a
 * meaning), for the step that moves the marks into Playground settings. Other
 * `meta` keys stay; an entry left with an empty `meta` loses the key. A turn
 * value from a newer server is not part of the move, so it stays and
 * round-trips verbatim.
 */
export function withoutInterfaceTurns(
  workflowInterface: WorkflowInterface | undefined
): WorkflowInterface | undefined {
  if (workflowInterface === undefined) return undefined;
  const strip = (entry: WorkflowInterfaceEntry): WorkflowInterfaceEntry => {
    if (entry.turn === undefined || !KNOWN_TURNS.has(entry.turn)) return entry;
    const next: WorkflowInterfaceEntry = { ...entry };
    delete next.turn;
    if (entry.turn === 'history' && next.meta && 'limit' in next.meta) {
      const meta = { ...next.meta };
      delete meta.limit;
      if (Object.keys(meta).length > 0) next.meta = meta;
      else delete next.meta;
    }
    return next;
  };
  return {
    ...workflowInterface,
    ...(workflowInterface.inputs && { inputs: workflowInterface.inputs.map(strip) }),
    ...(workflowInterface.outputs && { outputs: workflowInterface.outputs.map(strip) })
  };
}

const KNOWN_TURNS: ReadonlySet<string> = new Set([
  ...WORKFLOW_INTERFACE_INPUT_TURNS,
  ...WORKFLOW_INTERFACE_OUTPUT_TURNS
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
