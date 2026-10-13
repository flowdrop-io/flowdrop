/**
 * Canvas context menu model.
 *
 * Pure (no Svelte, no DOM): builds the entries for a right-click or keyboard
 * menu on the editor canvas, lets the consumer's `contextMenu.items` have the
 * last word, and runs an entry without letting a consumer bug break the
 * canvas. The component (`CanvasContextMenu.svelte`) and the editor wiring
 * live elsewhere; the built-in entries go through the same path as consumer
 * ones, so there is one way to add an item.
 *
 * @module editor/contextMenu
 */

import type { XYPosition } from '@xyflow/svelte';
import type { NodeMetadata, WorkflowNode } from '../types/index.js';
import { defaultMessages } from '../messages/defaults.js';
import { logger } from '../utils/logger.js';

/** What was right-clicked (or had focus when the menu key was pressed). */
export type ContextMenuTarget = 'pane' | 'node' | 'selection';

/** Operations an entry can perform on the editor. All go through the editor's own paths (history, confirm-delete, edge cleanup). */
export interface ContextMenuActions {
  /** Add a node of the given type at a flow position. Returns the new node id, or null if it could not be created. */
  addNode(
    metadata: NodeMetadata,
    position: XYPosition,
    options?: { edit?: boolean }
  ): string | null;
  /**
   * Delete nodes (and their edges) as the Delete key would, including the
   * confirm-delete setting and the undo entry. Resolves once the deletion has
   * been decided and applied (or declined at the confirm prompt).
   */
  deleteNodes(ids: string[]): Promise<void>;
  /** Open the configuration panel for a node. */
  openConfig(id: string): void;
  /** Open a node for typing in place. */
  editInPlace(id: string): void;
  /** Place a copy of a node (same type, label and config, no edges) beside the original. */
  duplicateNode(id: string): void;
  /** Start the node-swap flow for a node. Absent when swapping is not offered here. */
  swapNode?(id: string): void;
  /**
   * Tidy the whole graph ("Tidy up", `layout beautify`), as one undo step. Absent when the
   * canvas is read-only or cannot measure its cards.
   */
  tidyLayout?(): void;
  /**
   * Tidy these nodes one after another (`layout node beautify`: column, port order, straight
   * wires, free space), as one undo step. Absent when the canvas cannot offer it.
   */
  tidyNodes?(ids: string[]): void;
  /**
   * Hide the exposed data ports that have no wire, as one undo step. This is
   * an exposure change (the ports leave the canvas and stop being wireable),
   * not a display toggle. Absent when the editor cannot offer it.
   */
  hideUnconnectedPorts?(ids: string[]): void;
  /** How many ports {@link hideUnconnectedPorts} would hide on these nodes. Absent: unknown, offered enabled. */
  countUnconnectedPorts?(ids: string[]): number;
  /** Show every hidden port of these nodes again, as one undo step. Absent when the editor cannot offer it. */
  showHiddenPorts?(ids: string[]): void;
  /** How many ports {@link showHiddenPorts} would show on these nodes. Absent: unknown, offered enabled. */
  countHiddenPorts?(ids: string[]): number;
}

/** Everything an entry or the `items` option needs to decide what to show and do. */
export interface ContextMenuContext {
  target: ContextMenuTarget;
  /** The right-clicked node, or the selection; empty on the pane. */
  nodes: WorkflowNode[];
  /** Flow coordinates of the click, snapped to the grid when snap-to-grid is on. */
  position: XYPosition;
  /** The instance's node types (`fd.nodeTypes.current`). */
  nodeTypes: NodeMetadata[];
  actions: ContextMenuActions;
}

/** A menu item or a separator. */
export type ContextMenuEntry =
  | {
      id: string;
      label: string;
      /** Iconify icon name. */
      icon?: string;
      /** Display-only hint, e.g. the key that triggers the same action. */
      shortcut?: string;
      disabled?: boolean;
      /** Destructive action: drawn in the danger tone. */
      danger?: boolean;
      run(ctx: ContextMenuContext): void | Promise<void>;
    }
  | { id: string; separator: true };

/** Consumer configuration for the canvas context menu. */
export interface ContextMenuOptions {
  /**
   * Receives the built-in entries for this menu and returns the final list:
   * append, remove, reorder or pass them through. Synchronous. If it throws or
   * returns something that is not an array, the built-in entries are used.
   */
  items?: (ctx: ContextMenuContext, defaults: ContextMenuEntry[]) => ContextMenuEntry[];
}

type ContextMenuMessages = typeof defaultMessages.contextMenu;

/**
 * What the pure builder cannot learn from the context alone. Kept out of
 * `ContextMenuContext` so that public shape does not change.
 */
export interface DefaultEntriesOptions {
  /** Whether a node edits its text in place (its registration sets `editsInPlace`). Default: never. */
  editsInPlace?: (node: WorkflowNode) => boolean;
}

/**
 * The first node type that is the caption: `type === 'caption'`, or
 * `supportedTypes` includes `'caption'`. Undefined when the backend has none,
 * in which case there is no "Add caption" entry.
 */
export function findCaptionMetadata(nodeTypes: NodeMetadata[]): NodeMetadata | undefined {
  return nodeTypes.find(
    (meta) => meta.type === 'caption' || (meta.supportedTypes ?? []).includes('caption')
  );
}

/** Type guard: separator entry. */
export function isSeparator(entry: ContextMenuEntry): entry is { id: string; separator: true } {
  return 'separator' in entry && entry.separator === true;
}

/**
 * The built-in entries for a menu: node -> Configure (or Edit text for a node
 * that edits in place), Duplicate, Swap node (when offered), Tidy node (when offered), separator, Delete;
 * selection (2+ nodes) -> Tidy n nodes (when offered), separator, Delete n nodes; pane -> Add caption
 * when the node types include a caption, and Tidy up when offered.
 *
 * @param messages - the `contextMenu` message branch (`m().contextMenu` in a component)
 * @param options - facts the context does not carry (see `DefaultEntriesOptions`)
 */
export function buildDefaultContextMenuEntries(
  ctx: ContextMenuContext,
  messages: ContextMenuMessages = defaultMessages.contextMenu,
  options: DefaultEntriesOptions = {}
): ContextMenuEntry[] {
  if (ctx.target === 'pane') {
    const caption = findCaptionMetadata(ctx.nodeTypes);
    const entries: ContextMenuEntry[] = [];
    if (caption) {
      entries.push({
        id: 'add-caption',
        icon: 'mdi:text-box-plus-outline',
        label: messages.addCaption,
        run: (c) => {
          c.actions.addNode(caption, c.position, { edit: true });
        }
      });
    }
    if (ctx.actions.tidyLayout) {
      entries.push({
        id: 'tidy-layout',
        icon: 'mdi:broom',
        label: messages.tidyLayout,
        shortcut: messages.shortcutTidyLayout,
        run: (c) => c.actions.tidyLayout?.()
      });
    }
    return entries;
  }

  if (ctx.target === 'node' && ctx.nodes.length === 1) {
    const inPlace = options.editsInPlace?.(ctx.nodes[0]) ?? false;
    const first: ContextMenuEntry = inPlace
      ? {
          id: 'edit-text',
          icon: 'mdi:pencil-outline',
          label: messages.editText,
          shortcut: messages.shortcutEnter,
          run: (c) => c.actions.editInPlace(c.nodes[0].id)
        }
      : {
          id: 'configure',
          icon: 'mdi:cog-outline',
          label: messages.configure,
          shortcut: messages.shortcutEnter,
          run: (c) => c.actions.openConfig(c.nodes[0].id)
        };
    const swap = ctx.actions.swapNode;
    // A caption is edited in place and has no ports: nothing to tidy.
    const straighten = inPlace ? [] : [...tidyEntry(ctx, messages), ...portEntries(ctx, messages)];
    return [
      first,
      {
        id: 'duplicate',
        icon: 'mdi:content-copy',
        label: messages.duplicate,
        run: (c) => c.actions.duplicateNode(c.nodes[0].id)
      },
      ...(swap
        ? [
            {
              id: 'swap',
              icon: 'mdi:swap-horizontal',
              label: messages.swap,
              run: (c: ContextMenuContext) => c.actions.swapNode?.(c.nodes[0].id)
            } satisfies ContextMenuEntry
          ]
        : []),
      ...straighten,
      { id: 'separator-node', separator: true },
      {
        id: 'delete',
        icon: 'mdi:trash-can-outline',
        label: messages.delete,
        shortcut: messages.shortcutDelete,
        danger: true,
        run: (c) => c.actions.deleteNodes(c.nodes.map((n) => n.id))
      }
    ];
  }

  if (ctx.target === 'selection' && ctx.nodes.length > 1) {
    const straighten = [...tidyEntry(ctx, messages), ...portEntries(ctx, messages)];
    return [
      ...straighten,
      ...(straighten.length > 0 ? [{ id: 'separator-selection', separator: true } as const] : []),
      {
        id: 'delete',
        icon: 'mdi:trash-can-outline',
        label: messages.deleteNodes({ n: ctx.nodes.length }),
        shortcut: messages.shortcutDelete,
        danger: true,
        run: (c) => c.actions.deleteNodes(c.nodes.map((n) => n.id))
      }
    ];
  }

  return [];
}

/** The "Tidy node" entry ("Tidy n nodes" on a selection), when the editor offers it. */
function tidyEntry(ctx: ContextMenuContext, messages: ContextMenuMessages): ContextMenuEntry[] {
  if (!ctx.actions.tidyNodes) return [];
  const ids = ctx.nodes.map((n) => n.id);
  return [
    {
      id: 'tidy-node',
      icon: 'mdi:broom',
      label: ids.length > 1 ? messages.tidyNodes({ n: ids.length }) : messages.tidyNode,
      shortcut: messages.shortcutTidyNode,
      run: (c) => c.actions.tidyNodes?.(c.nodes.map((n) => n.id))
    }
  ];
}

/**
 * "Hide unconnected ports" and "Show hidden ports", when the editor offers
 * them. The label carries the number of ports it would change; with none the
 * entry stays but is disabled and wears the plain label.
 */
function portEntries(ctx: ContextMenuContext, messages: ContextMenuMessages): ContextMenuEntry[] {
  const { actions } = ctx;
  const ids = ctx.nodes.map((n) => n.id);
  const entries: ContextMenuEntry[] = [];
  if (actions.hideUnconnectedPorts) {
    const n = actions.countUnconnectedPorts?.(ids);
    entries.push({
      id: 'hide-unconnected-ports',
      icon: 'mdi:eye-off-outline',
      label: n ? messages.hideUnconnectedPortsCount({ n }) : messages.hideUnconnectedPorts,
      disabled: n === 0,
      run: (c) => c.actions.hideUnconnectedPorts?.(c.nodes.map((node) => node.id))
    });
  }
  if (actions.showHiddenPorts) {
    const n = actions.countHiddenPorts?.(ids);
    entries.push({
      id: 'show-hidden-ports',
      icon: 'mdi:eye-outline',
      label: n ? messages.showHiddenPortsCount({ n }) : messages.showHiddenPorts,
      disabled: n === 0,
      run: (c) => c.actions.showHiddenPorts?.(c.nodes.map((node) => node.id))
    });
  }
  return entries;
}

/** Drop leading, trailing and doubled separators. */
export function cleanSeparators(entries: ContextMenuEntry[]): ContextMenuEntry[] {
  const out: ContextMenuEntry[] = [];
  for (const entry of entries) {
    if (isSeparator(entry) && (out.length === 0 || isSeparator(out[out.length - 1]))) continue;
    out.push(entry);
  }
  while (out.length > 0 && isSeparator(out[out.length - 1])) out.pop();
  return out;
}

/**
 * Build the final entries: defaults, then the consumer's `items`, then
 * separator clean-up. A consumer error never reaches the canvas.
 */
export function resolveContextMenuEntries(
  ctx: ContextMenuContext,
  options?: ContextMenuOptions,
  messages: ContextMenuMessages = defaultMessages.contextMenu,
  defaultsOptions: DefaultEntriesOptions = {}
): ContextMenuEntry[] {
  const defaults = buildDefaultContextMenuEntries(ctx, messages, defaultsOptions);
  const items = options?.items;
  if (!items) return cleanSeparators(defaults);

  try {
    const result = items(ctx, defaults);
    if (!Array.isArray(result)) {
      logger.error('contextMenu.items must return an array; using the default entries.');
      return cleanSeparators(defaults);
    }
    return cleanSeparators(result);
  } catch (error) {
    logger.error('contextMenu.items threw; using the default entries.', error);
    return cleanSeparators(defaults);
  }
}

/** Run an entry; errors from `run` (sync or async) are logged, never thrown. Disabled entries and separators do nothing. */
export function runContextMenuEntry(entry: ContextMenuEntry, ctx: ContextMenuContext): void {
  if (isSeparator(entry) || entry.disabled) return;
  try {
    const result = entry.run(ctx);
    if (result instanceof Promise) {
      result.catch((error: unknown) =>
        logger.error(`Context menu entry "${entry.id}" failed.`, error)
      );
    }
  } catch (error) {
    logger.error(`Context menu entry "${entry.id}" failed.`, error);
  }
}
