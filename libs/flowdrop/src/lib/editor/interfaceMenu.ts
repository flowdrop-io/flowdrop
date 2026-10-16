/**
 * The context menu of a port: publish it in the workflow interface, or, once
 * it is published, rename or unpublish it. Pure: builds entries for
 * `CanvasContextMenu`, which runs them through the editor.
 *
 * @module editor/interfaceMenu
 */

import type { Workflow } from '../types/index.js';
import type { ContextMenuEntry } from './contextMenu.js';
import { defaultMessages } from '../messages/defaults.js';
import {
  entryAtPort,
  exposableCandidate,
  inputHasIncomingEdge,
  type InterfaceDirection
} from '../utils/interfaceTags.js';

/** A port on the canvas. */
export interface PortTarget {
  nodeId: string;
  direction: InterfaceDirection;
  portId: string;
}

/** What the menu entries do. The editor routes each through the workflow store. */
export interface InterfaceMenuActions {
  /** Start typing the name of a new entry for the port. */
  expose(target: PortTarget): void;
  /** Start renaming the entry the port is published as. */
  rename(target: PortTarget): void;
  /** Take the entry off the interface. */
  remove(target: PortTarget): void;
}

type ContextMenuMessages = typeof defaultMessages.contextMenu;

/**
 * Entries for a port. Empty when the port cannot be published and is not: a
 * hidden port, a control-flow port (trigger, loop-back, tool output). An
 * unpublished input that already has an incoming edge is offered but
 * disabled: publishing it would feed it from two sources.
 */
export function buildPortInterfaceEntries(
  workflow: Workflow,
  target: PortTarget,
  actions: InterfaceMenuActions,
  messages: ContextMenuMessages = defaultMessages.contextMenu
): ContextMenuEntry[] {
  const published = entryAtPort(workflow, target.nodeId, target.direction, target.portId);
  if (published) {
    return [
      {
        id: 'interface-rename',
        icon: 'mdi:pencil-outline',
        label: messages.renameInterfaceEntry,
        run: () => actions.rename(target)
      },
      {
        id: 'interface-remove',
        icon: 'mdi:link-off',
        label: messages.removeInterfaceEntry,
        danger: true,
        run: () => actions.remove(target)
      }
    ];
  }

  if (!exposableCandidate(workflow, target.nodeId, target.direction, target.portId)) return [];

  return [
    {
      id: 'interface-expose',
      icon: 'mdi:tag-arrow-right-outline',
      label: target.direction === 'input' ? messages.exposeInput : messages.exposeOutput,
      disabled:
        target.direction === 'input' &&
        inputHasIncomingEdge(workflow, target.nodeId, target.portId),
      run: () => actions.expose(target)
    }
  ];
}
