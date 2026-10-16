<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn, userEvent, within } from 'storybook/test';
  import CanvasToolbar from './CanvasToolbar.svelte';
  import CanvasDecorator from '../stories/CanvasDecorator.svelte';
  import InstanceDecorator from '../stories/InstanceDecorator.svelte';
  import { chatWorkflow, runsResponse } from '../stories/fixtures.js';

  const { Story } = defineMeta({
    title: 'Editor/Canvas/Canvas toolbar',
    component: CanvasToolbar,
    tags: ['autodocs'],
    parameters: { layout: 'centered' }
  });

  const adminLinks = {
    runs: 'https://admin.example.com/flowdrop/{workflowId}/runs',
    run: 'https://admin.example.com/flowdrop/{workflowId}/runs/{pipelineId}'
  };
</script>

<script lang="ts">
  import type { EditorMode } from '../stores/editorModeStore.svelte.js';

  let mode = $state<EditorMode>('edit');
  const onModeChange = fn();
  const onOpenTest = fn();
  const onAskAssistant = fn();
</script>

<Story
  name="In the editor"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'The editor at rest: only the Edit | Test switch. The Runs list and the run pill appear when the host asks for them or a run exists (see the next stories).'
      }
    }
  }}
>
  <InstanceDecorator workflow={chatWorkflow}>
    <CanvasDecorator>
      <CanvasToolbar
        editorMode={mode}
        onEditorModeChange={(next) => {
          mode = next;
          onModeChange(next);
        }}
      />
    </CanvasDecorator>
  </InstanceDecorator>
</Story>

<Story
  name="Run in progress"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'A run was started from the editor. The pill shows its state and a Stop button while it is live.'
      }
    }
  }}
>
  <InstanceDecorator workflow={chatWorkflow} run={{ runId: '142', status: 'running' }}>
    <CanvasDecorator>
      <CanvasToolbar editorMode="edit" onEditorModeChange={onModeChange} {onOpenTest} />
    </CanvasDecorator>
  </InstanceDecorator>
</Story>

<Story
  name="Waiting for you"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'The run paused to ask a person something. Open takes them to the waiting run in Test mode.'
      }
    }
  }}
>
  <InstanceDecorator workflow={chatWorkflow} run={{ runId: '142', status: 'paused' }}>
    <CanvasDecorator>
      <CanvasToolbar editorMode="edit" onEditorModeChange={onModeChange} {onOpenTest} />
    </CanvasDecorator>
  </InstanceDecorator>
</Story>

<Story
  name="Test mode with Runs"
  asChild
  play={async ({ canvasElement }) => {
    await userEvent.click(await within(canvasElement).findByTestId('runs-trigger'));
  }}
  parameters={{
    docs: {
      description: {
        story:
          "Test mode shows the Runs list, which holds the workflow's past runs. The list comes from a fake endpoint in this story; click Runs to open it."
      }
    }
  }}
>
  <InstanceDecorator workflow={chatWorkflow} editorMode="test" runs={runsResponse()}>
    <CanvasDecorator>
      <CanvasToolbar
        editorMode="test"
        onEditorModeChange={onModeChange}
        showRuns
        {adminLinks}
        {onAskAssistant}
      />
    </CanvasDecorator>
  </InstanceDecorator>
</Story>
