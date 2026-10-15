<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { userEvent, within } from 'storybook/test';
  import RunsMenu from './RunsMenu.svelte';
  import Toolbar from './primitives/Toolbar.svelte';
  import InstanceDecorator from '../stories/InstanceDecorator.svelte';
  import { chatWorkflow, runsResponse } from '../stories/fixtures.js';

  const { Story } = defineMeta({
    title: 'Editor/Runs/Runs list',
    component: RunsMenu,
    tags: ['autodocs'],
    parameters: { layout: 'centered' }
  });

  const adminLinks = {
    runs: 'https://admin.example.com/flowdrop/{workflowId}/runs',
    run: 'https://admin.example.com/flowdrop/{workflowId}/runs/{pipelineId}'
  };

  const open = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    await userEvent.click(await within(canvasElement).findByTestId('runs-trigger'));
  };
</script>

<Story
  name="In the editor"
  asChild
  play={open}
  parameters={{
    docs: {
      description: {
        story:
          "Test mode shows a Runs control in the canvas toolbar. It opens the workflow's past runs, newest first. Click a row to see that run on the canvas. The list comes from a fake endpoint in this story."
      }
    }
  }}
>
  <InstanceDecorator workflow={chatWorkflow} editorMode="test" runs={runsResponse()}>
    <div style="min-height: 420px; min-width: 460px">
      <Toolbar ariaLabel="Canvas controls">
        <RunsMenu {adminLinks} />
      </Toolbar>
    </div>
  </InstanceDecorator>
</Story>

<Story
  name="Closed"
  asChild
  parameters={{
    docs: { description: { story: 'The control before it is opened.' } }
  }}
>
  <InstanceDecorator workflow={chatWorkflow} editorMode="test" runs={runsResponse()}>
    <Toolbar ariaLabel="Canvas controls">
      <RunsMenu {adminLinks} />
    </Toolbar>
  </InstanceDecorator>
</Story>

<Story
  name="No runs yet"
  asChild
  play={open}
  parameters={{
    docs: {
      description: {
        story: 'A workflow that has never run. The list says so and tells how to start one.'
      }
    }
  }}
>
  <InstanceDecorator
    workflow={chatWorkflow}
    editorMode="test"
    runs={{ success: true, data: { pipelines: [] } }}
  >
    <div style="min-height: 240px; min-width: 460px">
      <Toolbar ariaLabel="Canvas controls">
        <RunsMenu {adminLinks} />
      </Toolbar>
    </div>
  </InstanceDecorator>
</Story>

<Story
  name="Showing a past run"
  asChild
  play={async ({ canvasElement }) => {
    await open({ canvasElement });
    const rows = await within(canvasElement).findAllByTestId('run-row');
    await userEvent.click(rows[2]);
  }}
  parameters={{
    docs: {
      description: {
        story:
          'After a row is clicked, the control says which run the canvas shows. The cross clears it.'
      }
    }
  }}
>
  <InstanceDecorator workflow={chatWorkflow} editorMode="test" runs={runsResponse()}>
    <div style="min-height: 120px; min-width: 460px">
      <Toolbar ariaLabel="Canvas controls">
        <RunsMenu {adminLinks} />
      </Toolbar>
    </div>
  </InstanceDecorator>
</Story>
