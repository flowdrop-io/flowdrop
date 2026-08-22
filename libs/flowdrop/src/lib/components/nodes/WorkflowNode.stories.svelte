<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import NodeDecorator from '../../stories/NodeDecorator.svelte';
  import { createSampleNodeData } from '../../stories/utils.js';

  const { Story } = defineMeta({
    title: 'Nodes/WorkflowNode',
    tags: ['autodocs'],
    parameters: {
      layout: 'centered'
    }
  });
</script>

<Story name="Default">
  <NodeDecorator
    data={createSampleNodeData({
      label: 'Sub Workflow',
      metadata: {
        id: 'sub-workflow',
        name: 'Sub Workflow',
        description: 'Execute a nested workflow',
        category: 'bundles',
        version: '1.0.0',
        type: 'workflow',
        icon: 'mdi:sitemap',
        inputs: [
          {
            id: 'input',
            name: 'Input',
            type: 'input',
            dataType: 'any',
            required: false
          }
        ],
        outputs: [{ id: 'output', name: 'Output', type: 'output', dataType: 'any' }]
      }
    })}
  />
</Story>

<Story name="Selected">
  <NodeDecorator
    data={createSampleNodeData({
      label: 'Data Pipeline',
      metadata: {
        id: 'data-pipeline',
        name: 'Data Pipeline',
        description: 'Process data through a pipeline workflow',
        category: 'bundles',
        version: '1.0.0',
        type: 'workflow',
        icon: 'mdi:pipe',
        inputs: [
          {
            id: 'data',
            name: 'Data',
            type: 'input',
            dataType: 'any',
            required: true
          },
          {
            id: 'config',
            name: 'Config',
            type: 'input',
            dataType: 'object',
            required: false
          }
        ],
        outputs: [{ id: 'result', name: 'Result', type: 'output', dataType: 'any' }]
      }
    })}
    selected={true}
  />
</Story>

<Story name="Dynamic Ports">
  <NodeDecorator
    data={createSampleNodeData({
      label: 'Custom Function',
      config: {
        dynamicInputs: [
          {
            name: 'input_1',
            label: 'First Input',
            description: 'The first input parameter',
            dataType: 'string',
            required: true
          },
          {
            name: 'input_2',
            label: 'Second Input',
            description: 'The second input parameter',
            dataType: 'number',
            required: false
          }
        ],
        dynamicOutputs: [
          {
            name: 'output_1',
            label: 'Primary Output',
            description: 'The main output value',
            dataType: 'string',
            required: false
          }
        ]
      },
      metadata: {
        id: 'custom-function',
        name: 'Custom Function',
        description: 'Execute a custom function with dynamic inputs and outputs',
        category: 'processing',
        version: '1.0.0',
        type: 'workflow',
        icon: 'mdi:function-variant',
        inputs: [
          {
            id: 'trigger',
            name: 'Trigger',
            type: 'input',
            dataType: 'trigger',
            required: false
          }
        ],
        outputs: [
          {
            id: 'done',
            name: 'Done',
            type: 'output',
            dataType: 'trigger',
            required: false
          }
        ]
      }
    })}
  />
</Story>

<!--
  Density is where the shape symbols earn their keep: on a two-port node any
  treatment reads fine, and the specimen sheet only separated the variants once
  a node carried ten. This story is the regression guard for that — there is no
  visual-regression harness in this repo, so eyeballing this story IS the
  coverage.

  It spans every shape in the vocabulary: S # B [] {} ? T (), including the
  reserved `error` output (red, `{}`), a `messages` port (teal lane, `[]`
  glyph — the two facts the treatment exists to separate) and a site-defined
  lane that honestly resolves to `?`.
-->
<Story name="Dense (every shape)">
  <NodeDecorator
    data={createSampleNodeData({
      label: 'Everything Node',
      metadata: {
        id: 'everything',
        name: 'Everything Node',
        description: 'One port per shape in the vocabulary',
        category: 'processing',
        version: '1.0.0',
        type: 'workflow',
        icon: 'mdi:shape-outline',
        inputs: [
          { id: 'prompt', name: 'Prompt', type: 'input', dataType: 'string', required: true },
          { id: 'temperature', name: 'Temperature', type: 'input', dataType: 'number' },
          { id: 'stream', name: 'Stream', type: 'input', dataType: 'boolean' },
          { id: 'tags', name: 'Tags', type: 'input', dataType: 'string[]' },
          { id: 'history', name: 'Chat History', type: 'input', dataType: 'messages' },
          { id: 'options', name: 'Options', type: 'input', dataType: 'json' },
          { id: 'payload', name: 'Payload', type: 'input', dataType: 'mixed' },
          { id: 'order', name: 'Order', type: 'input', dataType: 'order' },
          { id: 'attachment', name: 'Attachment', type: 'input', dataType: 'image' },
          { id: 'trigger', name: 'Trigger', type: 'input', dataType: 'trigger' },
          { id: 'tools', name: 'Tools', type: 'input', dataType: 'tool' }
        ],
        outputs: [
          { id: 'text', name: 'Text', type: 'output', dataType: 'string' },
          { id: 'count', name: 'Count', type: 'output', dataType: 'number' },
          { id: 'matched', name: 'Matched', type: 'output', dataType: 'boolean' },
          { id: 'items', name: 'Items', type: 'output', dataType: 'json[]' },
          { id: 'result', name: 'Result', type: 'output', dataType: 'json' },
          { id: 'done', name: 'Done', type: 'output', dataType: 'trigger' },
          { id: 'error', name: 'Error', type: 'output', dataType: 'json' }
        ]
      }
    })}
  />
</Story>
