/**
 * The context menu of a port: "Connect to…" first, then the workflow
 * interface entries (publish, rename, unpublish). Pure: builds entries for
 * `CanvasContextMenu`, which runs them through the editor.
 *
 * @module editor/portMenu
 */

import type { Workflow } from '../types/index.js';
import type { ContextMenuEntry } from './contextMenu.js';
import { canConnectFrom } from './connectCandidates.js';
import {
  buildPortInterfaceEntries,
  type InterfaceMenuActions,
  type PortTarget
} from './interfaceMenu.js';
import { defaultMessages } from '../messages/defaults.js';

/** What the port menu entries do: the interface actions plus opening the picker. */
export interface PortMenuActions extends InterfaceMenuActions {
  /** Open the "Connect to…" picker for the port. */
  connectTo(target: PortTarget): void;
}

type ContextMenuMessages = typeof defaultMessages.contextMenu;

/**
 * Entries for a port: "Connect to…" (not on a hidden port or a trigger's
 * event input), a separator, then the interface entries when it has any.
 */
export function buildPortMenuEntries(
  workflow: Workflow,
  target: PortTarget,
  actions: PortMenuActions,
  messages: ContextMenuMessages = defaultMessages.contextMenu
): ContextMenuEntry[] {
  const connect: ContextMenuEntry[] = canConnectFrom(workflow, target)
    ? [
        {
          id: 'connect-to',
          icon: 'mdi:vector-polyline-plus',
          label: messages.connectTo,
          run: () => actions.connectTo(target)
        }
      ]
    : [];
  const iface = buildPortInterfaceEntries(workflow, target, actions, messages);
  return [
    ...connect,
    ...(connect.length > 0 && iface.length > 0
      ? [{ id: 'separator-port', separator: true } as const]
      : []),
    ...iface
  ];
}
