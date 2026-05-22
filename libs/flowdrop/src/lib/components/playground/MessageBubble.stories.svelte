<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import MessageBubble from './MessageBubble.svelte';

  const { Story } = defineMeta({
    title: 'Playground/MessageBubble',
    component: MessageBubble,
    tags: ['autodocs'],
    parameters: {
      layout: 'padded'
    }
  });
</script>

<Story
  name="User Message"
  args={{
    message: {
      id: 'msg-1',
      role: 'user',
      content: 'Can you process this workflow for me?',
      timestamp: new Date().toISOString()
    }
  }}
/>

<Story
  name="Assistant Message"
  args={{
    message: {
      id: 'msg-2',
      role: 'assistant',
      content:
        "I've processed the workflow successfully. Here are the results:\n\n- **Step 1**: Data validated\n- **Step 2**: Transformation applied\n- **Step 3**: Output generated\n\nAll checks passed.",
      timestamp: new Date().toISOString()
    }
  }}
/>

<Story
  name="System Message"
  args={{
    message: {
      id: 'msg-3',
      role: 'system',
      content: 'Workflow execution started',
      timestamp: new Date().toISOString()
    }
  }}
/>

<Story
  name="Log Message"
  args={{
    message: {
      id: 'msg-4',
      role: 'log',
      content: '[INFO] Processing node: data-transform-1',
      timestamp: new Date().toISOString()
    }
  }}
/>

<Story
  name="With Run Chip"
  args={{
    message: {
      id: 'msg-5',
      role: 'assistant',
      content: 'Workflow finished successfully.',
      timestamp: new Date().toISOString(),
      executionId: 'exec-3'
    },
    attribution: {
      runId: 'exec-3',
      runLabel: 'Run #3',
      runNumber: 3,
      workflowId: undefined,
      workflowLabel: undefined
    }
  }}
/>

<Story
  name="With Run + Workflow Chips"
  args={{
    message: {
      id: 'msg-6',
      role: 'assistant',
      content: 'Iteration complete.',
      timestamp: new Date().toISOString(),
      executionId: 'exec-3'
    },
    attribution: {
      runId: 'exec-3',
      runLabel: 'Run #3',
      runNumber: 3,
      workflowId: 'demo-foreach-loop',
      workflowLabel: 'demo-foreach-loop'
    }
  }}
/>

<Story
  name="Sub-workflow Attribution (log)"
  args={{
    message: {
      id: 'msg-7',
      role: 'log',
      content: 'greeter said hi',
      timestamp: new Date().toISOString(),
      executionId: 'exec-3',
      workflowId: 'greeter-flow',
      nodeId: 'node-greet',
      metadata: { nodeLabel: 'greeter' }
    },
    attribution: {
      runId: 'exec-3',
      runLabel: 'Run #3',
      runNumber: 3,
      workflowId: 'greeter-flow',
      workflowLabel: 'greeter-flow'
    }
  }}
/>

<Story
  name="Sub-workflow Attribution (system)"
  args={{
    message: {
      id: 'msg-8',
      role: 'system',
      content: 'Sub-workflow finished',
      timestamp: new Date().toISOString(),
      executionId: 'exec-3',
      workflowId: 'greeter-flow'
    },
    attribution: {
      runId: 'exec-3',
      runLabel: 'Run #3',
      runNumber: 3,
      workflowId: 'greeter-flow',
      workflowLabel: 'greeter-flow'
    }
  }}
/>
