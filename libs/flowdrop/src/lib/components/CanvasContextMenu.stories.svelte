<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import CanvasContextMenu from './CanvasContextMenu.svelte';
  import CanvasDecorator from '../stories/CanvasDecorator.svelte';
  import type { ContextMenuEntry } from '../editor/contextMenu.js';

  const { Story } = defineMeta({
    title: 'Editor/CanvasContextMenu',
    tags: ['autodocs'],
    parameters: {
      layout: 'centered'
    }
  });

  const noop = (): void => {};

  const nodeEntries: ContextMenuEntry[] = [
    { id: 'configure', label: 'Configure', shortcut: 'Enter', run: noop },
    { id: 'separator-node', separator: true },
    { id: 'delete', label: 'Delete', shortcut: 'Delete', run: noop }
  ];

  const selectionEntries: ContextMenuEntry[] = [
    { id: 'delete', label: 'Delete 3 nodes', shortcut: 'Delete', run: noop }
  ];

  const consumerEntries: ContextMenuEntry[] = [
    ...nodeEntries,
    { id: 'separator-consumer', separator: true },
    { id: 'open-docs', label: 'Open documentation', icon: 'mdi:book-open-variant', run: noop }
  ];

  const disabledEntries: ContextMenuEntry[] = [
    { id: 'configure', label: 'Configure', shortcut: 'Enter', run: noop },
    { id: 'publish', label: 'Publish (not allowed here)', disabled: true, run: noop },
    { id: 'separator-node', separator: true },
    { id: 'delete', label: 'Delete', shortcut: 'Delete', run: noop }
  ];
</script>

<Story name="Node">
  <CanvasDecorator>
    <CanvasContextMenu entries={nodeEntries} x={40} y={40} onselect={noop} onclose={noop} />
  </CanvasDecorator>
</Story>

<Story name="Selection">
  <CanvasDecorator>
    <CanvasContextMenu entries={selectionEntries} x={40} y={40} onselect={noop} onclose={noop} />
  </CanvasDecorator>
</Story>

<Story name="Consumer entry">
  <CanvasDecorator>
    <CanvasContextMenu entries={consumerEntries} x={40} y={40} onselect={noop} onclose={noop} />
  </CanvasDecorator>
</Story>

<Story name="Disabled entry">
  <CanvasDecorator>
    <CanvasContextMenu entries={disabledEntries} x={40} y={40} onselect={noop} onclose={noop} />
  </CanvasDecorator>
</Story>
