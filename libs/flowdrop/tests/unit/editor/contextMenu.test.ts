import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildDefaultContextMenuEntries,
  resolveContextMenuEntries,
  runContextMenuEntry,
  cleanSeparators,
  findCaptionMetadata,
  isSeparator,
  type ContextMenuActions,
  type ContextMenuContext,
  type ContextMenuEntry
} from '../../../src/lib/editor/contextMenu.js';
import { defaultMessages } from '../../../src/lib/messages/defaults.js';
import { logger } from '../../../src/lib/utils/logger.js';
import type { NodeMetadata, WorkflowNode } from '../../../src/lib/types/index.js';

function node(id: string): WorkflowNode {
  return {
    id,
    type: 'universalNode',
    position: { x: 0, y: 0 },
    data: { label: id, config: {}, metadata: {} }
  } as unknown as WorkflowNode;
}

function makeActions(): ContextMenuActions {
  return {
    addNode: vi.fn(() => 'new-1'),
    deleteNodes: vi.fn(),
    openConfig: vi.fn(),
    editInPlace: vi.fn()
  };
}

function makeCtx(
  target: ContextMenuContext['target'],
  nodes: WorkflowNode[] = []
): ContextMenuContext {
  return {
    target,
    nodes,
    position: { x: 20, y: 40 },
    nodeTypes: [],
    actions: makeActions()
  };
}

function meta(over: Partial<NodeMetadata>): NodeMetadata {
  return {
    node_type_id: 'x',
    name: 'X',
    type: 'default',
    inputs: [],
    outputs: [],
    ...over
  } as NodeMetadata;
}

const captionMeta = meta({ node_type_id: 'caption', name: 'Caption', type: 'caption' });

const ids = (entries: ContextMenuEntry[]): string[] => entries.map((e) => e.id);

describe('buildDefaultContextMenuEntries', () => {
  it('node: Configure, separator, Delete', () => {
    const entries = buildDefaultContextMenuEntries(makeCtx('node', [node('a')]));
    expect(ids(entries)).toEqual(['configure', 'separator-node', 'delete']);
    expect(entries[0]).toMatchObject({ label: 'Configure', shortcut: 'Enter' });
    expect(entries[2]).toMatchObject({ label: 'Delete', shortcut: 'Delete' });
    expect(isSeparator(entries[1])).toBe(true);
  });

  it('shortcut hints come from the messages', () => {
    const messages = {
      ...defaultMessages.contextMenu,
      shortcutEnter: 'Eingabe',
      shortcutDelete: 'Entf'
    };
    const entries = buildDefaultContextMenuEntries(makeCtx('node', [node('a')]), messages);
    expect(entries[0]).toMatchObject({ shortcut: 'Eingabe' });
    expect(entries[2]).toMatchObject({ shortcut: 'Entf' });
  });

  it('node: Configure and Delete call the matching actions', () => {
    const ctx = makeCtx('node', [node('a')]);
    const [configure, , del] = buildDefaultContextMenuEntries(ctx);
    runContextMenuEntry(configure, ctx);
    runContextMenuEntry(del, ctx);
    expect(ctx.actions.openConfig).toHaveBeenCalledWith('a');
    expect(ctx.actions.deleteNodes).toHaveBeenCalledWith(['a']);
  });

  it('selection: one Delete entry with a plural label, deleting every selected id', () => {
    const ctx = makeCtx('selection', [node('a'), node('b'), node('c')]);
    const entries = buildDefaultContextMenuEntries(ctx);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ id: 'delete', label: 'Delete 3 nodes' });
    runContextMenuEntry(entries[0], ctx);
    expect(ctx.actions.deleteNodes).toHaveBeenCalledWith(['a', 'b', 'c']);
  });

  it('plural label: two nodes', () => {
    expect(defaultMessages.contextMenu.deleteNodes({ n: 2 })).toBe('Delete 2 nodes');
    expect(defaultMessages.contextMenu.deleteNodes({ n: 1 })).toBe('Delete 1 node');
  });

  it('pane: no entries yet', () => {
    expect(buildDefaultContextMenuEntries(makeCtx('pane'))).toEqual([]);
  });

  it('pane: Add caption when the node types include a caption, running addNode with edit', () => {
    const ctx = makeCtx('pane');
    ctx.nodeTypes = [meta({ node_type_id: 'calc' }), captionMeta];
    const entries = buildDefaultContextMenuEntries(ctx);
    expect(ids(entries)).toEqual(['add-caption']);
    expect(entries[0]).toMatchObject({ label: 'Add caption' });
    runContextMenuEntry(entries[0], ctx);
    expect(ctx.actions.addNode).toHaveBeenCalledWith(captionMeta, ctx.position, { edit: true });
  });

  it('pane: no Add caption without caption metadata', () => {
    const ctx = makeCtx('pane');
    ctx.nodeTypes = [meta({ node_type_id: 'calc' }), meta({ node_type_id: 'note', type: 'note' })];
    expect(buildDefaultContextMenuEntries(ctx)).toEqual([]);
  });

  it('pane: a node type that only lists caption in supportedTypes counts', () => {
    const viaSupported = meta({ node_type_id: 'label', supportedTypes: ['default', 'caption'] });
    const ctx = makeCtx('pane');
    ctx.nodeTypes = [viaSupported];
    expect(findCaptionMetadata(ctx.nodeTypes)).toBe(viaSupported);
    expect(ids(buildDefaultContextMenuEntries(ctx))).toEqual(['add-caption']);
  });

  it('node that edits in place: Edit text instead of Configure, then Delete', () => {
    const ctx = makeCtx('node', [node('a')]);
    const entries = buildDefaultContextMenuEntries(ctx, defaultMessages.contextMenu, {
      editsInPlace: () => true
    });
    expect(ids(entries)).toEqual(['edit-text', 'separator-node', 'delete']);
    expect(entries[0]).toMatchObject({ label: 'Edit text', shortcut: 'Enter' });
    runContextMenuEntry(entries[0], ctx);
    expect(ctx.actions.editInPlace).toHaveBeenCalledWith('a');
    expect(ctx.actions.openConfig).not.toHaveBeenCalled();
  });

  it('the predicate decides per node; without it Configure stays', () => {
    const ctx = makeCtx('node', [node('plain')]);
    const withPredicate = buildDefaultContextMenuEntries(ctx, defaultMessages.contextMenu, {
      editsInPlace: (n) => n.id === 'caption.1'
    });
    expect(ids(withPredicate)).toEqual(['configure', 'separator-node', 'delete']);
    expect(ids(buildDefaultContextMenuEntries(ctx))).toEqual([
      'configure',
      'separator-node',
      'delete'
    ]);
  });

  it('resolveContextMenuEntries passes the predicate through', () => {
    const ctx = makeCtx('node', [node('a')]);
    const entries = resolveContextMenuEntries(ctx, undefined, defaultMessages.contextMenu, {
      editsInPlace: () => true
    });
    expect(ids(entries)).toEqual(['edit-text', 'separator-node', 'delete']);
  });

  it('uses the supplied messages', () => {
    const messages = { ...defaultMessages.contextMenu, configure: 'Konfigurieren' };
    const entries = buildDefaultContextMenuEntries(makeCtx('node', [node('a')]), messages);
    expect(entries[0]).toMatchObject({ label: 'Konfigurieren' });
  });
});

describe('resolveContextMenuEntries', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
  });
  afterEach(() => errorSpy.mockRestore());

  it('returns the defaults when there is no items option', () => {
    const ctx = makeCtx('node', [node('a')]);
    expect(ids(resolveContextMenuEntries(ctx))).toEqual(['configure', 'separator-node', 'delete']);
  });

  it('the pane menu is empty by default, so no menu opens there', () => {
    // Read-only suppression itself lives in WorkflowEditor (it never calls the
    // resolver unless canvasEditable) and is covered by editor-context-menu.spec.ts.
    expect(resolveContextMenuEntries(makeCtx('pane'))).toEqual([]);
  });

  it('consumer appends an entry', () => {
    const run = vi.fn();
    const ctx = makeCtx('node', [node('a')]);
    const entries = resolveContextMenuEntries(ctx, {
      items: (_c, defaults) => [...defaults, { id: 'extra', label: 'Extra', run }]
    });
    expect(ids(entries)).toEqual(['configure', 'separator-node', 'delete', 'extra']);
    runContextMenuEntry(entries[3], ctx);
    expect(run).toHaveBeenCalledWith(ctx);
  });

  it('consumer can add to the pane menu', () => {
    const entries = resolveContextMenuEntries(makeCtx('pane'), {
      items: (_c, defaults) => [...defaults, { id: 'x', label: 'X', run: () => {} }]
    });
    expect(ids(entries)).toEqual(['x']);
  });

  it('consumer removes an entry; the orphaned separator is dropped', () => {
    const entries = resolveContextMenuEntries(makeCtx('node', [node('a')]), {
      items: (_c, defaults) => defaults.filter((e) => e.id !== 'delete')
    });
    expect(ids(entries)).toEqual(['configure']);
  });

  it('consumer returning the defaults unchanged yields the defaults', () => {
    const entries = resolveContextMenuEntries(makeCtx('node', [node('a')]), {
      items: (_c, defaults) => defaults
    });
    expect(ids(entries)).toEqual(['configure', 'separator-node', 'delete']);
  });

  it('consumer receives the context and the defaults', () => {
    const items = vi.fn((_c: ContextMenuContext, d: ContextMenuEntry[]) => d);
    const ctx = makeCtx('selection', [node('a'), node('b')]);
    resolveContextMenuEntries(ctx, { items });
    expect(items).toHaveBeenCalledTimes(1);
    expect(items.mock.calls[0][0]).toBe(ctx);
    expect(ids(items.mock.calls[0][1])).toEqual(['delete']);
  });

  it('falls back to the defaults and logs when items throws', () => {
    const entries = resolveContextMenuEntries(makeCtx('node', [node('a')]), {
      items: () => {
        throw new Error('boom');
      }
    });
    expect(ids(entries)).toEqual(['configure', 'separator-node', 'delete']);
    expect(errorSpy).toHaveBeenCalled();
  });

  it('falls back to the defaults and logs when items returns a non-array', () => {
    const entries = resolveContextMenuEntries(makeCtx('node', [node('a')]), {
      items: (() => 'nope') as unknown as () => ContextMenuEntry[]
    });
    expect(ids(entries)).toEqual(['configure', 'separator-node', 'delete']);
    expect(errorSpy).toHaveBeenCalled();
  });
});

describe('runContextMenuEntry', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
  });
  afterEach(() => errorSpy.mockRestore());

  it('catches and logs a throwing run', () => {
    const entry: ContextMenuEntry = {
      id: 'bad',
      label: 'Bad',
      run: () => {
        throw new Error('boom');
      }
    };
    expect(() => runContextMenuEntry(entry, makeCtx('pane'))).not.toThrow();
    expect(errorSpy).toHaveBeenCalled();
  });

  it('catches and logs a rejecting async run', async () => {
    const entry = {
      id: 'bad',
      label: 'Bad',
      run: () => Promise.reject(new Error('boom'))
    } as unknown as ContextMenuEntry;
    runContextMenuEntry(entry, makeCtx('pane'));
    await Promise.resolve();
    await Promise.resolve();
    expect(errorSpy).toHaveBeenCalled();
  });

  it('does not run a disabled entry', () => {
    const run = vi.fn();
    runContextMenuEntry({ id: 'd', label: 'D', disabled: true, run }, makeCtx('pane'));
    expect(run).not.toHaveBeenCalled();
  });
});

describe('cleanSeparators', () => {
  const item = (id: string): ContextMenuEntry => ({ id, label: id, run: () => {} });
  const sep = (id: string): ContextMenuEntry => ({ id, separator: true });

  it('drops leading, trailing and doubled separators', () => {
    const out = cleanSeparators([sep('s1'), item('a'), sep('s2'), sep('s3'), item('b'), sep('s4')]);
    expect(ids(out)).toEqual(['a', 's2', 'b']);
  });

  it('returns an empty list for only separators', () => {
    expect(cleanSeparators([sep('s1'), sep('s2')])).toEqual([]);
  });
});
