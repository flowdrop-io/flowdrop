/**
 * Shared formatters / icon maps / label resolver for the message layout
 * components. Pure functions only — i18n strings come in via the `roles`
 * argument; the helper has no runtime dependency on the messages context.
 */

import type {
  PlaygroundMessage,
  PlaygroundMessageLevel,
  PlaygroundMessageRole
} from '../../types/playground.js';
import type { Messages } from '../../messages/types.js';

export type RoleLabels = Messages['playground']['roles'];

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
