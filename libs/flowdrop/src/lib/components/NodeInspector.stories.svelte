<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import NodeInspector from './NodeInspector.svelte';
  import InstanceDecorator from '../stories/InstanceDecorator.svelte';
  import NodeInspectorBody from '../stories/NodeInspectorBody.svelte';
  import {
    agentNode,
    agentWorkflow,
    lastRunDone,
    lastRunFailed,
    registerEditors
  } from '../stories/formFixtures.js';

  const { Story } = defineMeta({
    title: 'Editor/Forms/Node inspector',
    component: NodeInspector,
    tags: ['autodocs'],
    parameters: { layout: 'padded' }
  });
</script>

<Story
  name="In the editor"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          "What the right-hand panel shows for an open node in Edit mode: Config, Ports and Execution tabs over the node's form. Click the tabs. The form stays mounted, so a half-typed edit survives."
      }
    }
  }}
>
  <InstanceDecorator workflow={agentWorkflow} setup={registerEditors} width="26rem">
    <NodeInspectorBody node={agentNode} />
  </InstanceDecorator>
</Story>

<Story
  name="Test mode: last run"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'In Test mode a Last run tab joins the others. It opens first and shows what this node did in the run on the canvas.'
      }
    }
  }}
>
  <InstanceDecorator
    workflow={agentWorkflow}
    setup={registerEditors}
    editorMode="test"
    width="26rem"
  >
    <NodeInspectorBody
      node={agentNode}
      editorMode="test"
      tab="lastRun"
      info={lastRunDone}
      runShown
    />
  </InstanceDecorator>
</Story>

<Story
  name="Test mode: failed node"
  asChild
  parameters={{
    docs: {
      description: {
        story: 'The Last run tab of a node that failed. It says why.'
      }
    }
  }}
>
  <InstanceDecorator
    workflow={agentWorkflow}
    setup={registerEditors}
    editorMode="test"
    width="26rem"
  >
    <NodeInspectorBody
      node={agentNode}
      editorMode="test"
      tab="lastRun"
      info={lastRunFailed}
      runShown
    />
  </InstanceDecorator>
</Story>

<Story
  name="Test mode: no run shown"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'Test mode before any run is on the canvas. The Last run tab explains there is nothing to show yet.'
      }
    }
  }}
>
  <InstanceDecorator
    workflow={agentWorkflow}
    setup={registerEditors}
    editorMode="test"
    width="26rem"
  >
    <NodeInspectorBody node={agentNode} editorMode="test" tab="lastRun" />
  </InstanceDecorator>
</Story>
