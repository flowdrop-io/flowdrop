<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import CanvasContextMenu from './CanvasContextMenu.svelte';
  import CanvasDecorator from '../stories/CanvasDecorator.svelte';
  import { chatWorkflow, nodeTypes } from '../stories/fixtures.js';
  import {
    buildDefaultContextMenuEntries,
    type ContextMenuActions,
    type ContextMenuContext,
    type ContextMenuEntry,
    type ContextMenuTarget
  } from '../editor/contextMenu.js';
  import type { NodeMetadata } from '../types/index.js';

  const { Story } = defineMeta({
    title: 'Editor/Canvas/Context menu',
    component: CanvasContextMenu,
    tags: ['autodocs'],
    // The menu is placed in window coordinates, so show the canvas from the top-left corner.
    parameters: { layout: 'fullscreen' }
  });

  const noop = (): void => {};

  /** What the editor offers on a canvas it can measure. Every action is a no-op here. */
  const actions: ContextMenuActions = {
    addNode: () => null,
    deleteNodes: async () => {},
    openConfig: noop,
    editInPlace: noop,
    duplicateNode: noop,
    swapNode: noop,
    tidyLayout: noop,
    tidyNodes: noop,
    hideUnconnectedPorts: noop,
    countUnconnectedPorts: () => 2,
    showHiddenPorts: noop,
    countHiddenPorts: () => 0
  };

  const caption: NodeMetadata = {
    node_type_id: 'caption',
    name: 'Caption',
    description: 'A text label on the canvas',
    category: 'helpers',
    version: '1.0.0',
    type: 'caption',
    inputs: [],
    outputs: []
  };

  /** The entries the editor builds for a right-click, from the real builder. */
  function entriesFor(
    target: ContextMenuTarget,
    nodeCount: number,
    options: { inPlace?: boolean } = {}
  ): ContextMenuEntry[] {
    const ctx: ContextMenuContext = {
      target,
      nodes: chatWorkflow.nodes.slice(0, nodeCount),
      position: { x: 0, y: 0 },
      nodeTypes: [...nodeTypes, caption],
      actions
    };
    return buildDefaultContextMenuEntries(ctx, undefined, {
      editsInPlace: () => options.inPlace ?? false
    });
  }

  const nodeEntries = entriesFor('node', 1);
  const selectionEntries = entriesFor('selection', 3);
  const paneEntries = entriesFor('pane', 0);
  const captionEntries = entriesFor('node', 1, { inPlace: true });

  // A host adds its own entry through `contextMenu.items`; it goes through the same path.
  const consumerEntries: ContextMenuEntry[] = [
    ...nodeEntries,
    { id: 'separator-consumer', separator: true },
    { id: 'open-docs', label: 'Open documentation', icon: 'mdi:book-open-variant', run: noop }
  ];

  const disabledEntries: ContextMenuEntry[] = nodeEntries.map((entry) =>
    entry.id === 'configure' ? { ...entry, label: 'Configure (read only)', disabled: true } : entry
  );
</script>

<Story
  name="On a node"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'Right-click a node. Configure, Duplicate, Swap and the Tidy and port entries act on it; Delete sits below a rule in the danger colour.'
      }
    }
  }}
>
  <CanvasDecorator>
    <CanvasContextMenu entries={nodeEntries} x={40} y={40} onselect={noop} onclose={noop} />
  </CanvasDecorator>
</Story>

<Story
  name="On a selection"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'Right-click inside a selection of two or more nodes. The entries act on all of them.'
      }
    }
  }}
>
  <CanvasDecorator>
    <CanvasContextMenu entries={selectionEntries} x={40} y={40} onselect={noop} onclose={noop} />
  </CanvasDecorator>
</Story>

<Story
  name="On the empty canvas"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'Right-click the background. You can add a caption where you clicked, or tidy the whole graph.'
      }
    }
  }}
>
  <CanvasDecorator>
    <CanvasContextMenu entries={paneEntries} x={40} y={40} onselect={noop} onclose={noop} />
  </CanvasDecorator>
</Story>

<Story
  name="On a caption"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'A caption is typed in place and has no ports, so the menu offers Edit text instead of Configure and no Tidy entries.'
      }
    }
  }}
>
  <CanvasDecorator>
    <CanvasContextMenu entries={captionEntries} x={40} y={40} onselect={noop} onclose={noop} />
  </CanvasDecorator>
</Story>

<Story
  name="With a host entry"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'A host can add its own entries with the `contextMenu.items` option. They look and behave like the built-in ones.'
      }
    }
  }}
>
  <CanvasDecorator>
    <CanvasContextMenu entries={consumerEntries} x={40} y={40} onselect={noop} onclose={noop} />
  </CanvasDecorator>
</Story>

<Story
  name="With a disabled entry"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'An entry the person is not allowed to use stays in the list but is dimmed and does nothing.'
      }
    }
  }}
>
  <CanvasDecorator>
    <CanvasContextMenu entries={disabledEntries} x={40} y={40} onselect={noop} onclose={noop} />
  </CanvasDecorator>
</Story>
