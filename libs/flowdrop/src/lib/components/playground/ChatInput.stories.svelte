<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';
  import ChatInput from './ChatInput.svelte';
  import InstanceDecorator from '../../stories/InstanceDecorator.svelte';
  import { seedPlayground } from '../../stories/playgroundFixtures.js';

  const { Story } = defineMeta({
    title: 'Editor/Playground/Chat input',
    component: ChatInput,
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
    args: {
      onSendMessage: fn(),
      onStopExecution: fn(),
      onRunWorkflow: fn(),
      sessionOptional: true,
      enableCommands: true,
      awaitEnableRun: false
    }
  });

  const frame = 'width: 440px; background: var(--fd-background); padding: var(--fd-space-md);';
</script>

<Story
  name="In the editor"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'The composer at the bottom of the Test mode panel. Type a message and press Enter to send. Start a line with / to see the commands.'
      }
    }
  }}
>
  <InstanceDecorator setup={(fd) => seedPlayground(fd, { messages: [] })}>
    <div style={frame}>
      <ChatInput
        sessionOptional
        enableCommands
        awaitEnableRun={false}
        onSendMessage={fn()}
        onStopExecution={fn()}
        onRunWorkflow={fn()}
      />
    </div>
  </InstanceDecorator>
</Story>

<Story
  name="Unsaved changes"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'The workflow has edits that are not saved. The button reads "Save & send": the host saves first, then the message goes out.'
      }
    }
  }}
>
  <InstanceDecorator setup={(fd) => seedPlayground(fd, { messages: [] })}>
    <div style={frame}>
      <ChatInput
        sessionOptional
        awaitEnableRun={false}
        saveFirst
        beforeSend={async () => true}
        onSendMessage={fn()}
        onStopExecution={fn()}
      />
    </div>
  </InstanceDecorator>
</Story>

<Story
  name="Run only"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'A workflow with no chat has nothing to type. The panel shows a Run button instead of the composer.'
      }
    }
  }}
>
  <InstanceDecorator setup={(fd) => seedPlayground(fd, { messages: [] })}>
    <div style={frame}>
      <ChatInput
        showTextarea={false}
        sessionOptional
        awaitEnableRun={false}
        onRunWorkflow={fn()}
        onStopExecution={fn()}
      />
    </div>
  </InstanceDecorator>
</Story>

<Story
  name="While it runs"
  asChild
  parameters={{
    docs: {
      description: {
        story: 'A run is in progress. The field is locked and the button becomes Stop.'
      }
    }
  }}
>
  <InstanceDecorator setup={(fd) => seedPlayground(fd, { messages: [], status: 'running' })}>
    <div style={frame}>
      <ChatInput
        sessionOptional
        awaitEnableRun={false}
        onSendMessage={fn()}
        onStopExecution={fn()}
      />
    </div>
  </InstanceDecorator>
</Story>
