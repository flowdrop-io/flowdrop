<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';
  import InterfaceInputForm from './InterfaceInputForm.svelte';
  import InstanceDecorator from '../../stories/InstanceDecorator.svelte';
  import { seedPlayground } from '../../stories/playgroundFixtures.js';
  import type { WorkflowInterfaceEntry } from '../../types/index.js';

  const entries: WorkflowInterfaceEntry[] = [
    {
      id: 'topic',
      name: 'Topic',
      description: 'What the article is about.',
      dataType: 'string',
      required: true,
      bindings: []
    },
    {
      id: 'tags',
      name: 'Tags',
      dataType: 'array',
      examples: [['news', 'tech'], []],
      bindings: []
    },
    {
      id: 'tone',
      name: 'Tone',
      dataType: 'string',
      schema: { enum: ['neutral', 'playful'] },
      bindings: []
    },
    { id: 'draft', name: 'Draft only', dataType: 'boolean', bindings: [] }
  ];

  const { Story } = defineMeta({
    title: 'Editor/Playground/Inputs form',
    component: InterfaceInputForm,
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
    args: { entries, values: { topic: 'cats' }, onChange: fn(), onRun: fn(), onStop: fn() }
  });

  const frame = 'width: 440px; background: var(--fd-background); padding: var(--fd-space-md);';
</script>

<script lang="ts">
  let values = $state<Record<string, unknown>>({ topic: 'cats' });
</script>

<Story
  name="In the editor"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'A workflow with inputs and no chat. The fields are the panel, with a Run under them. Fill in the topic and press Run (or Cmd/Ctrl+Enter).'
      }
    }
  }}
>
  <InstanceDecorator setup={(fd) => seedPlayground(fd, { messages: [] })}>
    <div style={frame}>
      <InterfaceInputForm
        {entries}
        {values}
        onChange={(next) => (values = next)}
        onRun={fn()}
        onStop={fn()}
      />
    </div>
  </InstanceDecorator>
</Story>

<Story
  name="Run refused"
  asChild
  parameters={{
    docs: {
      description: {
        story: 'Run was pressed with a required input empty. The reason shows under the button.'
      }
    }
  }}
>
  <InstanceDecorator setup={(fd) => seedPlayground(fd, { messages: [] })}>
    <div style={frame}>
      <InterfaceInputForm
        {entries}
        values={{}}
        onChange={fn()}
        onRun={fn()}
        onStop={fn()}
        error="Fill in the required inputs: Topic"
      />
    </div>
  </InstanceDecorator>
</Story>

<Story
  name="Running"
  asChild
  parameters={{
    docs: {
      description: { story: 'A run is going. The fields are locked and Run reads Stop.' }
    }
  }}
>
  <InstanceDecorator setup={(fd) => seedPlayground(fd, { messages: [], status: 'running' })}>
    <div style={frame}>
      <InterfaceInputForm
        {entries}
        values={{ topic: 'cats' }}
        onChange={fn()}
        onRun={fn()}
        onStop={fn()}
        running
        disabled
      />
    </div>
  </InstanceDecorator>
</Story>

<Story
  name="Above a chat box"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'A workflow with a chat and inputs folds the inputs into a row above the composer. This is the card that row opens. It has no Run of its own; the composer sends.'
      }
    }
  }}
>
  <InstanceDecorator setup={(fd) => seedPlayground(fd, { messages: [] })}>
    <div style={frame}>
      <InterfaceInputForm {entries} values={{ topic: 'cats' }} onChange={fn()} />
    </div>
  </InstanceDecorator>
</Story>

<Story
  name="JSON view"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          "The ⋯ menu's JSON view swaps the fields for one JSON box, for pasting a whole input."
      }
    }
  }}
>
  <InstanceDecorator setup={(fd) => seedPlayground(fd, { messages: [] })}>
    <div style={frame}>
      <InterfaceInputForm
        {entries}
        values={{ topic: 'cats' }}
        onChange={fn()}
        onRun={fn()}
        onStop={fn()}
        json
      />
    </div>
  </InstanceDecorator>
</Story>
