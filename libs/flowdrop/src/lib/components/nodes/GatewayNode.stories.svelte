<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import NodeDecorator from '../../stories/NodeDecorator.svelte';
  import { createSampleNodeData } from '../../stories/utils.js';
  import type { Branch, NodePort } from '../../types/index.js';
  // The component is imported last: a node component imported first would load the instance
  // container before its own module has finished, and fail on the import cycle.
  import GatewayNode from './GatewayNode.svelte';

  const { Story } = defineMeta({
    title: 'Editor/Nodes/Gateway node',
    component: GatewayNode,
    tags: ['autodocs'],
    parameters: { layout: 'centered' }
  });

  const input = (id: string, name: string, dataType: string, required = false) =>
    ({ id, name, type: 'input', dataType, required }) as NodePort;

  const ifElseBranches: Branch[] = [
    { name: 'true', label: 'True', value: 'true' },
    { name: 'false', label: 'False', value: 'false' }
  ];

  /** If/else: two branches. */
  const ifElse = () =>
    createSampleNodeData({
      label: 'Is it urgent?',
      config: { operator: 'equals', matchText: 'urgent', branches: ifElseBranches },
      metadata: {
        node_type_id: 'if_else',
        name: 'If / else',
        description: 'Sends the run down one of two branches.',
        category: 'logic',
        type: 'gateway',
        icon: 'mdi:source-branch',
        inputs: [input('trigger', 'Trigger', 'trigger'), input('data', 'Value', 'string', true)],
        outputs: []
      }
    });

  const switchBranches: Branch[] = [
    { name: 'case_1', label: 'Billing', value: 'billing' },
    { name: 'case_2', label: 'Support', value: 'support' },
    { name: 'case_3', label: 'Sales', value: 'sales' },
    { name: 'default', label: 'Everything else', isDefault: true }
  ];

  const switchNode = () =>
    createSampleNodeData({
      label: 'Route by topic',
      config: { branches: switchBranches },
      metadata: {
        node_type_id: 'switch',
        name: 'Switch',
        description: 'Sends the run down the branch whose value matches.',
        category: 'logic',
        type: 'gateway',
        icon: 'mdi:source-branch-sync',
        inputs: [input('trigger', 'Trigger', 'trigger'), input('value', 'Value', 'string', true)],
        outputs: []
      }
    });
</script>

<Story
  asChild
  name="If / else"
  parameters={{
    docs: {
      description: {
        story:
          'A gateway with two branches. Each branch is an output row; wire it to what runs next.'
      }
    }
  }}
>
  <NodeDecorator data={ifElse()} />
</Story>

<Story
  asChild
  name="Selected"
  parameters={{
    docs: { description: { story: 'A gateway you clicked. The border and the config gear show.' } }
  }}
>
  <NodeDecorator data={ifElse()} selected />
</Story>

<Story
  asChild
  name="Switch with many branches"
  parameters={{
    docs: {
      description: {
        story: 'A switch has as many branches as the user adds. The card grows by one row each.'
      }
    }
  }}
>
  <NodeDecorator data={switchNode()} height={460} />
</Story>

<Story
  asChild
  name="Branch taken in a run"
  parameters={{
    docs: {
      description: {
        story:
          'In Test mode, after a run, the branch the run took is marked in the success colour. The other branch is not.'
      }
    }
  }}
>
  <NodeDecorator
    data={ifElse()}
    testMode
    statuses={{
      'story-node': { status: 'completed', output: { active_branches: ['true'] } }
    }}
  />
</Story>

<Story
  asChild
  name="No branches yet"
  parameters={{
    docs: {
      description: {
        story: 'A new gateway before the user adds a branch. The card says so on its first row.'
      }
    }
  }}
>
  <NodeDecorator
    data={{
      ...ifElse(),
      config: { branches: [] },
      metadata: { ...ifElse().metadata, inputs: [input('trigger', 'Trigger', 'trigger')] }
    }}
  />
</Story>
