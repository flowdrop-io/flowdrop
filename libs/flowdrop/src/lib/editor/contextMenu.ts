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
  /** Delete nodes (and their edges) as the Delete key would, including the confirm-delete setting and the undo entry. */
  deleteNodes(ids: string[]): void;
  /** Open the configuration panel for a node. */
  openConfig(id: string): void;
  /** Open a node for typing in place. */
  editInPlace(id: string): void;
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
 * that edits in place), separator, Delete; selection (2+ nodes) -> Delete n
 * nodes; pane -> Add caption when the node types include a caption, else none.
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
    if (!caption) return [];
    return [
      {
        id: 'add-caption',
        label: messages.addCaption,
        run: (c) => {
          c.actions.addNode(caption, c.position, { edit: true });
        }
      }
    ];
  }

  if (ctx.target === 'node' && ctx.nodes.length === 1) {
    const first: ContextMenuEntry = options.editsInPlace?.(ctx.nodes[0])
      ? {
          id: 'edit-text',
          label: messages.editText,
          shortcut: messages.shortcutEnter,
          run: (c) => c.actions.editInPlace(c.nodes[0].id)
        }
      : {
          id: 'configure',
          label: messages.configure,
          shortcut: messages.shortcutEnter,
          run: (c) => c.actions.openConfig(c.nodes[0].id)
        };
    return [
      first,
      { id: 'separator-node', separator: true },
      {
        id: 'delete',
        label: messages.delete,
        shortcut: messages.shortcutDelete,
        run: (c) => c.actions.deleteNodes(c.nodes.map((n) => n.id))
      }
    ];
  }

  if (ctx.target === 'selection' && ctx.nodes.length > 1) {
    return [
      {
        id: 'delete',
        label: messages.deleteNodes({ n: ctx.nodes.length }),
        shortcut: messages.shortcutDelete,
        run: (c) => c.actions.deleteNodes(c.nodes.map((n) => n.id))
      }
    ];
  }

  return [];
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
