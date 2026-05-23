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

  const baseHierarchy = [
    { id: 'demo-foreach-loop', label: 'ForEach Loop', icon: 'mdi:graph' },
    { id: 'greeter-flow', label: 'Greeter', icon: 'mdi:hand-wave' }
  ];

  const sampleTags = [
    { id: 'run', label: 'Run #3', icon: 'mdi:play-circle', color: 'info', variant: 'subtle' },
    { id: 'iteration', label: 'iter 1/5', color: 'muted', variant: 'subtle' }
  ];
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
  name="With Tags"
  args={{
    message: {
      id: 'msg-5',
      role: 'assistant',
      content: 'Iteration complete.',
      timestamp: new Date().toISOString(),
      tags: sampleTags
    }
  }}
/>

<Story
  name="Tag Colors (each variant)"
  args={{
    message: {
      id: 'msg-6',
      role: 'log',
      content: 'Showcasing semantic colors and visual variants',
      timestamp: new Date().toISOString(),
      tags: [
        { id: 't-1', label: 'subtle.muted', color: 'muted', variant: 'subtle' },
        { id: 't-2', label: 'subtle.success', color: 'success', variant: 'subtle' },
        { id: 't-3', label: 'subtle.warning', color: 'warning', variant: 'subtle' },
        { id: 't-4', label: 'subtle.error', color: 'error', variant: 'subtle' },
        { id: 't-5', label: 'outline.primary', color: 'primary', variant: 'outline' },
        { id: 't-6', label: 'solid.info', color: 'info', variant: 'solid' }
      ]
    }
  }}
/>

<Story
  name="With Hierarchy"
  args={{
    message: {
      id: 'msg-7',
      role: 'log',
      content: 'greeter said hi to Apple',
      timestamp: new Date().toISOString(),
      hierarchy: baseHierarchy,
      tags: [{ id: 'iter', label: 'iter 1/5', color: 'muted', variant: 'subtle' }]
    }
  }}
/>

<Story
  name="Card Display"
  args={{
    message: {
      id: 'msg-8',
      role: 'log',
      content:
        'Greeter aborted because Cherry never reached the queue. The upstream loader returned a timeout after retrying twice — check the JSON Loader configuration for `retries` and `backoffMs`.',
      timestamp: new Date().toISOString(),
      display: 'card',
      hierarchy: baseHierarchy,
      tags: [
        { id: 'iter', label: 'iter 3/5', color: 'muted', variant: 'subtle' },
        { id: 'status', label: 'aborted', color: 'warning', variant: 'solid' }
      ]
    }
  }}
/>

<Story
  name="Server-driven display override (log as bubble)"
  args={{
    message: {
      id: 'msg-9',
      role: 'log',
      content: 'This log message is rendered as a bubble because the server set display=bubble',
      timestamp: new Date().toISOString(),
      display: 'bubble'
    }
  }}
/>
