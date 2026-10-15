<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import MessageBubble from './MessageBubble.svelte';
  import InstanceDecorator from '../../stories/InstanceDecorator.svelte';
  import SkinScope from '../../stories/SkinScope.svelte';
  import { hierarchy, msg, runTag } from '../../stories/playgroundFixtures.js';

  const { Story } = defineMeta({
    title: 'Editor/Playground/Message',
    component: MessageBubble,
    tags: ['autodocs'],
    parameters: { layout: 'padded' }
  });

  const user = () => msg('user', 'Can you check the order for me?');
  const reply = () =>
    msg(
      'assistant',
      'Order **4711** left the warehouse yesterday.\n\n- Carrier: DHL\n- Expected: Thursday\n\nAll checks passed.'
    );
  const notice = () => msg('system', 'Support chat started', { origin: 'engine' });
  const log = () =>
    msg('log', 'completed in 42ms', { metadata: { nodeLabel: 'Chat Model' }, hierarchy });
</script>

<Story
  name="In the editor"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'A question and its answer, as the Playground draws them. The skin decides the layout: Graphite (the editor default) writes the answer straight on the page, the other skins put it in a bubble. Use the Skin switch in the toolbar to compare.'
      }
    }
  }}
>
  <InstanceDecorator width="440px">
    <MessageBubble message={user()} />
    <MessageBubble message={reply()} isLast />
  </InstanceDecorator>
</Story>

<Story
  name="Both layouts"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'The two layouts next to each other, whatever skin is picked: the document layout of Graphite on the left, chat bubbles on the right.'
      }
    }
  }}
>
  <InstanceDecorator>
    <div style="display: flex; gap: var(--fd-space-4xl); align-items: flex-start">
      {#each ['document', 'bubbles'] as const as layout (layout)}
        <SkinScope {layout} width="400px">
          <MessageBubble message={user()} />
          <MessageBubble message={reply()} isLast />
        </SkinScope>
      {/each}
    </div>
  </InstanceDecorator>
</Story>

<Story
  name="Your message"
  asChild
  parameters={{
    docs: { description: { story: 'What the person typed.' } }
  }}
>
  <InstanceDecorator width="440px">
    <MessageBubble message={user()} />
  </InstanceDecorator>
</Story>

<Story
  name="Reply"
  asChild
  parameters={{
    docs: {
      description: {
        story: 'An answer from the workflow. Markdown (lists, bold, code) is drawn.'
      }
    }
  }}
>
  <InstanceDecorator width="440px">
    <MessageBubble message={reply()} isLast />
  </InstanceDecorator>
</Story>

<Story
  name="System notice"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'A line from the engine, such as a run starting. It is small and centred, not a bubble.'
      }
    }
  }}
>
  <InstanceDecorator width="440px">
    <MessageBubble message={notice()} />
  </InstanceDecorator>
</Story>

<Story
  name="Step log"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          "One finished node. In the conversation, a turn's steps fold into one row; this is the single row on its own."
      }
    }
  }}
>
  <InstanceDecorator width="440px">
    <MessageBubble message={log()} />
  </InstanceDecorator>
</Story>

<Story
  name="With tags"
  asChild
  parameters={{
    docs: {
      description: {
        story: 'The server can attach chips to a message, such as the run it came from.'
      }
    }
  }}
>
  <InstanceDecorator width="440px">
    <MessageBubble
      message={msg('assistant', 'Iteration complete.', {
        tags: [runTag, { id: 'iter', label: 'iter 1/5', color: 'muted', variant: 'subtle' }]
      })}
      isLast
    />
  </InstanceDecorator>
</Story>

<Story
  name="With a path"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'A message from a sub-workflow shows the path it ran along, as a trail under the text.'
      }
    }
  }}
>
  <InstanceDecorator width="440px">
    <MessageBubble
      message={msg('assistant', 'Found the order in the warehouse system.', { hierarchy })}
      isLast
    />
  </InstanceDecorator>
</Story>

<Story
  name="Card"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'The server asked for a card (display: card), usually for a failure that needs more room to read.'
      }
    }
  }}
>
  <InstanceDecorator width="440px">
    <MessageBubble
      message={msg(
        'log',
        'Greeter aborted because Cherry never reached the queue. The loader timed out after two retries. Check `retries` and `backoffMs` on the JSON Loader.',
        {
          display: 'card',
          hierarchy,
          tags: [
            { id: 'iter', label: 'iter 3/5', color: 'muted', variant: 'subtle' },
            { id: 'status', label: 'aborted', color: 'warning', variant: 'solid' }
          ]
        }
      )}
      isLast
    />
  </InstanceDecorator>
</Story>

<Story
  name="Log shown as a reply"
  asChild
  parameters={{
    docs: {
      description: {
        story: 'The server set display: bubble on a log row, so it is drawn as a reply.'
      }
    }
  }}
>
  <InstanceDecorator width="440px">
    <MessageBubble
      message={msg('log', 'This log row is drawn as a reply because the server asked for it.', {
        display: 'bubble'
      })}
      isLast
    />
  </InstanceDecorator>
</Story>
