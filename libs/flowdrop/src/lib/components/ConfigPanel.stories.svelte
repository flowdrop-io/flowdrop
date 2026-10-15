<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';
  import ConfigPanel from './ConfigPanel.svelte';
  import InstanceDecorator from '../stories/InstanceDecorator.svelte';
  import NodeInspectorBody from '../stories/NodeInspectorBody.svelte';
  import { agentNode, agentWorkflow, registerEditors } from '../stories/formFixtures.js';

  const { Story } = defineMeta({
    title: 'Editor/Forms/Config panel',
    component: ConfigPanel,
    tags: ['autodocs'],
    parameters: { layout: 'padded' }
  });

  const details = [
    { label: 'Type', value: 'default' },
    { label: 'Category', value: 'Models' }
  ];
</script>

<script lang="ts">
  const onClose = fn();
  const onSwap = fn();
</script>

<Story
  name="In the editor"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'A node is open. The panel holds its inspector. Swap changes the node to another type, and the arrows in the header pop the panel out into a wide window.'
      }
    }
  }}
>
  <InstanceDecorator workflow={agentWorkflow} setup={registerEditors} width="24rem">
    <ConfigPanel
      title={agentNode.data.label}
      id={agentNode.id}
      description={agentNode.data.metadata?.description}
      {details}
      {onClose}
      {onSwap}
    >
      <NodeInspectorBody node={agentNode} />
    </ConfigPanel>
  </InstanceDecorator>
</Story>

<Story
  name="Workflow settings"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          "The same panel hosts the workflow's own settings. It has a configuration title and no swap button."
      }
    }
  }}
>
  <div style="max-width: 24rem">
    <ConfigPanel
      title="Workflow settings"
      id="support-chat"
      configTitle="Settings"
      details={[
        { label: 'Nodes', value: '4' },
        { label: 'Connections', value: '3' }
      ]}
      {onClose}
    >
      <p style="margin: 0; font-size: var(--fd-text-sm); color: var(--fd-muted-foreground)">
        Workflow settings are drawn here.
      </p>
    </ConfigPanel>
  </div>
</Story>

<Story
  name="Locked open"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'Without `onClose` the panel has no close button. The editor does this in Test mode, where the inspector stays open.'
      }
    }
  }}
>
  <div style="max-width: 24rem">
    <ConfigPanel title="Chat Model" id="chat_model.1" expandable={false}>
      <p style="margin: 0; font-size: var(--fd-text-sm); color: var(--fd-muted-foreground)">
        No close button and no pop-out.
      </p>
    </ConfigPanel>
  </div>
</Story>
