<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';
  import ConfigForm from './ConfigForm.svelte';
  import InstanceDecorator from '../stories/InstanceDecorator.svelte';
  import { agentNode, agentWorkflow, registerEditors } from '../stories/formFixtures.js';
  import type { ConfigSchema } from '../types/index.js';

  const { Story } = defineMeta({
    title: 'Editor/Forms/Node config form',
    component: ConfigForm,
    tags: ['autodocs'],
    parameters: { layout: 'padded' }
  });

  const standalone: ConfigSchema = {
    type: 'object',
    properties: {
      subject: { type: 'string', title: 'Subject', description: 'Shown in the email header.' },
      retries: { type: 'integer', title: 'Retries', minimum: 0, maximum: 5 },
      notify: { type: 'boolean', title: 'Send a notice', description: 'Tell the owner on failure.' }
    }
  };
</script>

<script lang="ts">
  const onChange = fn();
</script>

<Story
  name="In the editor"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          "The form for a Chat Model node: a choice, a slider, a template editor, a switch, checkboxes and a list, all from the node type's schema. The editor mounts it inside the inspector (see Node inspector)."
      }
    }
  }}
>
  <InstanceDecorator workflow={agentWorkflow} setup={registerEditors} width="26rem">
    <ConfigForm
      node={agentNode}
      commitMode="live"
      workflowId={agentWorkflow.id}
      workflowNodes={agentWorkflow.nodes}
      workflowEdges={agentWorkflow.edges}
      {onChange}
    />
  </InstanceDecorator>
</Story>

<Story
  name="From a schema"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'Without a node, the form draws a `schema` and `values` you pass in. There are no Ports and no inspector tabs.'
      }
    }
  }}
>
  <InstanceDecorator width="26rem">
    <ConfigForm
      schema={standalone}
      values={{ subject: 'Your order has shipped', retries: 2, notify: true }}
      {onChange}
    />
  </InstanceDecorator>
</Story>

<Story
  name="Node with no settings"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'A node type with no config schema still shows the settings every node has: its ports. A node with neither shows an empty message.'
      }
    }
  }}
>
  <InstanceDecorator workflow={agentWorkflow} width="26rem">
    <ConfigForm
      node={agentWorkflow.nodes[0]}
      workflowId={agentWorkflow.id}
      workflowNodes={agentWorkflow.nodes}
      workflowEdges={agentWorkflow.edges}
      {onChange}
    />
  </InstanceDecorator>
</Story>
