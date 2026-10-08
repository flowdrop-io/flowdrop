/**
 * Shared formatters / icon maps / label resolver for the message layout
 * components. Pure functions only — i18n strings come in via the `roles`
 * argument; the helper has no runtime dependency on the messages context.
 */

import type {
  PlaygroundMessage,
  PlaygroundMessageLevel,
  PlaygroundMessageOrigin,
  PlaygroundMessageRole
} from '../../types/playground.js';
import type { Messages } from '../../messages/types.js';

export type RoleLabels = Messages['playground']['roles'];
export type OriginLabels = Messages['playground']['origins'];
export type EmptyTurnLabels = Messages['playground']['emptyTurn'];

export function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export function formatDuration(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
}

export function getLogLevelIcon(level: PlaygroundMessageLevel | undefined): string {
  switch (level) {
    case 'error':
      return 'mdi:alert-circle';
    case 'warning':
      return 'mdi:alert';
    case 'debug':
      return 'mdi:bug';
    default:
      return 'mdi:information';
  }
}

export function getRoleIcon(role: PlaygroundMessageRole): string {
  switch (role) {
    case 'user':
      return 'mdi:account';
    case 'assistant':
      return 'mdi:robot';
    case 'system':
      return 'mdi:cog';
    case 'log':
      return 'mdi:console';
    default:
      return 'mdi:message';
  }
}

/**
 * Localised author label. Backend-supplied overrides win:
 *   - user → metadata.userName (display name)
 *   - log  → metadata.nodeLabel (human-readable node label)
 * Anything else returns the role's i18n default.
 */
export function getRoleLabel(
  message: Pick<PlaygroundMessage, 'role' | 'metadata'>,
  roles: RoleLabels
): string {
  switch (message.role) {
    case 'user':
      return message.metadata?.userName ?? roles.you;
    case 'assistant':
      return roles.assistant;
    case 'system':
      return roles.system;
    case 'log':
      return message.metadata?.nodeLabel ?? roles.log;
    default:
      return roles.message;
  }
}

/**
 * What a user turn with no text stands for, or null when it has text. A Run
 * on a form or run-only workflow posts a turn with no message: it names the
 * inputs it carried (`metadata.inputs`), or says a run was started.
 */
export function getEmptyTurnLabel(
  message: Pick<PlaygroundMessage, 'role' | 'content' | 'metadata'>,
  labels: EmptyTurnLabels
): string | null {
  if (message.role !== 'user' || message.content.trim() !== '') return null;
  const inputs = message.metadata?.inputs;
  const names =
    inputs !== null && typeof inputs === 'object' && !Array.isArray(inputs)
      ? Object.keys(inputs)
      : [];
  return names.length > 0 ? labels.withInputs({ names: names.join(', ') }) : labels.run;
}

/**
 * Origins that earn a badge. `user` and `workflow` are the conversation
 * itself and stay unbadged, and so does `playground`: the Playground is
 * where the reader already is. What is left was posted by a component
 * around the conversation and is marked so a reader can tell it apart.
 */
const BADGED_ORIGINS: ReadonlySet<PlaygroundMessageOrigin> = new Set<PlaygroundMessageOrigin>([
  'engine',
  'interrupt'
]);

/**
 * The origin to badge a message with, or null for none. Absent (older
 * servers), unknown, `user` and `workflow` origins get no badge.
 */
export function getOriginBadge(
  message: Pick<PlaygroundMessage, 'origin'>
): PlaygroundMessageOrigin | null {
  const origin = message.origin;
  return origin !== undefined && BADGED_ORIGINS.has(origin) ? origin : null;
}

/** A run of adjacent rows collapsed into one group, or a single row. */
export type MessageRow<T> =
  | { kind: 'single'; item: T }
  | { kind: 'group'; key: string; items: T[] };

/**
 * Fold runs of at least `minRun` adjacent groupable items into one group;
 * everything else stays a single row. Order is preserved. The group key is
 * the first item's key, so a run that grows at its tail keeps its identity
 * (and its open/closed state) across renders.
 */
export function groupAdjacent<T>(
  items: readonly T[],
  isGroupable: (item: T) => boolean,
  keyOf: (item: T) => string,
  minRun = 3
): MessageRow<T>[] {
  const rows: MessageRow<T>[] = [];
  let run: T[] = [];
  const flush = () => {
    if (run.length >= minRun) {
      rows.push({ kind: 'group', key: keyOf(run[0]), items: run });
    } else {
      for (const item of run) rows.push({ kind: 'single', item });
    }
    run = [];
  };
  for (const item of items) {
    if (isGroupable(item)) {
      run.push(item);
    } else {
      flush();
      rows.push({ kind: 'single', item });
    }
  }
  flush();
  return rows;
}
