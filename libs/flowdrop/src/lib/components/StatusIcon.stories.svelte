<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import StatusIcon from './StatusIcon.svelte';
  import type { NodeExecutionStatus } from '../types/index.js';

  const { Story } = defineMeta({
    title: 'Components/StatusIcon',
    component: StatusIcon,
    tags: ['autodocs'],
    argTypes: {
      status: {
        control: { type: 'select' },
        options: [
          'idle',
          'pending',
          'running',
          'completed',
          'failed',
          'cancelled',
          'skipped',
          'paused',
          'interrupted'
        ]
      },
      size: { control: { type: 'select' }, options: ['sm', 'md', 'lg', 'xl'] },
      // The global colour matcher also catches names ending in "background".
      showBackground: { control: 'boolean' }
    },
    args: { status: 'completed', size: 'md', showBackground: false }
  });

  const statuses: NodeExecutionStatus[] = [
    'idle',
    'pending',
    'running',
    'completed',
    'failed',
    'cancelled',
    'skipped',
    'paused',
    'interrupted'
  ];
</script>

<Story name="Default" args={{ status: 'completed' }} />

<Story name="On a tinted square" args={{ status: 'failed', showBackground: true, size: 'lg' }} />

<Story
  name="Paused and interrupted"
  parameters={{
    docs: {
      description: {
        story:
          '`paused` is a run that was stopped on purpose. `interrupted` is a run that waits for the user.'
      }
    }
  }}
  asChild
>
  <div style="display: flex; gap: 1rem; align-items: center;">
    <StatusIcon status="paused" showBackground size="lg" />
    <StatusIcon status="interrupted" showBackground size="lg" />
  </div>
</Story>

<Story name="All variants" asChild>
  <div
    style="display: grid; grid-template-columns: auto auto auto; gap: 0.75rem 1.5rem; align-items: center;"
  >
    <span></span><span>Icon only</span><span>On a square</span>
    {#each statuses as status (status)}
      <code style="font-size: var(--fd-text-xs);">{status}</code>
      <StatusIcon {status} />
      <StatusIcon {status} showBackground />
    {/each}
  </div>
</Story>
