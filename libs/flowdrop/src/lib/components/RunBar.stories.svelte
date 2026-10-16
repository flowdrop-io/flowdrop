<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';
  import RunBar from './RunBar.svelte';
  import Toolbar from './primitives/Toolbar.svelte';
  import InstanceDecorator from '../stories/InstanceDecorator.svelte';
  import { chatWorkflow } from '../stories/fixtures.js';

  const { Story } = defineMeta({
    title: 'Editor/Runs/Run pill',
    component: RunBar,
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
    args: { onOpen: fn(), onAskAssistant: fn() }
  });

  // A finished run fades out after `fadeMs`; these stories keep it on screen.
  const stay = 3_600_000;

  const states = [
    { id: '1', status: 'running', label: 'Running' },
    { id: '2', status: 'paused', label: 'Waiting for a person' },
    { id: '3', status: 'completed', label: 'Done' },
    { id: '4', status: 'failed', label: 'Failed' },
    { id: '5', status: 'cancelled', label: 'Stopped' }
  ];
</script>

<Story
  name="In the editor"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'A run started from the editor is live. The pill shows where it stands and a Stop button.'
      }
    }
  }}
>
  <InstanceDecorator workflow={chatWorkflow} run={{ runId: '142', status: 'running' }}>
    <Toolbar ariaLabel="Canvas controls">
      <RunBar fadeMs={stay} />
    </Toolbar>
  </InstanceDecorator>
</Story>

<Story
  name="Waiting for you"
  asChild
  parameters={{
    docs: {
      description: {
        story: 'The run paused to ask a person something. Open takes them to the run in Test mode.'
      }
    }
  }}
>
  <InstanceDecorator workflow={chatWorkflow} run={{ runId: '142', status: 'paused' }}>
    <Toolbar ariaLabel="Canvas controls">
      <RunBar fadeMs={stay} onOpen={() => {}} />
    </Toolbar>
  </InstanceDecorator>
</Story>

<Story
  name="Failed"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'The run failed. If the host connects an Assistant, "Ask the Assistant" sends the failed run to it. In the editor the pill fades a few seconds after the run ends; here it stays.'
      }
    }
  }}
>
  <InstanceDecorator workflow={chatWorkflow} run={{ runId: '140', status: 'failed' }}>
    <Toolbar ariaLabel="Canvas controls">
      <RunBar fadeMs={stay} onAskAssistant={() => {}} />
    </Toolbar>
  </InstanceDecorator>
</Story>

<Story
  name="Done"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'The run finished well. In the editor the pill fades after about four seconds and the badges on the nodes go with it; here it stays.'
      }
    }
  }}
>
  <InstanceDecorator workflow={chatWorkflow} run={{ runId: '141', status: 'completed' }}>
    <Toolbar ariaLabel="Canvas controls">
      <RunBar fadeMs={stay} />
    </Toolbar>
  </InstanceDecorator>
</Story>

<Story
  name="In Test mode"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'In Test mode the pill shows only while the run is live, with no Open button (you are already there), and never dismisses the run.'
      }
    }
  }}
>
  <InstanceDecorator workflow={chatWorkflow} run={{ runId: '142', status: 'running' }}>
    <Toolbar ariaLabel="Canvas controls">
      <RunBar mode="test" />
    </Toolbar>
  </InstanceDecorator>
</Story>

<Story name="All states" asChild>
  <div style="display: grid; gap: var(--fd-space-md); justify-items: start">
    {#each states as state (state.id)}
      <div style="display: flex; align-items: center; gap: var(--fd-space-lg)">
        <span style="width: 11rem; font-size: var(--fd-text-sm); color: var(--fd-muted-foreground)">
          {state.label}
        </span>
        <InstanceDecorator
          workflow={chatWorkflow}
          run={{ runId: state.id, status: state.status }}
          width="auto"
        >
          <Toolbar ariaLabel="Canvas controls">
            <RunBar fadeMs={stay} onOpen={() => {}} onAskAssistant={() => {}} />
          </Toolbar>
        </InstanceDecorator>
      </div>
    {/each}
  </div>
</Story>
