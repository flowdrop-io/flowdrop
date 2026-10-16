<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import NodeDecorator from '../../stories/NodeDecorator.svelte';
  import { createSampleNodeData } from '../../stories/utils.js';
  import type { AtomUIConfig, NodePort } from '../../types/index.js';
  // The component is imported last: a node component imported first would load the instance
  // container before its own module has finished, and fail on the import cycle.
  import AtomNode from './AtomNode.svelte';

  const { Story } = defineMeta({
    title: 'Editor/Nodes/Atom node',
    component: AtomNode,
    tags: ['autodocs'],
    parameters: { layout: 'centered' }
  });

  const out: NodePort = { id: 'value', name: 'Value', type: 'output', dataType: 'string' };
  const inp: NodePort = { id: 'input', name: 'Input', type: 'input', dataType: 'string' };

  /** An atom whose body and look come from `extensions.ui.atom`. */
  const atom = (label: string, ui: AtomUIConfig, extra: { inputs?: NodePort[] } = {}) =>
    createSampleNodeData({
      label,
      config: {},
      metadata: {
        node_type_id: 'constant',
        name: 'Constant',
        description: 'A fixed value.',
        category: 'data',
        type: 'atom',
        inputs: extra.inputs ?? [],
        outputs: [out],
        extensions: { ui: { atom: ui } }
      }
    });
</script>

<Story
  asChild
  name="A constant"
  parameters={{
    docs: {
      description: {
        story:
          'A value as a small pill: the text is the whole node. The editor draws it for a node type that declares `type: "atom"`.'
      }
    }
  }}
>
  <NodeDecorator data={atom('Hello world', {})} />
</Story>

<Story asChild name="Selected">
  <NodeDecorator data={atom('Hello world', {})} selected />
</Story>

<Story
  asChild
  name="A transform"
  parameters={{
    docs: {
      description: {
        story:
          'A `prefix` marks a step that changes a value. It stays visible when the text is cut.'
      }
    }
  }}
>
  <NodeDecorator data={atom('uppercase', { prefix: '→ ' }, { inputs: [inp] })} />
</Story>

<Story
  asChild
  name="Rectangle shape"
  parameters={{ docs: { description: { story: 'The same atom with lightly rounded corners.' } } }}
>
  <NodeDecorator data={atom('Hello world', { shape: 'rectangle' })} />
</Story>

<Story
  asChild
  name="Empty"
  parameters={{
    docs: {
      description: {
        story: 'A new constant with no value yet. The placeholder shows, dimmed.'
      }
    }
  }}
>
  <NodeDecorator data={atom('', { placeholder: 'Set a value' })} />
</Story>

<Story
  asChild
  name="Long text"
  parameters={{
    docs: {
      description: { story: 'The text is cut at `maxWidth`. The full text is in the config.' }
    }
  }}
>
  <NodeDecorator
    data={atom('A very long constant value that does not fit on the pill', { maxWidth: 200 })}
  />
</Story>
