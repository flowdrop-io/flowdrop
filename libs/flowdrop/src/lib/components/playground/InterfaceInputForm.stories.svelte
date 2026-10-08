<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import InterfaceInputForm from './InterfaceInputForm.svelte';
  import { fn } from 'storybook/test';
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
    title: 'Patterns/Playground/InterfaceInputForm',
    component: InterfaceInputForm,
    tags: ['autodocs'],
    parameters: { layout: 'padded' },
    args: { entries, values: {}, onChange: fn(), onRun: fn(), onStop: fn() }
  });
</script>

<script lang="ts">
  let values = $state<Record<string, unknown>>({ topic: 'cats' });
</script>

<!-- The form-first panel: fields, a blue Run (⌘↵), the refusal under it. -->
<Story name="Form first" asChild>
  <div style="max-width:560px">
    <InterfaceInputForm
      {entries}
      {values}
      onChange={(next) => (values = next)}
      onRun={() => {}}
      onStop={() => {}}
    />
  </div>
</Story>

<Story name="Refused Run" args={{ error: 'Fill in the required inputs: Topic' }} />

<Story name="Running" args={{ running: true }} />

<!-- Chat + form: the card the folded Inputs row opens. No Run of its own. -->
<Story name="Without Run" args={{ onRun: undefined }} />

<Story name="JSON view" args={{ json: true, values: { topic: 'cats' } }} />
