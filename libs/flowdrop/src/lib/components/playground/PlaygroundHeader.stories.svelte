<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { userEvent, within } from 'storybook/test';
  import PlaygroundHeader from './PlaygroundHeader.svelte';
  import InstanceDecorator from '../../stories/InstanceDecorator.svelte';
  import { conversation, seedPlayground, seedRuns } from '../../stories/playgroundFixtures.js';

  const { Story } = defineMeta({
    title: 'Editor/Playground/Header',
    component: PlaygroundHeader,
    tags: ['autodocs'],
    parameters: { layout: 'centered' }
  });

  const frame = 'width: 440px; min-height: 380px; background: var(--fd-background);';

  const setup = (fd: Parameters<typeof seedPlayground>[0]) => {
    seedPlayground(fd, { messages: conversation(), withSessions: true });
    seedRuns(fd);
  };
</script>

<Story
  name="In the editor"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'The header of the docked Playground in Test mode: a chip with the open conversation, a plus for a new one and a menu.'
      }
    }
  }}
>
  <InstanceDecorator {setup}>
    <div style={frame}>
      <PlaygroundHeader />
    </div>
  </InstanceDecorator>
</Story>

<Story
  name="History open"
  asChild
  play={async ({ canvasElement }) => {
    await userEvent.click(await within(canvasElement).findByTestId('playground-history'));
  }}
  parameters={{
    docs: {
      description: {
        story:
          'Click the chip to see the conversations and, under them, the runs of the open one. Picking a run shows it and the canvas follows.'
      }
    }
  }}
>
  <InstanceDecorator {setup}>
    <div style={frame}>
      <PlaygroundHeader />
    </div>
  </InstanceDecorator>
</Story>

<Story
  name="No conversation yet"
  asChild
  parameters={{
    docs: {
      description: {
        story: 'Before the first run. The chip says so; the first run creates the conversation.'
      }
    }
  }}
>
  <InstanceDecorator setup={(fd) => seedPlayground(fd, { noSession: true })}>
    <div style={frame}>
      <PlaygroundHeader />
    </div>
  </InstanceDecorator>
</Story>
