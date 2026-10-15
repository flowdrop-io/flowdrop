<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';
  import DockedPlayground from './DockedPlayground.svelte';
  import InstanceDecorator from '../../stories/InstanceDecorator.svelte';
  import { chatWorkflow } from '../../stories/fixtures.js';
  import {
    conversation,
    fakePlaygroundBackend,
    seedPlayground,
    seedRuns,
    sessions
  } from '../../stories/playgroundFixtures.js';

  const { Story } = defineMeta({
    title: 'Editor/Playground/Test panel',
    component: DockedPlayground,
    tags: ['autodocs'],
    parameters: { layout: 'centered' }
  });

  const frame =
    'width: 440px; height: 620px; display: flex; flex-direction: column; border: 1px solid var(--fd-border);';
</script>

<Story
  name="In the editor"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'Test mode docks this panel beside the canvas: the header, the conversation and the composer. The conversation here is seeded; there is no server, so sending does nothing.'
      }
    }
  }}
>
  <InstanceDecorator
    width="440px"
    setup={(fd) => {
      seedPlayground(fd, { messages: conversation(), withSessions: true });
      seedRuns(fd);
      fakePlaygroundBackend(fd, sessions());
    }}
  >
    <div style={frame}>
      <DockedPlayground workflow={chatWorkflow} onOpenSettings={fn()} />
    </div>
  </InstanceDecorator>
</Story>

<Story
  name="Before the first run"
  asChild
  parameters={{
    docs: {
      description: {
        story: 'A fresh Test mode. The first message creates the conversation.'
      }
    }
  }}
>
  <InstanceDecorator
    width="440px"
    setup={(fd) => {
      seedPlayground(fd, { noSession: true });
      fakePlaygroundBackend(fd, []);
    }}
  >
    <div style={frame}>
      <DockedPlayground workflow={chatWorkflow} />
    </div>
  </InstanceDecorator>
</Story>
