<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import MessageStream from './MessageStream.svelte';
  import InstanceDecorator from '../../stories/InstanceDecorator.svelte';
  import { conversation, msg, seedPlayground } from '../../stories/playgroundFixtures.js';

  const { Story } = defineMeta({
    title: 'Editor/Playground/Message stream',
    component: MessageStream,
    tags: ['autodocs'],
    parameters: { layout: 'centered' }
  });

  const frame = 'width: 440px; height: 560px; display: flex; flex-direction: column;';

  const waiting = () => [
    msg('user', 'Send the reply to the customer.'),
    msg('log', 'completed in 4ms', { executionId: 'run-9', metadata: { nodeLabel: 'Chat Input' } }),
    msg('log', 'completed in 1.2s', {
      executionId: 'run-9',
      metadata: { nodeLabel: 'Chat Model' }
    }),
    msg('assistant', 'Send this reply to the customer?', {
      executionId: 'run-9',
      metadata: {
        type: 'interrupt_request',
        interrupt_id: 'int-stream-1',
        interrupt_type: 'confirmation',
        nodeLabel: 'Approve reply',
        allow_cancel: false
      }
    })
  ];
</script>

<Story
  name="In the editor"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'A finished conversation as Test mode shows it. Each turn folds its steps into one row (3 steps, 1.2 s). The answer follows in the layout of the active skin.'
      }
    }
  }}
>
  <InstanceDecorator setup={(fd) => seedPlayground(fd, { messages: conversation() })}>
    <div style={frame}>
      <MessageStream allowLogs />
    </div>
  </InstanceDecorator>
</Story>

<Story
  name="Steps open"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'With "Expand steps by default" on in the header menu, each turn lists its steps: node, status, count and time.'
      }
    }
  }}
>
  <InstanceDecorator
    setup={(fd) => {
      seedPlayground(fd, { messages: conversation() });
      fd.playground.setExpandSteps(true);
    }}
  >
    <div style={frame}>
      <MessageStream allowLogs />
    </div>
  </InstanceDecorator>
</Story>

<Story
  name="Waiting for you"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'A step paused to ask something. The question appears in the stream as a card, and the steps row says one step is waiting.'
      }
    }
  }}
>
  <InstanceDecorator
    setup={(fd) => seedPlayground(fd, { messages: waiting(), status: 'awaiting_input' })}
  >
    <div style={frame}>
      <MessageStream allowLogs />
    </div>
  </InstanceDecorator>
</Story>

<Story
  name="Chat only"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'A chat surface does not allow logs, so only the conversation shows and the steps are left out.'
      }
    }
  }}
>
  <InstanceDecorator setup={(fd) => seedPlayground(fd, { messages: conversation() })}>
    <div style={frame}>
      <MessageStream />
    </div>
  </InstanceDecorator>
</Story>

<Story
  name="New conversation"
  asChild
  parameters={{
    docs: {
      description: {
        story: 'A conversation is open and nothing has been said. The host supplies the text.'
      }
    }
  }}
>
  <InstanceDecorator setup={(fd) => seedPlayground(fd, { messages: [] })}>
    <div style={frame}>
      <MessageStream>
        {#snippet emptySession()}
          <p style="margin: auto; color: var(--fd-muted-foreground); font-size: var(--fd-text-sm)">
            Say something to start the run.
          </p>
        {/snippet}
      </MessageStream>
    </div>
  </InstanceDecorator>
</Story>

<Story
  name="No conversation"
  asChild
  parameters={{
    docs: {
      description: { story: 'No conversation is open yet. The host supplies a welcome.' }
    }
  }}
>
  <InstanceDecorator setup={(fd) => seedPlayground(fd, { noSession: true })}>
    <div style={frame}>
      <MessageStream>
        {#snippet welcome()}
          <p style="margin: auto; color: var(--fd-muted-foreground); font-size: var(--fd-text-sm)">
            Open a conversation to test this workflow.
          </p>
        {/snippet}
      </MessageStream>
    </div>
  </InstanceDecorator>
</Story>
